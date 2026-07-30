import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { emptyVariableAssertion } from "@/lib/message-format"
import {
  conditionUsesValue,
  VARIABLE_CONDITION_LABELS,
  VARIABLE_CONDITIONS,
} from "@/lib/variable-assert"
import type { VariableAssertion, VariableCondition } from "@/types/test"

interface VariableAssertionsEditorProps {
  assertions: VariableAssertion[]
  onChange: (assertions: VariableAssertion[]) => void
}

export function VariableAssertionsEditor({
  assertions,
  onChange,
}: VariableAssertionsEditorProps) {
  const updateAssertion = (
    index: number,
    data: Partial<Omit<VariableAssertion, "id">>
  ) => {
    onChange(
      assertions.map((assertion, i) =>
        i === index ? { ...assertion, ...data } : assertion
      )
    )
  }

  const addAssertion = () => {
    onChange([...assertions, emptyVariableAssertion()])
  }

  const removeAssertion = (index: number) => {
    onChange(assertions.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Read off the tester's context once this step's messages settle. No bot
        reply is expected for this entry.
      </p>
      {assertions.map((assertion, index) => (
        <div key={assertion.id} className="flex gap-1">
          <Input
            value={assertion.name}
            onChange={(e) => updateAssertion(index, { name: e.target.value })}
            placeholder="Variable name"
            className="w-40"
          />
          <Select
            value={assertion.condition}
            onValueChange={(condition) =>
              updateAssertion(index, {
                condition: condition as VariableCondition,
              })
            }
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {VARIABLE_CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {VARIABLE_CONDITION_LABELS[condition]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {conditionUsesValue(assertion.condition) ? (
            <Input
              value={assertion.value}
              onChange={(e) =>
                updateAssertion(index, { value: e.target.value })
              }
              placeholder="Value"
              className="flex-1"
            />
          ) : (
            <div className="flex-1" />
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => removeAssertion(index)}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={addAssertion}
      >
        <PlusIcon />
        Add assertion
      </Button>
    </div>
  )
}
