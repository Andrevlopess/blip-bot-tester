import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageOptionsEditor } from "@/components/test-builder/message-options-editor"
import type { ExpectedMessage } from "@/types/test"

interface ExpectedMessageFieldsProps {
  message: ExpectedMessage
  onChange: (message: ExpectedMessage) => void
  textPlaceholder?: string
}

export function ExpectedMessageFields({
  message,
  onChange,
  textPlaceholder,
}: ExpectedMessageFieldsProps) {
  switch (message.type) {
    case "text":
      return (
        <Textarea
          value={message.text}
          onChange={(e) => onChange({ ...message, text: e.target.value })}
          placeholder={textPlaceholder ?? "Expected response..."}
          className="min-h-16"
        />
      )
    case "quickReply":
    case "menu":
      return (
        <div className="flex flex-col gap-2">
          <Textarea
            value={message.text}
            onChange={(e) => onChange({ ...message, text: e.target.value })}
            placeholder="Message body..."
            className="min-h-16"
          />
          <MessageOptionsEditor
            options={message.options}
            onChange={(options) => onChange({ ...message, options })}
          />
        </div>
      )
    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <Textarea
            value={message.text}
            onChange={(e) => onChange({ ...message, text: e.target.value })}
            placeholder="CTA text..."
            className="min-h-16"
          />
          <Input
            value={message.buttonText}
            onChange={(e) =>
              onChange({ ...message, buttonText: e.target.value })
            }
            placeholder="Button text"
          />
          <Input
            value={message.url}
            onChange={(e) => onChange({ ...message, url: e.target.value })}
            placeholder="CTA url"
          />
        </div>
      )
  }
}
