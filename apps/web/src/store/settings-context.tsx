import { createContext, useContext } from "react"
import type { AppSettings } from "@/types/settings"
import type { BlipBucketConfig, DebugConnectionConfig } from "@/types/settings"
import type { BlipBucketClient } from "@/lib/blip-bucket-client"

export interface SettingsContextValue {
  settings: AppSettings
  bucketClient: BlipBucketClient | null
  updateBucketConfig: (config: BlipBucketConfig | null) => void
  updateDebugConnection: (config: DebugConnectionConfig | null) => void
  updateDefaultTimeoutMs: (ms: number) => void
  updateDefaultSimilarityThreshold: (threshold: number) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
