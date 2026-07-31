import type { VariableCondition } from "@/types/test"

export interface MessageScore {
  expected: string
  actual: string | null
  score: number
  threshold: number
}

export type StepRunStatus =
  "pending" | "running" | "passed" | "failed" | "timeout"

// The outcome of one context-variable check. `actual` is the raw resource the
// Commands API returned, or null when the variable is not set.
export interface VariableAssertionResult {
  name: string
  condition: VariableCondition
  value: string
  actual: string | null
  passed: boolean
}

export interface StepResult {
  stepId: string
  status: StepRunStatus
  messages: MessageScore[]
  variableResults?: VariableAssertionResult[]
  // Whatever the bot actually said during a step with zero message
  // expectations (variable assertions only). Not scored against anything —
  // there's nothing to compare it to — but still worth surfacing next to the
  // variable results instead of silently discarding it.
  receivedMessages?: string[]
  // Averaged over `messages` only — variable assertions are pass/fail and
  // carry no similarity score.
  averageScore: number
  startedAt: string
  finishedAt: string
}

export type TestRunStatus =
  | "idle"
  | "connecting"
  | "running"
  | "paused"
  | "passed"
  | "failed"
  | "error"
  | "cancelled"

export interface TestRunResult {
  testId: string
  status: TestRunStatus
  stepResults: StepResult[]
  startedAt?: string
  finishedAt?: string
  error?: string
}
