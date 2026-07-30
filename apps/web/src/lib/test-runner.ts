import pLimit from "p-limit"
import type { ExpectedMessage, Step, UnitTest } from "@/types/test"
import type {
  MessageScore,
  StepResult,
  StepRunStatus,
  TestRunResult,
  TestRunStatus,
  VariableAssertionResult,
} from "@/types/run"
import { scoreStep } from "@/lib/similarity"
import { isVariableExpectation } from "@/lib/message-format"
import { evaluateAssertion } from "@/lib/variable-assert"
import {
  createBlipDebugClient,
  type BlipDebugClient,
} from "@/lib/blip-debug-client"
import type { PauseController } from "@/lib/pause-controller"

// After the expected number of messages has arrived, wait this long for the
// bot to send anything extra before declaring the step passed — an
// unprompted trailing message (e.g. "how are you") is treated as a failure.
const EXTRA_MESSAGE_GRACE_MS = 5000
// Context variables are read back concurrently once a step's messages have
// settled; cap the in-flight requests the same way applyVariables does.
const VARIABLE_READ_CONCURRENCY = 10

// Reads every distinct variable named by the step's "variable" expectations
// (once each, however many assertions reference it) and evaluates each
// assertion against what came back.
async function checkVariableExpectations(
  client: BlipDebugClient,
  expectations: ExpectedMessage[]
): Promise<VariableAssertionResult[]> {
  const assertions = expectations
    .flatMap((expectation) => expectation.variableAssertions ?? [])
    .filter((assertion) => assertion.name.trim())
  if (assertions.length === 0) return []

  const names = [...new Set(assertions.map((a) => a.name.trim()))]
  const limit = pLimit(VARIABLE_READ_CONCURRENCY)
  const values = new Map(
    await Promise.all(
      names.map((name) =>
        limit(
          async () => [name, await client.getContextVariable(name)] as const
        )
      )
    )
  )

  return assertions.map((assertion) => {
    const actual = values.get(assertion.name.trim()) ?? null
    return {
      name: assertion.name,
      condition: assertion.condition,
      value: assertion.value,
      actual,
      passed: evaluateAssertion(assertion, actual),
    }
  })
}

export interface RunTestParams {
  test: UnitTest
  tenant: string
  botIdentifier: string
  routerKey?: string
  defaultTimeoutMs: number
  defaultThreshold: number
  onStepUpdate?: (stepResult: StepResult) => void
  onStatusChange?: (status: TestRunStatus) => void
  signal?: AbortSignal
  pauseController?: PauseController
}

async function runStep(
  client: BlipDebugClient,
  step: Step,
  stepTimeoutMs: number,
  threshold: number,
  signal?: AbortSignal
): Promise<StepResult> {
  const received: string[] = []
  let hasExtraMessage = false
  const startedAt = new Date().toISOString()

  // Entries on the "Variable" tab assert on a context variable instead of a
  // bot reply, so they must stay out of the message-wait loop — counting them
  // would make the runner wait for a message that never arrives.
  const messageExpectations = step.expectedOutput.filter(
    (message) => !isVariableExpectation(message)
  )
  const variableExpectations = step.expectedOutput.filter(isVariableExpectation)
  const expectedCount = messageExpectations.length

  // Each expected message gets its own wait window, measured from when the
  // previous message arrived (or from when the input was sent, for the
  // first message) — not one deadline for the whole step.
  const resolveMessageTimeout = (index: number) =>
    messageExpectations[index]?.timeoutMs ?? stepTimeoutMs

  const collected = await new Promise<string[]>((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let graceTimer: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (settled) return
      settled = true
      unsubscribe()
      clearTimeout(timer)
      clearTimeout(graceTimer)
      signal?.removeEventListener("abort", onAbort)
      resolve([...received])
    }

    const unsubscribe = client.onMessage((text) => {
      received.push(text)
      clearTimeout(timer)
      clearTimeout(graceTimer)
      if (expectedCount === 0) {
        // A step that only asserts on variables declares no opinion about
        // what the bot says, so extra chatter must not fail it — just wait
        // for the bot to go quiet, then read the variables.
        graceTimer = setTimeout(finish, EXTRA_MESSAGE_GRACE_MS)
      } else if (received.length === expectedCount) {
        // Got everything expected — don't resolve yet. Wait a grace period
        // to make sure the bot doesn't keep talking beyond what was asked.
        graceTimer = setTimeout(finish, EXTRA_MESSAGE_GRACE_MS)
      } else if (received.length > expectedCount) {
        hasExtraMessage = true
        finish()
      } else {
        timer = setTimeout(finish, resolveMessageTimeout(received.length))
      }
    })

    const onAbort = () => finish()
    signal?.addEventListener("abort", onAbort)

    client.sendMessage(step.input.text)
    timer = setTimeout(finish, resolveMessageTimeout(0))
  })

  const {
    messages,
    passed: scoreMatched,
    averageScore,
  } = scoreStep(
    messageExpectations,
    collected.slice(0, expectedCount),
    threshold
  )
  // Only meaningful when the step actually expects messages — a variable-only
  // step doesn't consider anything the bot said "extra".
  const extraMessages: MessageScore[] =
    expectedCount === 0
      ? []
      : collected.slice(expectedCount).map((actual) => ({
          expected: "(no further message expected)",
          actual,
          score: 0,
          threshold,
        }))
  // Skip the reads entirely on a cancelled run — there's nothing to report.
  const variableResults = signal?.aborted
    ? []
    : await checkVariableExpectations(client, variableExpectations)
  const passed =
    scoreMatched &&
    !hasExtraMessage &&
    variableResults.every((result) => result.passed)
  const status: StepRunStatus = passed
    ? "passed"
    : collected.length < expectedCount
      ? "timeout"
      : "failed"

  return {
    stepId: step.id,
    status,
    messages: [...messages, ...extraMessages],
    variableResults,
    averageScore,
    startedAt,
    finishedAt: new Date().toISOString(),
  }
}

