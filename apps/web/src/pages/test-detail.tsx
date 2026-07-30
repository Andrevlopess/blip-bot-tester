import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTests } from "@/store/tests-context"
import { useRun } from "@/store/run-context"
import { useSettings } from "@/store/settings-context"
import { StepItem } from "@/components/test-builder/step-item"
import { MessagePreview } from "@/components/test-builder/message-preview"
import { VariablesEditor } from "@/components/test-builder/variables-editor"
import { RunStatusBadge } from "@/components/test-runner/run-status-badge"
import { RunControls } from "@/components/test-runner/run-controls"
import { formatExpectedMessage } from "@/lib/message-format"
import type { ExpectedMessage, Step } from "@/types/test"

type DragItemData =
  | { type: "step"; stepId: string }
  | { type: "message"; stepId: string; messageId: string }

type ActiveDragItem =
  { type: "step"; step: Step } | { type: "message"; message: ExpectedMessage }

export function TestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getTest,
    updateTest,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    moveExpectedMessage,
  } = useTests()
  const { runs, startRun, pauseRun, resumeRun, discardRun } = useRun()
  const { settings } = useSettings()
  const sensors = useSensors(useSensor(PointerSensor))

  const test = getTest(id ?? "")
  const runResult = test ? runs[test.id] : undefined
  const threshold =
    test?.similarityThreshold ?? settings.defaultSimilarityThreshold
  const stepTimeoutMs = test?.timeoutMs ?? settings.defaultTimeoutMs

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(test?.name ?? "")
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(
    null
  )

  if (!test) {
    return (
      <div className="flex min-h-svh flex-col p-6">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm text-muted-foreground">Test not found.</p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon />
            Back
          </Button>
        </div>
      </div>
    )
  }

  const handleSaveName = () => {
    if (name.trim()) {
      updateTest(test.id, { name: name.trim() })
    } else {
      setName(test.name)
    }
    setEditingName(false)
  }

  const handleCancelName = () => {
    setName(test.name)
    setEditingName(false)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData | undefined
    if (data?.type === "step") {
      const step = test.steps.find((s) => s.id === data.stepId)
      if (step) setActiveDragItem({ type: "step", step })
    } else if (data?.type === "message") {
      const step = test.steps.find((s) => s.id === data.stepId)
      const message = step?.expectedOutput.find((m) => m.id === data.messageId)
      if (message) setActiveDragItem({ type: "message", message })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)
    if (!over) return
    const activeData = active.data.current as DragItemData | undefined

    if (activeData?.type === "step") {
      if (active.id === over.id) return
      const stepIds = test.steps.map((s) => s.id)
      const fromIndex = stepIds.indexOf(String(active.id))
      const toIndex = stepIds.indexOf(String(over.id))
      reorderSteps(test.id, arrayMove(stepIds, fromIndex, toIndex))
      return
    }

    if (activeData?.type === "message") {
      const overData = over.data.current as DragItemData | undefined
      const fromStepId = activeData.stepId
      let toStepId: string
      let toIndex: number

      if (overData?.type === "message") {
        toStepId = overData.stepId
        const targetStep = test.steps.find((s) => s.id === toStepId)
        if (!targetStep) return
        toIndex = targetStep.expectedOutput.findIndex(
          (m) => m.id === overData.messageId
        )
      } else if (overData?.type === "step") {
        toStepId = overData.stepId
        const targetStep = test.steps.find((s) => s.id === toStepId)
        if (!targetStep) return
        toIndex = targetStep.expectedOutput.length
      } else {
        return
      }

      moveExpectedMessage(
        test.id,
        fromStepId,
        toStepId,
        activeData.messageId,
        toIndex
      )
    }
  }

  return (
    <div className="flex min-h-svh flex-col p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
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
                className="h-auto border-0 px-0 font-heading text-2xl font-medium shadow-none focus-visible:ring-0"
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
              <h1 className="font-heading text-2xl font-medium">{test.name}</h1>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditingName(true)}
              >
                <PencilIcon />
              </Button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <RunStatusBadge status={runResult?.status} />
            <RunControls
              status={runResult?.status}
              onRun={() => startRun([test])}
              onPause={() => pauseRun(test.id)}
              onResume={() => resumeRun(test.id)}
              onDiscard={() => discardRun(test.id)}
            />
          </div>
        </div>

        <Tabs defaultValue="steps">
          <TabsList>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="steps">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDragItem(null)}
            >
              <SortableContext
                items={test.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-4">
                  {test.steps.map((step) => (
                    <StepItem
                      key={step.id}
                      testId={test.id}
                      step={step}
                      stepResult={runResult?.stepResults.find(
                        (r) => r.stepId === step.id
                      )}
                      defaultThreshold={threshold}
                      defaultTimeoutMs={stepTimeoutMs}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => setSelectedStepId(step.id)}
                      onUpdate={updateStep}
                      onDelete={deleteStep}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDragItem?.type === "message" && (
                  <div className="rounded-lg border bg-card p-2 shadow-lg">
                    <MessagePreview
                      content={formatExpectedMessage(activeDragItem.message)}
                    />
                  </div>
                )}
                {activeDragItem?.type === "step" && (
                  <div className="rounded-xl border bg-card p-4 opacity-90 shadow-lg">
                    <span className="font-medium">
                      {activeDragItem.step.name}
                    </span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            <div className="mt-4">
              <Button variant="outline" onClick={() => addStep(test.id)}>
                <PlusIcon />
                New Step
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="variables">
            <VariablesEditor
              variables={test.variables}
              onChange={(variables) => updateTest(test.id, { variables })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
