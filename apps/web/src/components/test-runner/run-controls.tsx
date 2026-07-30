import { PlayIcon, PauseIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TestRunStatus } from "@/types/run"

interface RunControlsProps {
  status?: TestRunStatus
  onRun: () => void
  onPause: () => void
  onResume: () => void
  onDiscard: () => void
  compact?: boolean
}

export function RunControls({
  status,
  onRun,
  onPause,
  onResume,
  onDiscard,
  compact,
}: RunControlsProps) {
  const size = compact ? "icon-sm" : undefined

  if (status === "paused") {
    return (
      <div className="flex items-center gap-2">
        <Button size={size} onClick={onResume}>
          <PlayIcon />
          {!compact && "Continue"}
        </Button>
        <Button size={size} variant="destructive" onClick={onDiscard}>
          <XIcon />
          {!compact && "Discard"}
        </Button>
      </div>
    )
  }

  if (status === "connecting" || status === "running") {
    return (
      <Button size={size} onClick={onPause}>
        <PauseIcon />
        {!compact && "Pause"}
      </Button>
    )
  }

  return (
    <Button size={size} onClick={onRun}>
      <PlayIcon />
      {!compact && "Run"}
    </Button>
  )
}
