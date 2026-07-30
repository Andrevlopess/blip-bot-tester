import pLimit from "p-limit"
import type { LimeMessage, LimeSessionEnvelope } from "@/types/lime"
import type { TestVariables } from "@/types/test"

// Confirmed Lime-over-WebSocket flow (see PROMPT.md captured from a live
// session): a throwaway guest session creates a visitor account, then an
// authenticated session (scheme "plain") exchanges messages with the bot.
// No bot secret key is ever needed — this is the same guest flow the public
// blip-chat widget uses.

export type DebugConnectionStatus =
  "idle" | "connecting" | "open" | "closed" | "error"

export interface BlipDebugConnectParams {
  tenant: string
  botIdentifier: string
  // Router "Authorization" key. Only required to apply contact variables —
  // merging /contacts needs elevated (router-level) authorization that a
  // guest visitor session doesn't have, so that command is sent as a plain
  // HTTP request instead of over the Lime WebSocket session. Once this app
  // runs as a Blip plugin, requests will be authenticated automatically and
  // this won't be needed.
  routerKey?: string
}

export interface BlipDebugClient {
  connect(params: BlipDebugConnectParams): Promise<void>
  sendMessage(text: string): void
  applyVariables(variables: TestVariables): Promise<void>
  // Reads one context variable back off the tester visitor. Resolves to null
  // when the variable is not set. The visitor identity lives inside the
  // client, so reads happen here rather than in the runner.
  getContextVariable(name: string): Promise<string | null>
  onMessage(cb: (text: string, raw: unknown) => void): () => void
  onStatusChange(cb: (status: DebugConnectionStatus) => void): () => void
  disconnect(): void
}

const CLIENT_DOMAIN = "0mn.io"
const BOT_DOMAIN = "msging.net"
const CRM_NODE = "postmaster@crm.msging.net"
const CONTEXT_NODE = "postmaster@msging.net"
const COMMAND_TIMEOUT_MS = 10000
const SESSION_TIMEOUT_MS = 15000
// Contact + context variables are applied concurrently; cap the in-flight
// requests so a test with many context variables doesn't fire dozens of
// simultaneous calls at the Commands API.
const VARIABLE_CONCURRENCY = 10

type Envelope = Record<string, unknown>

// The Commands API always answers HTTP 200 — success/failure lives in
// `status`, and `resource` carries the payload back on a successful `get`.
interface CommandResponse {
  status?: string
  resource?: unknown
  reason?: { code?: number; description?: string }
}

interface AuthOptions {
  scheme: string
  authentication: Record<string, unknown>
}

interface EstablishedSession {
  ws: WebSocket
  send: (envelope: Envelope) => void
  sessionId: string
  localNode: string
  remoteNode: string
}

// Drives a single Lime session over WebSocket through
// new -> (negotiating) -> authenticating -> established, resolving once
// established. Every non-session frame received on this socket (before or
// after establishment) is forwarded to `onEnvelope`.
function openSession(
  wsUrl: string,
  identity: string,
  auth: AuthOptions,
  onEnvelope: (envelope: Envelope) => void
): Promise<EstablishedSession> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl, "lime")
    } catch (err) {
      reject(err)
      return
    }

    let sessionId: string | null = null
    let settled = false

    const send = (envelope: Envelope) => ws.send(JSON.stringify(envelope))

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      ws.close()
      reject(new Error("Timed out establishing the debug session."))
    }, SESSION_TIMEOUT_MS)

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }

    ws.onopen = () => send({ state: "new" })

    ws.onerror = () =>
      finish(() =>
        reject(new Error("Debug session WebSocket connection failed."))
      )

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return
      let envelope: Envelope
      try {
        envelope = JSON.parse(event.data)
      } catch {
        return
      }

      if (typeof envelope.state === "string") {
        const session = envelope as unknown as LimeSessionEnvelope
        sessionId = session.id ?? sessionId

        if (
          session.state === "negotiating" &&
          (session.compressionOptions || session.encryptionOptions)
        ) {
          send({
            id: sessionId,
            state: "negotiating",
            compression: (session.compressionOptions ?? ["none"])[0],
            encryption: (session.encryptionOptions ?? ["none"])[0],
          })
          return
        }
        if (session.state === "authenticating") {
          send({
            id: sessionId,
            state: "authenticating",
            from: `${identity}/default`,
            scheme: auth.scheme,
            authentication: auth.authentication,
          })
          return
        }
        if (session.state === "established") {
          finish(() =>
            resolve({
              ws,
              send,
              sessionId: sessionId!,
              localNode: session.to!,
              remoteNode: session.from!,
            })
          )
          return
        }
        if (session.state === "failed") {
          finish(() =>
            reject(
              new Error(
                `Session failed: ${session.reason?.description ?? "unknown reason"}`
              )
            )
          )
          return
        }
        // "finished" is expected right after we ask the session to finish.
        return
      }

      onEnvelope(envelope)
    }
  })
}

