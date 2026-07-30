import { useRef, useState, type ReactNode } from "react"
import type { UnitTest } from "@/types/test"
import type { TestRunResult } from "@/types/run"
import { runManyTests } from "@/lib/test-runner"
import {
  createPauseController,
  type PauseController,
} from "@/lib/pause-controller"
import { useSettings } from "@/store/settings-context"
import { RunContext } from "@/store/run-context"

export function RunProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [runs, setRuns] = useState<Record<string, TestRunResult>>({})
  const controllersRef = useRef<Record<string, AbortController>>({})
  const pauseControllersRef = useRef<Record<string, PauseController>>({})

  const isRunning = (testId: string) => {
    const status = runs[testId]?.status
    return (
      status === "connecting" || status === "running" || status === "paused"
    )
  }

  const startRun = async (tests: UnitTest[]) => {
    // A test that's already connecting/running/paused has a live
    // pauseController/AbortController in the refs — starting a second run
    // for it would overwrite those with a fresh, unpaused controller while
    // the first run is still in flight (or suspended on pause), making it
    // look like a paused test kept sending messages on its own.
    const testsToRun = tests.filter((test) => !isRunning(test.id))
    if (testsToRun.length === 0) return

    const connection = settings.debugConnection
    if (!connection) {
      setRuns((prev) => {
        const next = { ...prev }
        for (const test of testsToRun) {
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
    const pauseControllerByTestId: Record<string, PauseController> = {}
    setRuns((prev) => {
      const next = { ...prev }
      for (const test of testsToRun) {
        const controller = new AbortController()
        controllersRef.current[test.id] = controller
        signalByTestId[test.id] = controller.signal
        const pauseController = createPauseController()
        pauseControllersRef.current[test.id] = pauseController
        pauseControllerByTestId[test.id] = pauseController
        next[test.id] = {
          testId: test.id,
          status: "connecting",
          stepResults: [],
        }
      }
      return next
    })

    await runManyTests(
      testsToRun,
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
            const alreadyPresent = existing.stepResults.some(
              (s) => s.stepId === stepResult.stepId
            )
            return {
              ...prev,
              [testId]: {
                ...existing,
                stepResults: alreadyPresent
                  ? existing.stepResults.map((s) =>
                      s.stepId === stepResult.stepId ? stepResult : s
                    )
                  : [...existing.stepResults, stepResult],
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
      signalByTestId,
      pauseControllerByTestId
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

  const pauseRun = (testId: string) => {
    pauseControllersRef.current[testId]?.pause()
    setRuns((prev) => {
      const existing = prev[testId]
      if (!existing) return prev
      return { ...prev, [testId]: { ...existing, status: "paused" } }
    })
  }

  const resumeRun = (testId: string) => {
    pauseControllersRef.current[testId]?.resume()
    setRuns((prev) => {
      const existing = prev[testId]
      if (!existing) return prev
      return { ...prev, [testId]: { ...existing, status: "running" } }
    })
  }

  const discardRun = (testId: string) => {
    pauseControllersRef.current[testId]?.resume()
    controllersRef.current[testId]?.abort()
    clearRun(testId)
  }

  return (
    <RunContext.Provider
      value={{
        runs,
        isRunning,
        startRun,
        cancelRun,
        clearRun,
        pauseRun,
        resumeRun,
        discardRun,
      }}
    >
      {children}
    </RunContext.Provider>
  )
}
