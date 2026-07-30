import { ExternalLinkIcon, ListIcon } from "lucide-react"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import { parseMessageContent } from "@/lib/message-parse"

interface MessagePreviewProps {
  content: string
  align?: "start" | "end"
  className?: string
}

export function MessagePreview({
  content,
  align = "start",
  className,
}: MessagePreviewProps) {
  const parsed = parseMessageContent(content)

  return (
    <Message align={align} className={className}>
      <MessageContent>
        <BubbleGroup>
          <Bubble align={align} variant="secondary">
            <BubbleContent className="flex flex-col p-0">
              <p className="px-3 py-2 text-pretty whitespace-pre-line">
                {parsed.text || (
                  <span className="text-muted-foreground italic">
                    Empty message
                  </span>
                )}
              </p>
              {parsed.kind === "cta" && (
                <a
                  href={parsed.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 border-t border-current/10 px-3 py-2 font-medium text-primary"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  {parsed.buttonLabel || "Button text"}
                </a>
              )}
              {parsed.kind === "menu" && (
                <div className="flex items-center gap-1.5 border-t border-current/10 px-3 py-2 font-medium text-primary">
                  <ListIcon className="size-3.5" />
                  {parsed.buttonLabel || "Menu button"}
                </div>
              )}
            </BubbleContent>
          </Bubble>
          {parsed.kind === "menu" && parsed.options.length > 0 && (
            <div className="flex flex-col gap-0.5 px-1 text-xs text-muted-foreground">
              {parsed.options.map((option, index) => (
                <span key={index}>• {option || `Option ${index + 1}`}</span>
              ))}
            </div>
          )}
          {parsed.kind === "quickReply" &&
            parsed.options.map((option, index) => (
              <Bubble key={index} align={align} variant="outline">
                <BubbleContent className="w-full text-center font-medium text-primary">
                  {option || `Option ${index + 1}`}
                </BubbleContent>
              </Bubble>
            ))}
        </BubbleGroup>
      </MessageContent>
    </Message>
  )
}
