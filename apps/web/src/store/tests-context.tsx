import { createContext, useContext } from "react"
import type { UnitTest, Step } from "@/types/test"

export type SyncStatus =
  "local-only" | "loading" | "syncing" | "synced" | "error"

export interface TestsContextValue {
  tests: UnitTest[]
  syncStatus: SyncStatus
  addTest: () => string
  updateTest: (
    id: string,
    data: Partial<Pick<UnitTest, "name" | "timeoutMs" | "similarityThreshold">>
  ) => void
  deleteTest: (id: string) => void
  getTest: (id: string) => UnitTest | undefined
  addStep: (testId: string) => void
  updateStep: (
    testId: string,
    stepId: string,
    data: Partial<Omit<Step, "id">>
  ) => void
  deleteStep: (testId: string, stepId: string) => void
  reorderSteps: (testId: string, orderedStepIds: string[]) => void
}

export const TestsContext = createContext<TestsContextValue | null>(null)

export function useTests() {
  const ctx = useContext(TestsContext)
  if (!ctx) throw new Error("useTests must be used within TestsProvider")
  return ctx
}
