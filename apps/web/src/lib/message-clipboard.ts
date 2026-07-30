import type { ExpectedMessage } from "@/types/test"

// Backed by localStorage (not navigator.clipboard) so copy/paste works
// synchronously, without permission prompts, across different tests and
// browser tabs on this origin.
const STORAGE_KEY = "chatbot-tester:clipboard:expected-message"

interface ClipboardPayload {
  kind: "expected-message"
  version: 1
  message: ExpectedMessage
}

export function copyExpectedMessage(message: ExpectedMessage): void {
  const payload: ClipboardPayload = {
    kind: "expected-message",
    version: 1,
    message,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage unavailable (private mode, quota) — paste will just
    // find nothing.
  }
}

export function readExpectedMessageClipboard(): ExpectedMessage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as ClipboardPayload
    if (payload.kind !== "expected-message" || payload.version !== 1) {
      return null
    }
    return payload.message
  } catch {
    return null
  }
}
