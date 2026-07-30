import { useState } from "react"
import { useNavigate } from "react-router"
import {
  MoreVerticalIcon,
  TrashIcon,
  ExternalLinkIcon,
  PlayIcon,
  CopyIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import type { UnitTest } from "@/types/test"
import type { TestRunResult } from "@/types/run"
import { RunStatusBadge } from "@/components/test-runner/run-status-badge"
import { RunControls } from "@/components/test-runner/run-controls"
import { useRun } from "@/store/run-context"

interface TestListItemProps {
  test: UnitTest
  runResult?: TestRunResult
  checked: boolean
  onCheckedChange: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function TestListItem({
  test,
  runResult,
  checked,
  onCheckedChange,
  onDelete,
  onDuplicate,
}: TestListItemProps) {
  const navigate = useNavigate()
  const { startRun, pauseRun, resumeRun, discardRun, isRunning } = useRun()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <Card
        className="cursor-pointer"
        onClick={() => navigate(`/tests/${test.id}`)}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={checked}
                onCheckedChange={() => onCheckedChange(test.id)}
              />
            </div>
            <CardTitle>{test.name}</CardTitle>
          </div>
          <CardDescription>
            {test.steps.length} step
            {test.steps.length !== 1 ? "s" : ""} · Created{" "}
            {new Date(test.createdAt).toLocaleDateString()}
          </CardDescription>
          <CardAction
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <RunStatusBadge status={runResult?.status} />
            {(runResult?.status === "connecting" ||
              runResult?.status === "running" ||
              runResult?.status === "paused") && (
              <RunControls
                compact
                status={runResult.status}
                onRun={() => startRun([test])}
                onPause={() => pauseRun(test.id)}
                onResume={() => resumeRun(test.id)}
                onDiscard={() => discardRun(test.id)}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}`)}>
                  <ExternalLinkIcon />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isRunning(test.id)}
                  onClick={() => startRun([test])}
                >
                  <PlayIcon />
                  Run
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(test.id)}>
                  <CopyIcon />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <TrashIcon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{test.name}"? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(test.id)
                setConfirmDelete(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
