import { useEffect, useRef, useState, type ReactNode } from "react"
import type { UnitTest, Step } from "@/types/test"
import { TestsContext } from "@/store/tests-context"
import { useSettings } from "@/store/settings-context"
import { emptyExpectedMessage, emptyInputMessage } from "@/lib/message-format"

const DEFAULT_DOCUMENT_ID = "chatbot-tester-tests"
const SAVE_DEBOUNCE_MS = 800

const MOCK_TESTS: UnitTest[] = [
  {
    id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    name: "Greeting Response",
    createdAt: "2025-01-15T10:30:00Z",
    steps: [
      {
        id: "s1",
        name: "Basic greeting",
        input: { type: "text", text: "Hello!" },
        expectedOutput: [
          { type: "text", text: "Hi there! How can I help you today?" },
        ],
      },
      {
        id: "s2",
        name: "Formal greeting",
        input: { type: "text", text: "Good morning" },
        expectedOutput: [
          { type: "text", text: "Good morning! How may I assist you?" },
        ],
      },
    ],
  },
  {
    id: "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    name: "FAQ Handling",
    createdAt: "2025-01-16T14:00:00Z",
    steps: [
      {
        id: "s3",
        name: "Business hours",
        input: { type: "text", text: "What are your business hours?" },
        expectedOutput: [
          { type: "text", text: "We are open Monday to Friday, 9am to 6pm." },
        ],
      },
      {
        id: "s4",
        name: "Contact info",
        input: { type: "text", text: "How can I contact support?" },
        expectedOutput: [
          {
            type: "text",
            text: "You can reach us at support@example.com or call 1-800-555-0123.",
          },
        ],
      },
      {
        id: "s5",
        name: "Pricing question",
        input: { type: "text", text: "How much does it cost?" },
        expectedOutput: [
          { type: "text", text: "Our plans start at $9.99/month." },
          {
            type: "quickReply",
            text: "Want to see the full plan comparison?",
            options: [
              { id: "opt-yes", text: "Yes, show me" },
              { id: "opt-no", text: "No, thanks" },
            ],
          },
        ],
      },
    ],
  },
]

export function TestsProvider({ children }: { children: ReactNode }) {
  const { settings, bucketClient } = useSettings()
  const [tests, setTests] = useState<UnitTest[]>(MOCK_TESTS)
  // Tracks status while a bucket connection is active; when there's no
  // bucketClient, `syncStatus` below is derived as "local-only" directly
  // (no effect needed for that case).
  const [asyncStatus, setAsyncStatus] = useState<
    "loading" | "syncing" | "synced" | "error"
  >("loading")
  const syncStatus = bucketClient ? asyncStatus : "local-only"

  const documentId = settings.bucket?.documentId || DEFAULT_DOCUMENT_ID
  const bucketClientRef = useRef(bucketClient)
  const documentIdRef = useRef(documentId)
  const readyToSyncRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bucketClientRef.current = bucketClient
    documentIdRef.current = documentId
  }, [bucketClient, documentId])

  // Loads (or initializes) the remote document whenever the bucket connection
  // changes. Intentionally does not depend on `tests` — edits are pushed by
  // the debounced effect below, not by this one.
  useEffect(() => {
    let cancelled = false
    readyToSyncRef.current = false
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    if (!bucketClient) {
      readyToSyncRef.current = true
      return
    }

    setAsyncStatus("loading")
    bucketClient
      .get<UnitTest[]>(documentId)
      .then(async (remoteTests) => {
        if (cancelled) return
        if (remoteTests) {
          setTests(remoteTests)
        } else {
          await bucketClient.set(documentId, tests)
          if (cancelled) return
        }
        setAsyncStatus("synced")
        readyToSyncRef.current = true
      })
      .catch(() => {
        if (cancelled) return
        setAsyncStatus("error")
        readyToSyncRef.current = true
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketClient, documentId])

  // Pushes local edits to the bucket, debounced so rapid edits (e.g. typing
  // in a step's textarea) collapse into a single write.
  useEffect(() => {
    if (!bucketClientRef.current || !readyToSyncRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const client = bucketClientRef.current
      if (!client) return
      setAsyncStatus("syncing")
      client
        .set(documentIdRef.current, tests)
        .then(() => setAsyncStatus("synced"))
        .catch(() => setAsyncStatus("error"))
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [tests])

  const addTest = (): string => {
    const id = crypto.randomUUID()
    const newTest: UnitTest = {
      id,
      name: "Untitled Test",
      createdAt: new Date().toISOString(),
      steps: [],
    }
    setTests((prev) => [newTest, ...prev])
    return id
  }

  const updateTest = (
    id: string,
    data: Partial<Pick<UnitTest, "name" | "timeoutMs" | "similarityThreshold">>
  ) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }

  const deleteTest = (id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id))
  }

  const getTest = (id: string) => tests.find((t) => t.id === id)

  const addStep = (testId: string) => {
    setTests((prev) =>
      prev.map((t) => {
        if (t.id !== testId) return t
        const newStep: Step = {
          id: crypto.randomUUID(),
          name: `Step ${t.steps.length + 1}`,
          input: emptyInputMessage(),
          expectedOutput: [emptyExpectedMessage("text")],
        }
        return { ...t, steps: [...t.steps, newStep] }
      })
    )
  }

  const updateStep = (
    testId: string,
    stepId: string,
    data: Partial<Omit<Step, "id">>
  ) => {
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, ...data } : s
              ),
            }
          : t
      )
    )
  }

  const deleteStep = (testId: string, stepId: string) => {
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) }
          : t
      )
    )
  }

  const reorderSteps = (testId: string, orderedStepIds: string[]) => {
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? {
              ...t,
              steps: orderedStepIds.map((id) =>
                t.steps.find((s) => s.id === id)!
              ),
            }
          : t
      )
    )
  }

  return (
    <TestsContext.Provider
      value={{
        tests,
        syncStatus,
        addTest,
        updateTest,
        deleteTest,
        getTest,
        addStep,
        updateStep,
        deleteStep,
        reorderSteps,
      }}
    >
      {children}
    </TestsContext.Provider>
  )
}
