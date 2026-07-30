export type ParsedMessage =
  | { kind: "text"; text: string }
  | { kind: "quickReply"; text: string; options: string[] }
  | { kind: "menu"; text: string; buttonLabel: string; options: string[] }
  | { kind: "cta"; text: string; buttonLabel: string; url: string }

// Parses whatever a bot actually sent back (or what we authored as an
// expected message), not just our own template shapes — this parses
// generically off `interactive.type` / option arrays rather than assuming
// the exact structure `formatExpectedMessage` produces, since it must
// handle real bot payloads too.
export function parseMessageContent(content: string): ParsedMessage {
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

  if (interactive?.type === "button") {
    const body = interactive.body as { text?: string } | undefined
    const action = interactive.action as
      { buttons?: { reply?: { title?: string } }[] } | undefined
    const options = (action?.buttons ?? []).map(
      (button) => button.reply?.title ?? ""
    )
    return { kind: "quickReply", text: body?.text ?? "", options }
  }

  if (typeof obj.text === "string" && Array.isArray(obj.options)) {
    const options = (obj.options as { text?: string }[]).map(
      (option) => option.text ?? ""
    )
    return { kind: "quickReply", text: obj.text, options }
  }

  return { kind: "text", text: content }
}
