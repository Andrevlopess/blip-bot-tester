import type { Step, UnitTest } from "@/types/test"
import type {
  MessageScore,
  StepResult,
  StepRunStatus,
  TestRunResult,
  TestRunStatus,
} from "@/types/run"
import { scoreStep } from "@/lib/similarity"
import {
  createBlipDebugClient,
  type BlipDebugClient,
} from "@/lib/blip-debug-client"

// After the expected number of messages has arrived, wait this long for the
// bot to send anything extra before declaring the step passed — an
// unprompted trailing message (e.g. "how are you") is treated as a failure.
const EXTRA_MESSAGE_GRACE_MS = 5000

export interface RunTestParams {
  test: UnitTest
  tenant: string
  botIdentifier: string
  defaultTimeoutMs: number
  defaultThreshold: number
  onStepUpdate?: (stepResult: StepResult) => void
  onStatusChange?: (status: TestRunStatus) => void
  signal?: AbortSignal
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

  // Each expected message gets its own wait window, measured from when the
  // previous message arrived (or from when the input was sent, for the
  // first message) — not one deadline for the whole step.
  const resolveMessageTimeout = (index: number) =>
    step.expectedOutput[index]?.timeoutMs ?? stepTimeoutMs

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
      if (received.length === step.expectedOutput.length) {
        // Got everything expected — don't resolve yet. Wait a grace period
        // to make sure the bot doesn't keep talking beyond what was asked.
        graceTimer = setTimeout(finish, EXTRA_MESSAGE_GRACE_MS)
      } else if (received.length > step.expectedOutput.length) {
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

  const expectedCount = step.expectedOutput.length
  const {
    messages,
    passed: scoreMatched,
    averageScore,
  } = scoreStep(
    step.expectedOutput,
    collected.slice(0, expectedCount),
    threshold
  )
  const extraMessages: MessageScore[] = collected
    .slice(expectedCount)
    .map((actual) => ({
      expected: "(no further message expected)",
      actual,
      score: 0,
      threshold,
    }))
  const passed = scoreMatched && !hasExtraMessage
  const status: StepRunStatus = passed
    ? "passed"
    : collected.length < expectedCount
      ? "timeout"
      : "failed"

  return {
    stepId: step.id,
    status,
    messages: [...messages, ...extraMessages],
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
    })
    result.status = "running"
    params.onStatusChange?.(result.status)

    for (const step of params.test.steps) {
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
  connection: { tenant: string; botIdentifier: string },
  opts: { defaultTimeoutMs: number; defaultThreshold: number },
  handlers: {
    onStepUpdate: (testId: string, stepResult: StepResult) => void
    onStatusChange: (testId: string, status: TestRunStatus) => void
  },
  signalByTestId: Record<string, AbortSignal>
): Promise<void> {
  await Promise.allSettled(
    tests.map((test) =>
      runTest({
        test,
        tenant: connection.tenant,
        botIdentifier: connection.botIdentifier,
        defaultTimeoutMs: opts.defaultTimeoutMs,
        defaultThreshold: opts.defaultThreshold,
        onStepUpdate: (stepResult) =>
          handlers.onStepUpdate(test.id, stepResult),
        onStatusChange: (status) => handlers.onStatusChange(test.id, status),
        signal: signalByTestId[test.id],
      })
    )
  )
}
