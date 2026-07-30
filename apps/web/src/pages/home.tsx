import { useState } from "react"
import { useNavigate } from "react-router"
import { PlusIcon, PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTests } from "@/store/tests-context"
import { useRun } from "@/store/run-context"
import { TestListItem } from "@/components/test-builder/test-list-item"

export function HomePage() {
  const { tests, addTest, deleteTest, duplicateTest } = useTests()
  const { runs, startRun, isRunning } = useRun()
  const navigate = useNavigate()
  const [checkedIds, setCheckedIds] = useState<string[]>([])

  const handleAddTest = () => {
    const id = addTest()
    navigate(`/tests/${id}`)
  }

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex min-h-svh flex-col p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-medium">
            Unit Test Builder
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={checkedIds.length === 0 || checkedIds.some(isRunning)}
              onClick={() =>
                startRun(tests.filter((t) => checkedIds.includes(t.id)))
              }
            >
              <PlayIcon />
              Run Tests…
            </Button>
            <Button onClick={handleAddTest}>
              <PlusIcon />
              New Test
            </Button>
          </div>
        </div>

        {tests.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No tests yet. Click "New Test" to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                test={test}
                runResult={runs[test.id]}
                checked={checkedIds.includes(test.id)}
                onCheckedChange={toggleChecked}
                onDelete={deleteTest}
                onDuplicate={duplicateTest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
