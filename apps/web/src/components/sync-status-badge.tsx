import {
  CloudIcon,
  CloudOffIcon,
  RefreshCwIcon,
  CloudAlertIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTests } from "@/store/tests-context"
import type { SyncStatus } from "@/store/tests-context"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StatusConfig {
  icon: LucideIcon
  label: string
  detail: string
  className: string
  spin?: boolean
}

const CONFIG: Record<SyncStatus, StatusConfig> = {
  "local-only": {
    icon: CloudOffIcon,
    label: "Not synced",
    detail: "Configure a Blip Bucket in Settings to save tests remotely.",
    className: "text-muted-foreground",
  },
  loading: {
    icon: RefreshCwIcon,
    label: "Loading…",
    detail: "Loading tests from the Blip Bucket.",
    className: "text-amber-600 dark:text-amber-500",
    spin: true,
  },
  syncing: {
    icon: RefreshCwIcon,
    label: "Saving…",
    detail: "Saving changes to the Blip Bucket.",
    className: "text-amber-600 dark:text-amber-500",
    spin: true,
  },
  synced: {
    icon: CloudIcon,
    label: "Synced",
    detail: "Tests are saved to the Blip Bucket.",
    className: "text-green-600 dark:text-green-500",
  },
  error: {
    icon: CloudAlertIcon,
    label: "Sync error",
    detail: "Couldn't reach the Blip Bucket — working from local state.",
    className: "text-destructive",
  },
}

export function SyncStatusBadge() {
  const { syncStatus } = useTests()
  const { icon: Icon, label, detail, className, spin } = CONFIG[syncStatus]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1 text-xs", className)}>
          <Icon className={cn("size-3.5", spin && "animate-spin")} />
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  )
}
