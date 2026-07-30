import type {
  ExpectedMessage,
  ExpectedMessageType,
  InputMessage,
  MessageOption,
  VariableAssertion,
} from "@/types/test"

function newOption(): MessageOption {
  return { id: crypto.randomUUID(), text: "" }
}

export function emptyInputMessage(): InputMessage {
  return { type: "text", text: "" }
}

export function emptyExpectedMessage(
  type: ExpectedMessageType
): ExpectedMessage {
  const id = crypto.randomUUID()
  switch (type) {
    case "text":
      return { id, type: "text", text: "" }
    case "quickReply":
      return { id, type: "quickReply", text: "", options: [newOption()] }
    case "menu":
      return { id, type: "menu", text: "", options: [newOption()] }
    case "cta":
      return { id, type: "cta", text: "", buttonText: "", url: "" }
  }
}

export function emptyVariableAssertion(): VariableAssertion {
  return {
    id: crypto.randomUUID(),
    name: "",
    condition: "equals",
    value: "",
  }
}

// An expected-output entry sitting on the "Variable" tab asserts on a context
// variable instead of a bot reply, so it is excluded from the runner's
// message-wait loop entirely. Entries written before variable assertions
// existed have no `assert` field and read as message expectations.
export function isVariableExpectation(message: ExpectedMessage): boolean {
  return message.assert === "variable"
}

// Menu rows need a stable-ish id distinct from the option's own uuid (which
// would make the formatted JSON change on every keystroke's re-render).
function rowId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
  return slug || `option_${index + 1}`
}

// Renders an expected message as the same JSON shape the real bot payload
// takes for that message type, so scoring compares like with like against
// the actual message received over the debug channel.
export function formatExpectedMessage(message: ExpectedMessage): string {
  switch (message.type) {
    case "text":
      return message.text
    case "quickReply":
      return JSON.stringify({
        scope: "immediate",
        text: message.text,
        options: message.options.map((option) => ({ text: option.text })),
      })
    case "cta":
      return JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: message.text },
          action: {
            name: "cta_url",
            parameters: {
              display_text: message.buttonText,
              url: message.url,
            },
          },
        },
      })
    case "menu":
      return JSON.stringify({
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: message.text },
          footer: { text: 'Clique em "Abrir menu" e escolha uma opção' },
          action: {
            button: "Abrir menu",
            sections: [
              {
                title: "Abrir menu",
                rows: message.options.map((option, index) => ({
                  id: rowId(option.text, index),
                  title: option.text,
                })),
              },
            ],
          },
        },
      })
  }
}
