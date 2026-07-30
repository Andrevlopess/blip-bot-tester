import type { MessageScore } from "@/types/run"
import type { ExpectedMessage } from "@/types/test"
import { formatExpectedMessage } from "@/lib/message-format"

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const n = a.length
  const m = b.length
  if (n === 0) return m
  if (m === 0) return n

  let prev = Array.from({ length: m + 1 }, (_, j) => j)
  let curr = new Array(m + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    curr[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[m]
}

export function levenshteinSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === "" && nb === "") return 1
  const maxLen = Math.max(na.length, nb.length)
  return maxLen === 0 ? 1 : 1 - levenshteinDistance(na, nb) / maxLen
}

export function tokenSetSimilarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(" ").filter(Boolean))
  const tb = new Set(normalize(b).split(" ").filter(Boolean))
  if (ta.size === 0 && tb.size === 0) return 1
  const intersectionSize = [...ta].filter((t) => tb.has(t)).length
  const unionSize = new Set([...ta, ...tb]).size
  return unionSize === 0 ? 1 : intersectionSize / unionSize
}

const SIMILARITY_WEIGHTS = { levenshtein: 0.5, tokenSet: 0.5 } as const

export function scoreMessagePair(
  expected: string,
  actual: string | null
): number {
  if (actual === null) return 0
  return (
    SIMILARITY_WEIGHTS.levenshtein * levenshteinSimilarity(expected, actual) +
    SIMILARITY_WEIGHTS.tokenSet * tokenSetSimilarity(expected, actual)
  )
}

export interface ScoreStepResult {
  messages: MessageScore[]
  passed: boolean
  averageScore: number
}

export function scoreStep(
  expectedOutput: ExpectedMessage[],
  actualMessages: string[],
  threshold: number
): ScoreStepResult {
  const messages: MessageScore[] = expectedOutput.map((expectedMessage, i) => {
    const expected = formatExpectedMessage(expectedMessage)
    const actual = i < actualMessages.length ? actualMessages[i] : null
    const messageThreshold = expectedMessage.similarityThreshold ?? threshold
    return {
      expected,
      actual,
      score: scoreMessagePair(expected, actual),
      threshold: messageThreshold,
    }
  })

  const passed = messages.every((m) => m.score >= m.threshold)
  const averageScore =
    messages.reduce((sum, m) => sum + m.score, 0) / (messages.length || 1)

  return { messages, passed, averageScore }
}
