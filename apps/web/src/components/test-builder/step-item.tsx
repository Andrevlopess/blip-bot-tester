import { Fragment, useState } from "react"
import {
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  SettingsIcon,
  GripVertical,
  ChevronDownIcon,
} from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageTypeSelect } from "@/components/test-builder/message-type-select"
import { ExpectedMessageFields } from "@/components/test-builder/expected-message-fields"
import { MessagePreview } from "@/components/test-builder/message-preview"
import {
  emptyExpectedMessage,
  formatExpectedMessage,
} from "@/lib/message-format"
import { cn } from "@/lib/utils"
import type { ExpectedMessage, ExpectedMessageType, Step } from "@/types/test"
import type { StepResult } from "@/types/run"
import { RunStatusBadge } from "@/components/test-runner/run-status-badge"
import { ScoreBar } from "@/components/test-runner/score-bar"

const EXPECTED_OUTPUT_TYPES: ExpectedMessageType[] = [
  "text",
  "quickReply",
  "menu",
  "cta",
]

interface StepItemProps {
  testId: string
  step: Step
  stepResult?: StepResult
  defaultThreshold?: number
  defaultTimeoutMs?: number
  onUpdate: (
    testId: string,
    stepId: string,
    data: Partial<Omit<Step, "id">>
  ) => void
  onDelete: (testId: string, stepId: string) => void
}

