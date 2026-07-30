export interface BlipBucketConfig {
  shortName: string
  authorizationKey: string
  documentId: string
}

export interface DebugConnectionConfig {
  tenant: string
  botIdentifier: string
}

export interface AppSettings {
  bucket: BlipBucketConfig | null
  debugConnection: DebugConnectionConfig | null
  defaultTimeoutMs: number
  defaultSimilarityThreshold: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  bucket: null,
  debugConnection: null,
  defaultTimeoutMs: 10000,
  defaultSimilarityThreshold: 0.75,
}
