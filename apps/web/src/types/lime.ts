export type LimeStatus = "success" | "failure"

export interface LimeCommand<TResource = unknown> {
  id: string
  method: "get" | "set" | "delete"
  uri: string
  type?: string
  resource?: TResource
}

export interface LimeReason {
  code: number
  description: string
}

// Confirmed against a live call to POST /commands: the endpoint always
// answers HTTP 200 — success/failure is only distinguishable via `status`.
export interface LimeCommandResponse<TResource = unknown> {
  id: string
  method: "get" | "set" | "delete"
  status: LimeStatus
  type?: string
  resource?: TResource
  reason?: LimeReason
}

// --- WebSocket debug-session envelopes ---
// Confirmed against a real captured session of the guest LIME-over-WebSocket
// flow (see blip-debug-client.ts for the exact sequence).
export interface LimeMessage<TContent = unknown> {
  id?: string
  from?: string
  to?: string
  pp?: string
  type: string
  content: TContent
  metadata?: Record<string, string>
}

export interface LimeNotification {
  id: string
  from?: string
  to?: string
  event:
    | "accepted"
    | "dispatched"
    | "received"
    | "consumed"
    | "failed"
    | "authorized"
    | string
  metadata?: Record<string, string>
  reason?: LimeReason
}

export interface LimeSessionEnvelope {
  id?: string
  from?: string
  to?: string
  state:
    | "new"
    | "negotiating"
    | "authenticating"
    | "established"
    | "finishing"
    | "finished"
    | "failed"
  scheme?: string
  schemeOptions?: string[]
  authentication?: { password?: string }
  compressionOptions?: string[]
  encryptionOptions?: string[]
  compression?: string
  encryption?: string
  reason?: LimeReason
}
