import type {
  ExpectedMessage,
  ExpectedMessageType,
  InputMessage,
  MessageOption,
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
  switch (type) {
    case "text":
      return { type: "text", text: "" }
    case "quickReply":
      return { type: "quickReply", text: "", options: [newOption()] }
    case "menu":
      return { type: "menu", text: "", options: [newOption()] }
    case "cta":
      return { type: "cta", text: "", buttonText: "", url: "" }
  }
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
