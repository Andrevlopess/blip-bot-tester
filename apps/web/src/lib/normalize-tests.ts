import type { UnitTest } from "@/types/test"

// `ExpectedMessage.id` was added after tests were already being persisted,
// so documents written by earlier versions have messages without one. An
// `undefined` sortable id makes dnd-kit consider the message permanently
// dragging — `isDragging` is `active?.id === id`, and with no active drag
// that compares `undefined === undefined` — leaving the row stuck at drag
// opacity and impossible to reorder. Backfill ids whenever tests come in
// from storage.
export function normalizeTests(tests: UnitTest[]): UnitTest[] {
  return tests.map((test) => ({
    ...test,
    steps: test.steps.map((step) => ({
      ...step,
      expectedOutput: step.expectedOutput.map((message) =>
        message.id ? message : { ...message, id: crypto.randomUUID() }
      ),
    })),
  }))
}
