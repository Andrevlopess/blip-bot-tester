import type { BlipBucketConfig } from "@/types/settings"
import type { LimeCommand, LimeCommandResponse } from "@/types/lime"

export type BlipBucketErrorKind = "network" | "auth" | "unknown"

export class BlipBucketError extends Error {
  kind: BlipBucketErrorKind
  cause?: unknown

  constructor(kind: BlipBucketErrorKind, message: string, cause?: unknown) {
    super(message)
    this.kind = kind
    this.cause = cause
  }
}

export interface BlipBucketClient {
  get<T>(documentId: string): Promise<T | null>
  set<T>(documentId: string, value: T): Promise<void>
  delete(documentId: string): Promise<void>
}

async function sendCommand<TResource>(
  config: BlipBucketConfig,
  command: Omit<LimeCommand<TResource>, "id">
): Promise<LimeCommandResponse<TResource>> {
  const body: LimeCommand<TResource> = { id: crypto.randomUUID(), ...command }

  let response: Response
  try {
    response = await fetch(
      `https://${config.shortName}.http.msging.net/commands`,
      {
        method: "POST",
        headers: {
          Authorization: config.authorizationKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )
  } catch (cause) {
    throw new BlipBucketError(
      "network",
      "Request failed — check your connection and, if running outside the Blip plugin, whether CORS allows this origin.",
      cause
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new BlipBucketError(
      "auth",
      "Authorization was rejected — check the key in Settings."
    )
  }
  if (!response.ok) {
    throw new BlipBucketError(
      "unknown",
      `Unexpected HTTP status ${response.status}.`
    )
  }

  return (await response.json()) as LimeCommandResponse<TResource>
}

export function createBlipBucketClient(
  config: BlipBucketConfig
): BlipBucketClient {
  return {
    async get<T>(documentId: string): Promise<T | null> {
      // Bucket documents must be a JSON object (code 21 "The property is
      // not a JSON" otherwise), so array values are stored wrapped as
      // `{ data: value }` and unwrapped here.
      const response = await sendCommand<{ data: T }>(config, {
        method: "get",
        uri: `/buckets/${documentId}`,
      })
      if (response.status === "failure") return null
      return response.resource?.data ?? null
    },

    async set<T>(documentId: string, value: T): Promise<void> {
      const response = await sendCommand<{ data: T }>(config, {
        method: "set",
        uri: `/buckets/${documentId}`,
        type: "application/json",
        resource: { data: value },
      })
      if (response.status === "failure") {
        throw new BlipBucketError(
          "unknown",
          response.reason?.description ?? "Failed to save to the bucket."
        )
      }
    },

    async delete(documentId: string): Promise<void> {
      const response = await sendCommand(config, {
        method: "delete",
        uri: `/buckets/${documentId}`,
      })
      if (response.status === "failure") {
        throw new BlipBucketError(
          "unknown",
          response.reason?.description ??
            "Failed to delete the bucket document."
        )
      }
    },
  }
}
