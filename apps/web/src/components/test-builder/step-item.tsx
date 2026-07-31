import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { MessageTypeSelect } from "@/components/test-builder/message-type-select"
import { ExpectedMessageRow } from "@/components/test-builder/expected-message-row"
import { StepHeader } from "@/components/test-builder/step-header"
import { StepResultPanel } from "@/components/test-builder/step-result-panel"
import { ThresholdTimeoutDialog } from "@/components/test-builder/threshold-timeout-dialog"
import { ConfirmDeleteDialog } from "@/components/test-builder/confirm-delete-dialog"
import { emptyExpectedMessage } from "@/lib/message-format"
import { readExpectedMessageClipboard } from "@/lib/message-clipboard"
import { cn } from "@/lib/utils"
import type { ExpectedMessage, ExpectedMessageType, Step } from "@/types/test"
import type { StepResult } from "@/types/run"

interface StepItemProps {
  testId: string
  step: Step
  stepResult?: StepResult
  defaultThreshold?: number
  defaultTimeoutMs?: number
  isSelected: boolean
  onSelect: () => void
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
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: StepItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [contentAnimating, setContentAnimating] = useState(false)
  const [stepConfigOpen, setStepConfigOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [openMessageConfigIndex, setOpenMessageConfigIndex] = useState<
    number | null
  >(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, data: { type: "step", stepId: step.id } })
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Dragging an expanded step fights the CollapsibleContent height
  // animation against dnd-kit's transform, breaking the layout — force an
  // instant collapse for the duration of the drag and restore afterward.
  // Adjusted during render (not an effect) since it's state derived from a
  // prop change, not a sync with an external system.
  const [prevIsDragging, setPrevIsDragging] = useState(isDragging)
  const [wasExpandedBeforeDrag, setWasExpandedBeforeDrag] = useState(false)
  if (isDragging !== prevIsDragging) {
    setPrevIsDragging(isDragging)
    if (isDragging) {
      setWasExpandedBeforeDrag(expanded)
      if (expanded) {
        setContentAnimating(false)
        setExpanded(false)
      }
    } else if (wasExpandedBeforeDrag) {
      setExpanded(true)
    }
  }

  const { setNodeRef: setDropRef } = useDroppable({
    id: `dropzone-${step.id}`,
    data: { type: "step", stepId: step.id },
  })

