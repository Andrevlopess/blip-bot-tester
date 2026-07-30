export type ExpectedMessageType = "text" | "quickReply" | "menu" | "cta"

export interface MessageOption {
  id: string
  text: string
}

export interface TextMessage {
  type: "text"
  text: string
}

export interface QuickReplyMessage {
  type: "quickReply"
  text: string
  options: MessageOption[]
}

export interface MenuMessage {
  type: "menu"
  text: string
  options: MessageOption[]
}

export interface CtaMessage {
  type: "cta"
  text: string
  buttonText: string
  url: string
}

export type VariableCondition =
  "equals" | "different" | "contains" | "notContains" | "exists" | "notExists"

// One check against a bot-side context variable, read back from the tester
// visitor after the step's messages settle.
export interface VariableAssertion {
  id: string
  name: string
  condition: VariableCondition
  // Ignored (and hidden in the editor) for "exists"/"notExists".
  value: string
}

export type ExpectedMessage = (
  TextMessage | QuickReplyMessage | MenuMessage | CtaMessage
) & {
  // Stable id, used as the dnd-kit sortable id for drag-reordering and to
  // identify a message for copy/paste, independent of its array position.
  id: string
  // Overrides the step's threshold for this message only. Resolution
  // order (least to most specific): global settings < step < message.
  similarityThreshold?: number
  // Overrides the step's timeout for this message only, measured from
  // when the previous message arrived (or the step's input was sent, for
  // the first message). Same resolution order as similarityThreshold.
  timeoutMs?: number
  // Which of the entry's two tabs is actually asserted. Absent means
  // "message" — every entry written before variable assertions existed. A
  // "variable" entry expects no bot reply at all, so the runner leaves it
  // out of the message-wait loop.
  assert?: "message" | "variable"
  // Checked after the step's messages settle. Only used when
  // assert === "variable", but kept when the tab is switched back so
  // toggling tabs never discards work.
  variableAssertions?: VariableAssertion[]
}

// Only "text" is supported for the input message today, but it's still a
// typed message (not a bare string) so the same type-select UI/model works
// for input and expected output alike.
export type InputMessage = TextMessage

export interface Step {
  id: string
  name: string
  input: InputMessage
  expectedOutput: ExpectedMessage[]
  similarityThreshold?: number
  timeoutMs?: number
}

export interface KeyValuePair {
  id: string
  key: string
  value: string
}

// Fields merged into the tester visitor's Blip contact before a test run.
// `extras` are spread directly into the contact's `extras` object.
export interface ContactVariables {
  name?: string
  phoneNumber?: string
  taxDocument?: string
  extras: KeyValuePair[]
}

// A bot-side context variable set on the tester visitor before a test run,
// via `set /contexts/<identity>/<name>`. Always sent as `text/plain` —
// `resource` goes out as-is.
export interface ContextVariable {
  id: string
  name: string
  resource: string
}

export interface TestVariables {
  contact: ContactVariables
  context: ContextVariable[]
}

export interface UnitTest {
  id: string
  name: string
  createdAt: string
  steps: Step[]
  timeoutMs?: number
  similarityThreshold?: number
  variables?: TestVariables
}
