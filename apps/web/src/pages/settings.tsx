import { useState } from "react"
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettings } from "@/store/settings-context"
import { createBlipBucketClient } from "@/lib/blip-bucket-client"

type ConnectionTestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "found" }
  | { status: "not-found" }
  | { status: "error"; message: string }

export function SettingsPage() {
  const {
    settings,
    updateBucketConfig,
    updateDebugConnection,
    updateDefaultTimeoutMs,
    updateDefaultSimilarityThreshold,
  } = useSettings()

  const [shortName, setShortName] = useState(settings.bucket?.shortName ?? "")
  const [authorizationKey, setAuthorizationKey] = useState(
    settings.bucket?.authorizationKey ?? ""
  )
  const [documentId, setDocumentId] = useState(
    settings.bucket?.documentId ?? "chatbot-tester-tests"
  )
  const [showKey, setShowKey] = useState(false)
  const [testState, setTestState] = useState<ConnectionTestState>({
    status: "idle",
  })

  const [tenant, setTenant] = useState(settings.debugConnection?.tenant ?? "")
  const [botIdentifier, setBotIdentifier] = useState(
    settings.debugConnection?.botIdentifier ?? ""
  )
  const canSaveDebugConnection = tenant.trim() && botIdentifier.trim()

  const handleSaveDebugConnection = () => {
    updateDebugConnection({
      tenant: tenant.trim(),
      botIdentifier: botIdentifier.trim(),
    })
  }

  const handleDisconnectDebugConnection = () => {
    setTenant("")
    setBotIdentifier("")
    updateDebugConnection(null)
  }

  const canTest =
    shortName.trim() && authorizationKey.trim() && documentId.trim()

  const handleTestConnection = async () => {
    setTestState({ status: "testing" })
    try {
      const client = createBlipBucketClient({
        shortName: shortName.trim(),
        authorizationKey: authorizationKey.trim(),
        documentId: documentId.trim(),
      })
      const result = await client.get(documentId.trim())
      setTestState({ status: result === null ? "not-found" : "found" })
    } catch (err) {
      setTestState({
        status: "error",
        message: err instanceof Error ? err.message : "Connection failed.",
      })
    }
  }

  const handleSave = () => {
    updateBucketConfig({
      shortName: shortName.trim(),
      authorizationKey: authorizationKey.trim(),
      documentId: documentId.trim(),
    })
  }

  const handleDisconnect = () => {
    setShortName("")
    setAuthorizationKey("")
    setDocumentId("chatbot-tester-tests")
    setTestState({ status: "idle" })
    updateBucketConfig(null)
  }

  return (
    <div className="flex min-h-svh flex-col p-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 font-heading text-2xl font-medium">Settings</h1>

        <section className="mb-8 rounded-xl border p-4 ring-1 ring-foreground/5">
          <h2 className="mb-3 font-medium">Blip Bucket connection</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Test definitions are stored as a JSON document in a Blip Bucket via
            the Commands API. Paste the router's short name and authorization
            key below.
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Short name
              </label>
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. wlck"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Authorization key
              </label>
              <div className="flex gap-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={authorizationKey}
                  onChange={(e) => setAuthorizationKey(e.target.value)}
                  placeholder="Key ..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Document id
              </label>
              <Input
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="chatbot-tester-tests"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canTest || testState.status === "testing"}
                onClick={handleTestConnection}
              >
                Test connection
              </Button>
              <Button type="button" disabled={!canTest} onClick={handleSave}>
                Save
              </Button>
              {settings.bucket && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </div>

            {testState.status === "found" && (
              <p className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                <CheckCircle2Icon className="size-4" /> Connected — document
                found.
              </p>
            )}
            {testState.status === "not-found" && (
              <p className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                <CheckCircle2Icon className="size-4" /> Connected — document
                doesn't exist yet, it will be created on save.
              </p>
            )}
            {testState.status === "error" && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <XCircleIcon className="size-4" /> {testState.message}
              </p>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-xl border p-4 ring-1 ring-foreground/5">
          <h2 className="mb-3 font-medium">
            Debug connection (test execution)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Running a test opens a guest debug session directly against the bot
            — no Blip login or bot secret key needed. Just the Portal tenant and
            the bot's identifier.
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tenant
              </label>
              <Input
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                placeholder="e.g. matheus-juca-zukvj"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Bot identifier
              </label>
              <Input
                value={botIdentifier}
                onChange={(e) => setBotIdentifier(e.target.value)}
                placeholder="e.g. matheusteste6"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                disabled={!canSaveDebugConnection}
                onClick={handleSaveDebugConnection}
              >
                Save
              </Button>
              {settings.debugConnection && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDisconnectDebugConnection}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border p-4 ring-1 ring-foreground/5">
          <h2 className="mb-3 font-medium">Run defaults</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Default step timeout (seconds, 5-20)
              </label>
              <Input
                type="number"
                min={5}
                max={20}
                value={Math.round(settings.defaultTimeoutMs / 1000)}
                onChange={(e) => {
                  const seconds = Math.min(
                    20,
                    Math.max(5, Number(e.target.value) || 5)
                  )
                  updateDefaultTimeoutMs(seconds * 1000)
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Default similarity threshold (0-1)
              </label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={settings.defaultSimilarityThreshold}
                onChange={(e) => {
                  const value = Math.min(
                    1,
                    Math.max(0, Number(e.target.value) || 0)
                  )
                  updateDefaultSimilarityThreshold(value)
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