  // Paste (Ctrl+V / Cmd+V) targets whichever step is currently selected —
  // only wired up while this step is the selected one, and ignored while
  // the user is typing into an input/textarea.
  useEffect(() => {
    if (!isSelected) return
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "v") return
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }
      const clipboardMessage = readExpectedMessageClipboard()
      if (!clipboardMessage) return
      e.preventDefault()
      onUpdate(testId, step.id, {
        expectedOutput: [
          ...step.expectedOutput,
          { ...clipboardMessage, id: crypto.randomUUID() },
        ],
      })
      setExpanded(true)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isSelected, step.expectedOutput, testId, step.id, onUpdate])

  const hasCustomThreshold = step.similarityThreshold !== undefined
  const threshold = step.similarityThreshold ?? defaultThreshold
  const hasCustomStepTimeout = step.timeoutMs !== undefined
  const stepTimeoutMs = step.timeoutMs ?? defaultTimeoutMs

  const activeMessageIndex = openMessageConfigIndex ?? 0
  // A step can transiently hold zero messages right after a message is
  // dragged out of it (before a new one is added or dropped in), so this
  // may be undefined.
  const activeMessage = step.expectedOutput[activeMessageIndex]
  const hasActiveMessageThreshold =
    activeMessage?.similarityThreshold !== undefined
  const activeMessageThreshold = activeMessage?.similarityThreshold ?? threshold
  const hasActiveMessageTimeout = activeMessage?.timeoutMs !== undefined
  const activeMessageTimeoutMs = activeMessage?.timeoutMs ?? stepTimeoutMs

  const updateExpectedOutput = (index: number, message: ExpectedMessage) => {
    const updated = [...step.expectedOutput]
    updated[index] = message
    onUpdate(testId, step.id, { expectedOutput: updated })
  }

  const changeExpectedOutputType = (
    index: number,
    type: ExpectedMessageType
  ) => {
    // Swap the type-specific payload but keep everything that isn't about
    // the type — the sortable id, the overrides, and the variable tab's
    // assertions — so switching type never silently drops them.
    const previous = step.expectedOutput[index]
    updateExpectedOutput(index, {
      ...emptyExpectedMessage(type),
      id: previous.id,
      similarityThreshold: previous.similarityThreshold,
      timeoutMs: previous.timeoutMs,
      assert: previous.assert,
      variableAssertions: previous.variableAssertions,
    })
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

  const getBorderStyle = () => {
    if (!stepResult) return ""
    switch (stepResult.status) {
      case "running":
        return "border-green-500 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]"
      case "passed":
        return "border-green-500"
      case "failed":
      case "timeout":
        return "border-red-500"
      default:
        return ""
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      onClick={onSelect}
      className={cn(
        "group/step rounded-xl border p-4 ring-1 ring-foreground/5",
        getBorderStyle(),
        isDragging && "opacity-60",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <Collapsible
        open={expanded}
        onOpenChange={(open) => {
          setExpanded(open)
          setContentAnimating(true)
        }}
      >
        <StepHeader
          step={step}
          expanded={expanded}
          dragHandleProps={{ attributes, listeners }}
          stepResult={stepResult}
          hasCustomThreshold={hasCustomThreshold}
          hasCustomStepTimeout={hasCustomStepTimeout}
          onRename={(name) => onUpdate(testId, step.id, { name })}
          onOpenSettings={() => setStepConfigOpen(true)}
          onOpenDelete={() => setConfirmDeleteOpen(true)}
        />

        <CollapsibleContent
          className={cn(
            "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
            contentAnimating && "overflow-hidden"
          )}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setContentAnimating(false)
          }}
        >
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <div className="sticky top-16">
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
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Expected Output
              </label>
              <SortableContext
                items={step.expectedOutput.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div ref={setDropRef} className="flex flex-col gap-2">
                  {step.expectedOutput.map((message, index) => (
                    <ExpectedMessageRow
                      key={message.id}
                      stepId={step.id}
                      message={message}
                      isFirst={index === 0}
                      canRemove={step.expectedOutput.length > 1}
                      onChangeType={(type) =>
                        changeExpectedOutputType(index, type)
                      }
                      onChange={(updated) =>
                        updateExpectedOutput(index, updated)
                      }
                      onConfigOpen={() => setOpenMessageConfigIndex(index)}
                      onRemove={() => removeExpectedOutput(index)}
                    />
                  ))}
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
              </SortableContext>
            </div>
          </div>

          {stepResult && <StepResultPanel stepResult={stepResult} />}
        </CollapsibleContent>
      </Collapsible>

      <ThresholdTimeoutDialog
        open={stepConfigOpen}
        onOpenChange={setStepConfigOpen}
        title="Step settings"
        description="Override the test's threshold and timeout for this step only."
        thresholdEnabled={hasCustomThreshold}
        threshold={threshold}
        onThresholdEnabledChange={(enabled) =>
          onUpdate(testId, step.id, {
            similarityThreshold: enabled ? defaultThreshold : undefined,
          })
        }
        onThresholdChange={(value) =>
          onUpdate(testId, step.id, { similarityThreshold: value })
        }
        timeoutEnabled={hasCustomStepTimeout}
        timeoutMs={stepTimeoutMs}
        onTimeoutEnabledChange={(enabled) =>
          onUpdate(testId, step.id, {
            timeoutMs: enabled ? stepTimeoutMs : undefined,
          })
        }
        onTimeoutChange={(ms) => onUpdate(testId, step.id, { timeoutMs: ms })}
      />

      <ThresholdTimeoutDialog
        key={activeMessageIndex}
        open={openMessageConfigIndex !== null}
        onOpenChange={(open) => !open && setOpenMessageConfigIndex(null)}
        title="Message settings"
        description="Override the step's threshold and timeout for this message only."
        thresholdEnabled={hasActiveMessageThreshold}
        threshold={activeMessageThreshold}
        onThresholdEnabledChange={(enabled) =>
          setExpectedOutputThreshold(
            activeMessageIndex,
            enabled ? threshold : undefined
          )
        }
        onThresholdChange={(value) =>
          setExpectedOutputThreshold(activeMessageIndex, value)
        }
        timeoutEnabled={hasActiveMessageTimeout}
        timeoutMs={activeMessageTimeoutMs}
        onTimeoutEnabledChange={(enabled) =>
          setExpectedOutputTimeout(
            activeMessageIndex,
            enabled ? activeMessageTimeoutMs : undefined
          )
        }
        onTimeoutChange={(ms) =>
          setExpectedOutputTimeout(activeMessageIndex, ms)
        }
      />

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        itemLabel="Step"
        itemName={step.name}
        onConfirm={() => {
          onDelete(testId, step.id)
          setConfirmDeleteOpen(false)
        }}
      />
    </div>
  )
}