function waitForCommand(
  pending: Map<string, (envelope: Envelope) => void>,
  id: string
): Promise<Envelope> {
  return new Promise((resolve, reject) => {
    pending.set(id, resolve)
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`Command ${id} timed out.`))
    }, COMMAND_TIMEOUT_MS)
  })
}

// Posts a command straight to the Commands API (not over the Lime WebSocket
// session) — used for anything that needs elevated (router-level)
// authorization a guest visitor session doesn't have, e.g. writing another
// identity's contact/context data.
async function postCommand(
  tenant: string,
  routerKey: string,
  command: Envelope,
  failureContext: string
): Promise<CommandResponse> {
  let response: Response
  try {
    response = await fetch(`https://${tenant}.http.msging.net/commands`, {
      method: "POST",
      headers: {
        Authorization: routerKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    })
  } catch (cause) {
    throw new Error(`Could not reach the Commands API to ${failureContext}.`, {
      cause,
    })
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("The router key was rejected — check it in Settings.")
  }
  if (!response.ok) {
    throw new Error(`Could not ${failureContext} (HTTP ${response.status}).`)
  }
  return (await response.json()) as CommandResponse
}

export function createBlipDebugClient(): BlipDebugClient {
  let ws: WebSocket | null = null
  let send: (envelope: Envelope) => void = () => {}
  let status: DebugConnectionStatus = "idle"
  let botIdentifier = ""
  let authSessionId = ""
  let currentIdentity = ""
  let debugTenant = ""
  let debugRouterKey = ""
  const ownMessageIds = new Set<string>()
  const pendingCommands = new Map<string, (envelope: Envelope) => void>()
  const messageListeners = new Set<(text: string, raw: unknown) => void>()
  const statusListeners = new Set<(status: DebugConnectionStatus) => void>()

  const setStatus = (next: DebugConnectionStatus) => {
    status = next
    statusListeners.forEach((cb) => cb(status))
  }

  // Handles every command/notification/message frame once the authenticated
  // session is up: keep-alive pings, correlated command acks (e.g.
  // /presence), and classifying message envelopes into real bot replies vs.
  // our own echo or typing-indicator chatstate.
  function handleSteadyStateEnvelope(envelope: Envelope) {
    if (
      envelope.method === "get" &&
      envelope.uri === "/ping" &&
      envelope.status === undefined
    ) {
      send({
        id: envelope.id,
        to: envelope.from,
        method: "get",
        status: "success",
        type: "application/vnd.lime.ping+json",
        resource: {},
      })
      return
    }

    if (
      typeof envelope.method === "string" &&
      typeof envelope.status === "string"
    ) {
      const id = envelope.id as string | undefined
      if (id && pendingCommands.has(id)) {
        pendingCommands.get(id)!(envelope)
        pendingCommands.delete(id)
      }
      return
    }

    // Delivery notifications (accepted/dispatched/received/consumed/failed)
    // aren't surfaced — the runner only cares about actual bot replies.
    if (typeof envelope.event === "string") return

    if (typeof envelope.type === "string" && "content" in envelope) {
      const message = envelope as unknown as LimeMessage<unknown>

      if (message.id && ownMessageIds.has(message.id)) return
      if (message.metadata?.["#message.echo"] === "true") return
      if (message.type === "application/vnd.lime.chatstate+json") return
      if (!message.from || !message.from.startsWith(`${botIdentifier}@`)) return

      const content = message.content
      let text: string
      if (typeof content === "string") {
        text = content
      } else if (
        content &&
        typeof content === "object" &&
        typeof (content as { text?: unknown }).text === "string"
      ) {
        text = (content as { text: string }).text
      } else {
        text = JSON.stringify(content)
      }
      messageListeners.forEach((cb) => cb(text, envelope))
    }
  }

  return {
    async connect({ tenant, botIdentifier: bot, routerKey }) {
      botIdentifier = bot
      debugTenant = tenant
      debugRouterKey = routerKey ?? ""
      setStatus("connecting")
      const wsUrl = `wss://${tenant}.ws.0mn.io:443`

      try {
        // --- Phase 1: throwaway guest session, only to create the visitor account ---
        const userIdentity = `${crypto.randomUUID()}.${bot}`
        const userPassword = btoa(crypto.randomUUID())
        currentIdentity = `${userIdentity}@${CLIENT_DOMAIN}`

        let onAccountCreated: ((envelope: Envelope) => void) | null = null
        const guest = await openSession(
          wsUrl,
          `${crypto.randomUUID()}@${CLIENT_DOMAIN}`,
          { scheme: "guest", authentication: {} },
          (envelope) => onAccountCreated?.(envelope)
        )

        const createId = crypto.randomUUID()
        const created = new Promise<Envelope>((resolve) => {
          onAccountCreated = (envelope) => {
            if (envelope.id === createId && typeof envelope.status === "string")
              resolve(envelope)
          }
        })
        guest.send({
          id: createId,
          method: "set",
          from: `${userIdentity}@${CLIENT_DOMAIN}/default`,
          pp: guest.localNode,
          type: "application/vnd.lime.account+json",
          uri: "/account",
          resource: { password: userPassword, userIdentity, userPassword },
        })
        const createResult = await created
        if (createResult.status !== "success") {
          throw new Error("Could not create the debug visitor account.")
        }
        // The id here MUST be the session id, not the command id, or the
        // server rejects it with "Invalid session id".
        guest.send({ id: guest.sessionId, state: "finishing" })
        guest.ws.close()

        // --- Phase 2: authenticated visitor session ---
        const session = await openSession(
          wsUrl,
          `${userIdentity}@${CLIENT_DOMAIN}`,
          { scheme: "plain", authentication: { password: userPassword } },
          handleSteadyStateEnvelope
        )
        ws = session.ws
        send = session.send
        authSessionId = session.sessionId
        ws.onclose = () => setStatus("closed")
        ws.onerror = () => setStatus("error")

        // Presence is mandatory and MUST be acked before any other
        // command/message is sent to a different node, or the server
        // rejects everything else with "presence must be set" (code 31).
        const presenceId = crypto.randomUUID()
        const presenceAck = waitForCommand(pendingCommands, presenceId)
        send({
          id: presenceId,
          method: "set",
          uri: "/presence",
          type: "application/vnd.lime.presence+json",
          resource: {
            status: "available",
            routingRule: "promiscuous",
            echo: true,
          },
        })
        const presenceResult = await presenceAck
        if (presenceResult.status !== "success") {
          throw new Error("Could not set presence on the debug session.")
        }

        send({
          id: crypto.randomUUID(),
          method: "set",
          uri: "/receipt",
          type: "application/vnd.lime.receipt+json",
          resource: {
            events: [
              "failed",
              "accepted",
              "dispatched",
              "received",
              "consumed",
            ],
          },
        })

        setStatus("open")
      } catch (err) {
        setStatus("error")
        throw err
      }
    },

    sendMessage(text: string) {
      if (!ws || status !== "open") {
        throw new Error("Cannot send a message — debug session is not open.")
      }
      const id = crypto.randomUUID()
      ownMessageIds.add(id)
      send({
        id,
        to: `${botIdentifier}@${BOT_DOMAIN}`,
        type: "text/plain",
        content: text,
      })
    },

    async applyVariables(variables: TestVariables) {
      if (!ws || status !== "open") {
        throw new Error("Cannot apply variables — debug session is not open.")
      }

      const { contact, context } = variables
      const extras = Object.fromEntries(
        contact.extras
          .filter((pair) => pair.key.trim())
          .map((pair) => [pair.key, pair.value])
      )
      const hasContactData = Boolean(
        contact.name ||
        contact.phoneNumber ||
        contact.taxDocument ||
        Object.keys(extras).length > 0
      )
      const namedContextVariables = context.filter((v) => v.name.trim())

      if (!hasContactData && namedContextVariables.length === 0) return
      if (!debugRouterKey) {
        throw new Error(
          "A router key is required to apply variables — set one in Settings."
        )
      }

      const limit = pLimit(VARIABLE_CONCURRENCY)
      const tasks: Promise<void>[] = []

      if (hasContactData) {
        tasks.push(
          limit(async () => {
            const result = await postCommand(
              debugTenant,
              debugRouterKey,
              {
                id: crypto.randomUUID(),
                to: CRM_NODE,
                method: "merge",
                uri: "/contacts",
                type: "application/vnd.lime.contact+json",
                resource: {
                  identity: currentIdentity,
                  ...(contact.name ? { name: contact.name } : {}),
                  ...(contact.phoneNumber
                    ? { phoneNumber: contact.phoneNumber }
                    : {}),
                  ...(contact.taxDocument
                    ? { taxDocument: contact.taxDocument }
                    : {}),
                  ...(Object.keys(extras).length > 0 ? { extras } : {}),
                },
              },
              "update the tester contact variables"
            )
            if (result.status !== "success") {
              throw new Error("Could not update the tester contact variables.")
            }
          })
        )
      }

      for (const variable of namedContextVariables) {
        tasks.push(
          limit(async () => {
            const result = await postCommand(
              debugTenant,
              debugRouterKey,
              {
                id: crypto.randomUUID(),
                // to: CONTEXT_NODE,
                method: "set",
                uri: `/contexts/${currentIdentity}/${variable.name}`,
                type: "text/plain",
                resource: variable.resource,
              },
              `set context variable "${variable.name}"`
            )
            if (result.status !== "success") {
              throw new Error(
                `Could not set context variable "${variable.name}".`
              )
            }
          })
        )
      }

      // `all` rejects on the first failure, matching the previous sequential
      // behaviour of failing the run as soon as a variable can't be applied.
      await Promise.all(tasks)
    },

    async getContextVariable(name: string) {
      if (!ws || status !== "open") {
        throw new Error(
          "Cannot read a context variable — debug session is not open."
        )
      }
      if (!debugRouterKey) {
        throw new Error(
          "A router key is required to read context variables — set one in Settings."
        )
      }

      const result = await postCommand(
        debugTenant,
        debugRouterKey,
        {
          id: crypto.randomUUID(),
          to: CONTEXT_NODE,
          method: "get",
          uri: `/contexts/${currentIdentity}/${name}`,
        },
        `read context variable "${name}"`
      )

      // A variable that was never set comes back as a non-success status
      // (typically 67 / "The requested resource was not found"), which is a
      // legitimate assertion outcome rather than a run error.
      if (result.status !== "success") return null
      if (result.resource === undefined || result.resource === null) return null
      return typeof result.resource === "string"
        ? result.resource
        : JSON.stringify(result.resource)
    },

    onMessage(cb) {
      messageListeners.add(cb)
      return () => messageListeners.delete(cb)
    },

    onStatusChange(cb) {
      statusListeners.add(cb)
      return () => statusListeners.delete(cb)
    },

    disconnect() {
      if (ws && authSessionId) {
        try {
          send({ id: authSessionId, state: "finishing" })
        } catch {
          // socket already closed, nothing to finish
        }
      }
      ws?.close()
      ws = null
      messageListeners.clear()
      statusListeners.clear()
      pendingCommands.clear()
    },
  }
}
