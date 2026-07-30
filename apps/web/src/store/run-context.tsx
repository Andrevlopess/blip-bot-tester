import { createContext, useContext } from "react"
import type { UnitTest } from "@/types/test"
import type { TestRunResult } from "@/types/run"

export interface RunContextValue {
  runs: Record<string, TestRunResult>
  isRunning: (testId: string) => boolean
  startRun: (tests: UnitTest[]) => Promise<void>
  cancelRun: (testId: string) => void
  clearRun: (testId: string) => void
}

export const RunContext = createContext<RunContextValue | null>(null)

export function useRun() {
  const ctx = useContext(RunContext)
  if (!ctx) throw new Error("useRun must be used within RunProvider")
  return ctx
}
