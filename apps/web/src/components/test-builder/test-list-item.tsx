import { useState } from "react"
import { useNavigate } from "react-router"
import {
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  ExternalLinkIcon,
  CheckIcon,
  XIcon,
  PlayIcon,
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
import { Input } from "@/components/ui/input"
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
import { useRun } from "@/store/run-context"

interface TestListItemProps {
  test: UnitTest
  runResult?: TestRunResult
  checked: boolean
  onCheckedChange: (id: string) => void
  onUpdate: (id: string, data: { name: string }) => void
  onDelete: (id: string) => void
}

export function TestListItem({
  test,
  runResult,
  checked,
  onCheckedChange,
  onUpdate,
  onDelete,
}: TestListItemProps) {
  const navigate = useNavigate()
  const { startRun } = useRun()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(test.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    if (name.trim()) {
      onUpdate(test.id, { name: name.trim() })
    } else {
      setName(test.name)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setName(test.name)
    setEditing(false)
  }

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
            {editing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                    if (e.key === "Escape") handleCancel()
                  }}
                  autoFocus
                  className="h-auto border-0 px-0 font-heading text-base font-medium shadow-none focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon-xs" onClick={handleSave}>
                  <CheckIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={handleCancel}>
                  <XIcon />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CardTitle>{test.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(true)
                  }}
                >
                  <PencilIcon />
                </Button>
              </div>
            )}
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
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startRun([test])}>
                  <PlayIcon />
                  Run
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
