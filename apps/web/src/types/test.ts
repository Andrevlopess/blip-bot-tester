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

export type ExpectedMessage = (
  TextMessage | QuickReplyMessage | MenuMessage | CtaMessage
) & {
  // Overrides the step's threshold for this message only. Resolution
  // order (least to most specific): global settings < step < message.
  similarityThreshold?: number
  // Overrides the step's timeout for this message only, measured from
  // when the previous message arrived (or the step's input was sent, for
  // the first message). Same resolution order as similarityThreshold.
  timeoutMs?: number
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

export interface UnitTest {
  id: string
  name: string
  createdAt: string
  steps: Step[]
  timeoutMs?: number
  similarityThreshold?: number
}
