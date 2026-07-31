import { useState } from "react"
import {
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  GripVertical,
  ChevronDownIcon,
} from "lucide-react"
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Step } from "@/types/test"
import type { StepResult } from "@/types/run"
import { RunStatusBadge } from "@/components/test-runner/run-status-badge"

interface StepHeaderProps {
  step: Step
  expanded: boolean
  dragHandleProps: {
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  stepResult?: StepResult
  hasCustomThreshold: boolean
  hasCustomStepTimeout: boolean
  onRename: (name: string) => void
  onOpenSettings: () => void
  onOpenDelete: () => void
}

export function StepHeader({
  step,
  expanded,
  dragHandleProps,
  stepResult,
  hasCustomThreshold,
  hasCustomStepTimeout,
  onRename,
  onOpenSettings,
  onOpenDelete,
}: StepHeaderProps) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(step.name)

  const handleSaveName = () => {
    if (name.trim()) {
      onRename(name.trim())
    } else {
      setName(step.name)
    }
    setEditingName(false)
  }

  const handleCancelName = () => {
    setName(step.name)
    setEditingName(false)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab opacity-0 group-hover/step:opacity-100 focus-visible:opacity-100"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical />
        </Button>
        <CollapsibleTrigger asChild>
          <Button
            variant={expanded ? "secondary" : "ghost"}
            size="icon"
            className="transition-colors"
          >
            <ChevronDownIcon
              className={cn("transition-transform", expanded && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName()
                if (e.key === "Escape") handleCancelName()
              }}
              autoFocus
              className="h-auto max-w-xs border-0 px-0 font-medium shadow-none focus-visible:ring-0"
              placeholder="Step name"
            />
            <Button variant="ghost" size="icon-xs" onClick={handleSaveName}>
              <CheckIcon />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleCancelName}>
              <XIcon />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-medium">{step.name}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setEditingName(true)}
            >
              <PencilIcon />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <RunStatusBadge status={stepResult?.status} />
        <Button
          variant={
            hasCustomThreshold || hasCustomStepTimeout ? "secondary" : "ghost"
          }
          size="icon"
          onClick={onOpenSettings}
        >
          <SettingsIcon />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenDelete}>
          <TrashIcon />
        </Button>
      </div>
    </div>
  )
}