export async function runTest(params: RunTestParams): Promise<TestRunResult> {
  const client = createBlipDebugClient()

  const result: TestRunResult = {
    testId: params.test.id,
    status: "connecting",
    stepResults: [],
    startedAt: new Date().toISOString(),
  }
  params.onStatusChange?.(result.status)

  try {
    await client.connect({
      tenant: params.tenant,
      botIdentifier: params.botIdentifier,
      routerKey: params.routerKey,
    })
    if (params.test.variables) {
      await client.applyVariables(params.test.variables)
    }

    result.status = "running"
    params.onStatusChange?.(result.status)

    for (const step of params.test.steps) {
      if (params.signal?.aborted) {
        result.status = "cancelled"
        break
      }
      await params.pauseController?.waitIfPaused()
      if (params.signal?.aborted) {
        result.status = "cancelled"
        break
      }
      const threshold =
        step.similarityThreshold ??
        params.test.similarityThreshold ??
        params.defaultThreshold
      const stepTimeoutMs =
        step.timeoutMs ?? params.test.timeoutMs ?? params.defaultTimeoutMs
      params.onStepUpdate?.({
        stepId: step.id,
        status: "running",
        messages: [],
        averageScore: 0,
        startedAt: new Date().toISOString(),
        finishedAt: "",
      })
      const stepResult = await runStep(
        client,
        step,
        stepTimeoutMs,
        threshold,
        params.signal
      )
      result.stepResults.push(stepResult)
      params.onStepUpdate?.(stepResult)
      // Continue through every step even after a failure/timeout, so the
      // user sees the full conversation's results rather than just the
      // first mismatch.
    }

    if (result.status !== "cancelled") {
      result.status = result.stepResults.every((s) => s.status === "passed")
        ? "passed"
        : "failed"
    }
  } catch (err) {
    result.status = "error"
    result.error = err instanceof Error ? err.message : String(err)
  } finally {
    client.disconnect()
    result.finishedAt = new Date().toISOString()
    params.onStatusChange?.(result.status)
  }

  return result
}

// Runs every test concurrently, each through its own BlipDebugClient
// connection (its own guest visitor account against the same tenant/bot), so
// their conversations stay isolated from one another. Each test gets its own
// AbortSignal so a caller can cancel one run without affecting the others.
export async function runManyTests(
  tests: UnitTest[],
  connection: { tenant: string; botIdentifier: string; routerKey?: string },
  opts: { defaultTimeoutMs: number; defaultThreshold: number },
  handlers: {
    onStepUpdate: (testId: string, stepResult: StepResult) => void
    onStatusChange: (testId: string, status: TestRunStatus) => void
  },
  signalByTestId: Record<string, AbortSignal>,
  pauseControllerByTestId: Record<string, PauseController> = {}
): Promise<void> {
  await Promise.allSettled(
    tests.map((test) =>
      runTest({
        test,
        tenant: connection.tenant,
        botIdentifier: connection.botIdentifier,
        routerKey: connection.routerKey,
        defaultTimeoutMs: opts.defaultTimeoutMs,
        defaultThreshold: opts.defaultThreshold,
        onStepUpdate: (stepResult) =>
          handlers.onStepUpdate(test.id, stepResult),
        onStatusChange: (status) => handlers.onStatusChange(test.id, status),
        signal: signalByTestId[test.id],
        pauseController: pauseControllerByTestId[test.id],
      })
    )
  )
}
