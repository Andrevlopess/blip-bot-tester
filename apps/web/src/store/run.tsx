import { useRef, useState, type ReactNode } from "react"
import type { UnitTest } from "@/types/test"
import type { TestRunResult } from "@/types/run"
import { runManyTests } from "@/lib/test-runner"
import { useSettings } from "@/store/settings-context"
import { RunContext } from "@/store/run-context"

export function RunProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [runs, setRuns] = useState<Record<string, TestRunResult>>({})
  const controllersRef = useRef<Record<string, AbortController>>({})

  const isRunning = (testId: string) => {
    const status = runs[testId]?.status
    return status === "connecting" || status === "running"
  }

  const startRun = async (tests: UnitTest[]) => {
    const connection = settings.debugConnection
    if (!connection) {
      setRuns((prev) => {
        const next = { ...prev }
        for (const test of tests) {
          next[test.id] = {
            testId: test.id,
            status: "error",
            stepResults: [],
            error:
              "Configure a tenant and bot identifier in Settings before running tests.",
          }
        }
        return next
      })
      return
    }

    const signalByTestId: Record<string, AbortSignal> = {}
    setRuns((prev) => {
      const next = { ...prev }
      for (const test of tests) {
        const controller = new AbortController()
        controllersRef.current[test.id] = controller
        signalByTestId[test.id] = controller.signal
        next[test.id] = {
          testId: test.id,
          status: "connecting",
          stepResults: [],
        }
      }
      return next
    })

    await runManyTests(
      tests,
      connection,
      {
        defaultTimeoutMs: settings.defaultTimeoutMs,
        defaultThreshold: settings.defaultSimilarityThreshold,
      },
      {
        onStepUpdate: (testId, stepResult) => {
          setRuns((prev) => {
            const existing = prev[testId]
            if (!existing) return prev
            return {
              ...prev,
              [testId]: {
                ...existing,
                stepResults: [...existing.stepResults, stepResult],
              },
            }
          })
        },
        onStatusChange: (testId, status) => {
          setRuns((prev) => {
            const existing = prev[testId]
            if (!existing) return prev
            return { ...prev, [testId]: { ...existing, status } }
          })
        },
      },
      signalByTestId
    )
  }

  const cancelRun = (testId: string) => {
    controllersRef.current[testId]?.abort()
  }

  const clearRun = (testId: string) => {
    setRuns((prev) => {
      const next = { ...prev }
      delete next[testId]
      return next
    })
  }

  return (
    <RunContext.Provider
      value={{ runs, isRunning, startRun, cancelRun, clearRun }}
    >
      {children}
    </RunContext.Provider>
  )
}
