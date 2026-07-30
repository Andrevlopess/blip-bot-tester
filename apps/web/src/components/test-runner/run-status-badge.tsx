import {
  Loader2Icon,
  CheckIcon,
  XIcon,
  ClockIcon,
  AlertTriangleIcon,
  BanIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { TestRunStatus, StepRunStatus } from "@/types/run"

type Status = TestRunStatus | StepRunStatus | undefined

const CONFIG: Record<
  Exclude<Status, undefined>,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon?: typeof Loader2Icon
    spin?: boolean
  } | null
> = {
  idle: null,
  pending: null,
  connecting: {
    label: "Connecting…",
    variant: "outline",
    icon: Loader2Icon,
    spin: true,
  },
  running: {
    label: "Running…",
    variant: "outline",
    icon: Loader2Icon,
    spin: true,
  },
  passed: { label: "Passed", variant: "default", icon: CheckIcon },
  failed: { label: "Failed", variant: "destructive", icon: XIcon },
  timeout: { label: "Timed out", variant: "destructive", icon: ClockIcon },
  error: { label: "Error", variant: "destructive", icon: AlertTriangleIcon },
  cancelled: { label: "Cancelled", variant: "secondary", icon: BanIcon },
}

export function RunStatusBadge({ status }: { status: Status }) {
  const config = status ? CONFIG[status] : null
  if (!config) return null

  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      {Icon && <Icon className={config.spin ? "animate-spin" : undefined} />}
      {config.label}
    </Badge>
  )
}
