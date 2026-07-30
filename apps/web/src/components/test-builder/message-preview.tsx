import { ExternalLinkIcon, ListIcon } from "lucide-react"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

type ParsedMessage =
  | { kind: "text"; text: string }
  | { kind: "quickReply"; text: string; options: string[] }
  | { kind: "menu"; text: string; buttonLabel: string; options: string[] }
  | { kind: "cta"; text: string; buttonLabel: string; url: string }

// Renders whatever a bot actually sent back (or what we authored as an
// expected message), not just our own template shapes — so this parses
// generically off `interactive.type` / option arrays rather than assuming
// the exact structure `formatExpectedMessage` produces.
function parseMessageContent(content: string): ParsedMessage {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return { kind: "text", text: content }
  }

  if (!json || typeof json !== "object") return { kind: "text", text: content }
  const obj = json as Record<string, unknown>
  const interactive = obj.interactive as Record<string, unknown> | undefined

  if (interactive?.type === "cta_url") {
    const body = interactive.body as { text?: string } | undefined
    const action = interactive.action as
      { parameters?: { display_text?: string; url?: string } } | undefined
    return {
      kind: "cta",
      text: body?.text ?? "",
      buttonLabel: action?.parameters?.display_text ?? "",
      url: action?.parameters?.url ?? "",
    }
  }

  if (interactive?.type === "list") {
    const body = interactive.body as { text?: string } | undefined
    const action = interactive.action as
      | { button?: string; sections?: { rows?: { title?: string }[] }[] }
      | undefined
    const options = (action?.sections ?? []).flatMap((section) =>
      (section.rows ?? []).map((row) => row.title ?? "")
    )
    return {
      kind: "menu",
      text: body?.text ?? "",
      buttonLabel: action?.button ?? "",
      options,
    }
  }

  if (typeof obj.text === "string" && Array.isArray(obj.options)) {
    const options = (obj.options as { text?: string }[]).map(
      (option) => option.text ?? ""
    )
    return { kind: "quickReply", text: obj.text, options }
  }

  return { kind: "text", text: content }
}

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
