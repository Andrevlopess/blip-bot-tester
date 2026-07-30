import { useState } from "react"
import { useParams, useNavigate } from "react-router"
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  PlayIcon,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTests } from "@/store/tests-context"
import { useRun } from "@/store/run-context"
import { useSettings } from "@/store/settings-context"
import { StepItem } from "@/components/test-builder/step-item"
import { RunStatusBadge } from "@/components/test-runner/run-status-badge"

export function TestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getTest, updateTest, addStep, updateStep, deleteStep, reorderSteps } =
    useTests()
  const { runs, startRun } = useRun()
  const { settings } = useSettings()
  const sensors = useSensors(useSensor(PointerSensor))

  const test = getTest(id ?? "")
  const runResult = test ? runs[test.id] : undefined
  const threshold =
    test?.similarityThreshold ?? settings.defaultSimilarityThreshold
  const stepTimeoutMs = test?.timeoutMs ?? settings.defaultTimeoutMs

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(test?.name ?? "")

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const stepIds = test.steps.map((s) => s.id)
    const fromIndex = stepIds.indexOf(String(active.id))
    const toIndex = stepIds.indexOf(String(over.id))
    reorderSteps(test.id, arrayMove(stepIds, fromIndex, toIndex))
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
            <Button variant="outline" onClick={() => startRun([test])}>
              <PlayIcon />
              Run
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
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
                  onUpdate={updateStep}
                  onDelete={deleteStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-4">
          <Button variant="outline" onClick={() => addStep(test.id)}>
            <PlusIcon />
            New Step
          </Button>
        </div>
      </div>
    </div>
  )
}