export function StepItem({
  testId,
  step,
  stepResult,
  defaultThreshold = 0.75,
  defaultTimeoutMs = 10000,
  onUpdate,
  onDelete,
}: StepItemProps) {
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(step.name)
  const [expanded, setExpanded] = useState(true)
  const [stepConfigOpen, setStepConfigOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [openMessageConfigIndex, setOpenMessageConfigIndex] = useState<
    number | null
  >(null)

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id })
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasCustomThreshold = step.similarityThreshold !== undefined
  const threshold = step.similarityThreshold ?? defaultThreshold
  const hasCustomStepTimeout = step.timeoutMs !== undefined
  const stepTimeoutMs = step.timeoutMs ?? defaultTimeoutMs

  const activeMessageIndex = openMessageConfigIndex ?? 0
  const activeMessage = step.expectedOutput[activeMessageIndex]
  const hasActiveMessageThreshold =
    activeMessage.similarityThreshold !== undefined
  const activeMessageThreshold = activeMessage.similarityThreshold ?? threshold
  const hasActiveMessageTimeout = activeMessage.timeoutMs !== undefined
  const activeMessageTimeoutMs = activeMessage.timeoutMs ?? stepTimeoutMs

  const handleSaveName = () => {
    if (name.trim()) {
      onUpdate(testId, step.id, { name: name.trim() })
    } else {
      setName(step.name)
    }
    setEditingName(false)
  }

  const handleCancelName = () => {
    setName(step.name)
    setEditingName(false)
  }

  const updateExpectedOutput = (index: number, message: ExpectedMessage) => {
    const updated = [...step.expectedOutput]
    updated[index] = message
    onUpdate(testId, step.id, { expectedOutput: updated })
  }

  const changeExpectedOutputType = (
    index: number,
    type: ExpectedMessageType
  ) => {
    updateExpectedOutput(index, emptyExpectedMessage(type))
  }

  const setExpectedOutputThreshold = (
    index: number,
    similarityThreshold: number | undefined
  ) => {
    updateExpectedOutput(index, {
      ...step.expectedOutput[index],
      similarityThreshold,
    })
  }

  const setExpectedOutputTimeout = (
    index: number,
    timeoutMs: number | undefined
  ) => {
    updateExpectedOutput(index, {
      ...step.expectedOutput[index],
      timeoutMs,
    })
  }

  const addExpectedOutput = () => {
    onUpdate(testId, step.id, {
      expectedOutput: [...step.expectedOutput, emptyExpectedMessage("text")],
    })
  }

  const removeExpectedOutput = (index: number) => {
    const updated = step.expectedOutput.filter((_, i) => i !== index)
    onUpdate(testId, step.id, {
      expectedOutput:
        updated.length > 0 ? updated : [emptyExpectedMessage("text")],
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className="group/step rounded-xl border p-4 ring-1 ring-foreground/5"
    >
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-grab opacity-0 group-hover/step:opacity-100 focus-visible:opacity-100"
              {...attributes}
              {...listeners}
            >
              <GripVertical />
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                <ChevronDownIcon
                  className={cn(
                    "transition-transform",
                    expanded && "rotate-180"
                  )}
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancelName}
                >
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
                hasCustomThreshold || hasCustomStepTimeout
                  ? "secondary"
                  : "ghost"
              }
              size="icon"
              onClick={() => setStepConfigOpen(true)}
            >
              <SettingsIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="grid grid-cols-2 gap-3">
            <div className="self-start">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Input
                </label>
                <MessageTypeSelect
                  value="text"
                  types={["text"]}
                  onChange={() => {}}
                />
              </div>
              <Textarea
                value={step.input.text}
                onChange={(e) =>
                  onUpdate(testId, step.id, {
                    input: { type: "text", text: e.target.value },
                  })
                }
                placeholder="Message to send..."
                className="min-h-24"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Expected Output
              </label>
              <div className="flex flex-col gap-2">
                {step.expectedOutput.map((message, index) => {
                  const hasCustomMessageThreshold =
                    message.similarityThreshold !== undefined
                  const hasCustomMessageTimeout =
                    message.timeoutMs !== undefined

                  return (
                    <div key={index} className="rounded-lg border p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <MessageTypeSelect
                          value={message.type}
                          types={EXPECTED_OUTPUT_TYPES}
                          onChange={(type) =>
                            changeExpectedOutputType(index, type)
                          }
                        />
                        <Button
                          variant={
                            hasCustomMessageThreshold || hasCustomMessageTimeout
                              ? "secondary"
                              : "ghost"
                          }
                          size="icon"
                          onClick={() => setOpenMessageConfigIndex(index)}
                        >
                          <SettingsIcon />
                        </Button>
                        <div className="flex-1" />
                        {step.expectedOutput.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeExpectedOutput(index)}
                          >
                            <XIcon />
                          </Button>
                        )}
                      </div>
                      <ExpectedMessageFields
                        message={message}
                        onChange={(updated) =>
                          updateExpectedOutput(index, updated)
                        }
                        textPlaceholder={
                          index === 0
                            ? "Expected response..."
                            : "Additional message..."
                        }
                      />
                      <div className="mt-2 border-t pt-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Preview
                        </p>
                        <MessagePreview
                          content={formatExpectedMessage(message)}
                        />
                      </div>
                    </div>
                  )
                })}
                <Button
                  variant="ghost"
                  size="xs"
                  className="self-start"
                  onClick={addExpectedOutput}
                >
                  <PlusIcon />
                  Add message
                </Button>
              </div>
            </div>
          </div>

          {stepResult && (
            <div className="mt-3 border-t pt-3">
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Result
              </label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Expected
                </p>
                <span />
                <p className="text-xs font-medium text-muted-foreground">
                  Actual
                </p>
                {stepResult.messages.map((message, index) => (
                  <Fragment key={index}>
                    <MessagePreview
                      content={message.expected}
                      className="min-w-0"
                    />
                    <ScoreBar
                      score={message.score}
                      threshold={message.threshold}
                      className="justify-self-center"
                    />
                    {message.actual === null ? (
                      <span className="text-xs text-destructive">
                        No reply received (timeout)
                      </span>
                    ) : (
                      <MessagePreview
                        content={message.actual}
                        className="min-w-0"
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={stepConfigOpen} onOpenChange={setStepConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Step settings</DialogTitle>
            <DialogDescription>
              Override the test's threshold and timeout for this step only.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={hasCustomThreshold}
                  onCheckedChange={(checked) =>
                    onUpdate(testId, step.id, {
                      similarityThreshold: checked
                        ? defaultThreshold
                        : undefined,
                    })
                  }
                />
                Custom threshold
              </label>
              {hasCustomThreshold && (
                <div className="mt-2 flex items-center gap-2 pl-6">
                  <Slider
                    className="max-w-48"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[threshold]}
                    onValueChange={([value]) =>
                      onUpdate(testId, step.id, { similarityThreshold: value })
                    }
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
                  checked={hasCustomStepTimeout}
                  onCheckedChange={(checked) =>
                    onUpdate(testId, step.id, {
                      timeoutMs: checked ? stepTimeoutMs : undefined,
                    })
                  }
                />
                Custom timeout
              </label>
              {hasCustomStepTimeout && (
                <div className="mt-2 flex items-center gap-1 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={Math.round(stepTimeoutMs / 1000)}
                    onChange={(e) => {
                      const seconds = Math.min(
                        60,
                        Math.max(1, Number(e.target.value) || 1)
                      )
                      onUpdate(testId, step.id, { timeoutMs: seconds * 1000 })
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

      <Dialog
        open={openMessageConfigIndex !== null}
        onOpenChange={(open) => !open && setOpenMessageConfigIndex(null)}
      >
        <DialogContent key={activeMessageIndex}>
          <DialogHeader>
            <DialogTitle>Message settings</DialogTitle>
            <DialogDescription>
              Override the step's threshold and timeout for this message only.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={hasActiveMessageThreshold}
                  onCheckedChange={(checked) =>
                    setExpectedOutputThreshold(
                      activeMessageIndex,
                      checked ? threshold : undefined
                    )
                  }
                />
                Custom threshold
              </label>
              {hasActiveMessageThreshold && (
                <div className="mt-2 flex items-center gap-2 pl-6">
                  <Slider
                    className="max-w-48"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[activeMessageThreshold]}
                    onValueChange={([value]) =>
                      setExpectedOutputThreshold(activeMessageIndex, value)
                    }
                  />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(activeMessageThreshold * 100)}%
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={hasActiveMessageTimeout}
                  onCheckedChange={(checked) =>
                    setExpectedOutputTimeout(
                      activeMessageIndex,
                      checked ? activeMessageTimeoutMs : undefined
                    )
                  }
                />
                Custom timeout
              </label>
              {hasActiveMessageTimeout && (
                <div className="mt-2 flex items-center gap-1 pl-6">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={Math.round(activeMessageTimeoutMs / 1000)}
                    onChange={(e) => {
                      const seconds = Math.min(
                        60,
                        Math.max(1, Number(e.target.value) || 1)
                      )
                      setExpectedOutputTimeout(
                        activeMessageIndex,
                        seconds * 1000
                      )
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

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{step.name}"? This action cannot
            be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(testId, step.id)
                setConfirmDeleteOpen(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
