import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

interface ThresholdTimeoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  thresholdEnabled: boolean
  threshold: number
  onThresholdEnabledChange: (enabled: boolean) => void
  onThresholdChange: (value: number) => void
  timeoutEnabled: boolean
  timeoutMs: number
  onTimeoutEnabledChange: (enabled: boolean) => void
  onTimeoutChange: (ms: number) => void
}

export function ThresholdTimeoutDialog({
  open,
  onOpenChange,
  title,
  description,
  thresholdEnabled,
  threshold,
  onThresholdEnabledChange,
  onThresholdChange,
  timeoutEnabled,
  timeoutMs,
  onTimeoutEnabledChange,
  onTimeoutChange,
}: ThresholdTimeoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={thresholdEnabled}
                onCheckedChange={(checked) =>
                  onThresholdEnabledChange(checked === true)
                }
              />
              Custom threshold
            </label>
            {thresholdEnabled && (
              <div className="mt-2 flex items-center gap-2 pl-6">
                <Slider
                  className="max-w-48"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[threshold]}
                  onValueChange={([value]) => onThresholdChange(value)}
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(threshold * 100)}%
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={timeoutEnabled}
                onCheckedChange={(checked) =>
                  onTimeoutEnabledChange(checked === true)
                }
              />
              Custom timeout
            </label>
            {timeoutEnabled && (
              <div className="mt-2 flex items-center gap-1 pl-6">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={Math.round(timeoutMs / 1000)}
                  onChange={(e) => {
                    const seconds = Math.min(
                      60,
                      Math.max(1, Number(e.target.value) || 1)
                    )
                    onTimeoutChange(seconds * 1000)
                  }}
                  className="h-8 w-16"
                />
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
