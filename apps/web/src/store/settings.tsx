import { useMemo, useState, type ReactNode } from "react"
import type {
  AppSettings,
  BlipBucketConfig,
  DebugConnectionConfig,
} from "@/types/settings"
import { DEFAULT_SETTINGS } from "@/types/settings"
import { createBlipBucketClient } from "@/lib/blip-bucket-client"
import { SettingsContext } from "@/store/settings-context"

const STORAGE_KEY = "blip-tester-settings"

function loadSettings(): AppSettings {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const updateBucketConfig = (config: BlipBucketConfig | null) => {
    setSettings((prev) => {
      const next = { ...prev, bucket: config }
      saveSettings(next)
      return next
    })
  }

  const updateDebugConnection = (config: DebugConnectionConfig | null) => {
    setSettings((prev) => {
      const next = { ...prev, debugConnection: config }
      saveSettings(next)
      return next
    })
  }

  const updateDefaultTimeoutMs = (ms: number) => {
    setSettings((prev) => {
      const next = { ...prev, defaultTimeoutMs: ms }
      saveSettings(next)
      return next
    })
  }

  const updateDefaultSimilarityThreshold = (threshold: number) => {
    setSettings((prev) => {
      const next = { ...prev, defaultSimilarityThreshold: threshold }
      saveSettings(next)
      return next
    })
  }

  const bucketClient = useMemo(
    () => (settings.bucket ? createBlipBucketClient(settings.bucket) : null),
    [settings.bucket]
  )

  return (
    <SettingsContext.Provider
      value={{
        settings,
        bucketClient,
        updateBucketConfig,
        updateDebugConnection,
        updateDefaultTimeoutMs,
        updateDefaultSimilarityThreshold,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
