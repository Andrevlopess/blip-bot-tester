import type { VariableAssertion, VariableCondition } from "@/types/test"

export const VARIABLE_CONDITIONS: VariableCondition[] = [
  "equals",
  "different",
  "contains",
  "notContains",
  "exists",
  "notExists",
]

export const VARIABLE_CONDITION_LABELS: Record<VariableCondition, string> = {
  equals: "equals",
  different: "different",
  contains: "contains",
  notContains: "not contains",
  exists: "exists",
  notExists: "not exists",
}

// "exists"/"notExists" assert on presence alone, so the editor hides the
// value field for them and the comparison ignores it.
export function conditionUsesValue(condition: VariableCondition): boolean {
  return condition !== "exists" && condition !== "notExists"
}

// `actual` is the raw context resource as returned by the Commands API, or
// null when the variable is not set. Comparison is raw: no trimming, no case
// folding, no JSON traversal. A missing variable fails every condition except
// "notExists" — including "different"/"notContains", which are about a value
// that differs, not about a value that is absent.
export function evaluateAssertion(
  assertion: VariableAssertion,
  actual: string | null
): boolean {
  switch (assertion.condition) {
    case "exists":
      return actual !== null
    case "notExists":
      return actual === null
    case "equals":
      return actual === assertion.value
    case "different":
      return actual !== null && actual !== assertion.value
    case "contains":
      return actual !== null && actual.includes(assertion.value)
    case "notContains":
      return actual !== null && !actual.includes(assertion.value)
  }
}
