export interface MessageScore {
  expected: string
  actual: string | null
  score: number
  threshold: number
}

export type StepRunStatus =
  "pending" | "running" | "passed" | "failed" | "timeout"

export interface StepResult {
  stepId: string
  status: StepRunStatus
  messages: MessageScore[]
  averageScore: number
  startedAt: string
  finishedAt: string
}

export type TestRunStatus =
  | "idle"
  | "connecting"
  | "running"
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
