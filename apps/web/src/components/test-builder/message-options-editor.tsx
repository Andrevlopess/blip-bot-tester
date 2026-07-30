import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MessageOption } from "@/types/test"

interface MessageOptionsEditorProps {
  options: MessageOption[]
  onChange: (options: MessageOption[]) => void
}

export function MessageOptionsEditor({
  options,
  onChange,
}: MessageOptionsEditorProps) {
  const updateOption = (index: number, text: string) => {
    onChange(
      options.map((option, i) => (i === index ? { ...option, text } : option))
    )
  }

  const addOption = () => {
    onChange([...options, { id: crypto.randomUUID(), text: "" }])
  }

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index)
    onChange(
      updated.length > 0 ? updated : [{ id: crypto.randomUUID(), text: "" }]
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Options
      </label>
      {options.map((option, index) => (
        <div key={option.id} className="flex gap-1">
          <Input
            value={option.text}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            className="flex-1"
          />
          {options.length > 1 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => removeOption(index)}
            >
              <XIcon />
            </Button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={addOption}
      >
        <PlusIcon />
        Add option
      </Button>
    </div>
  )
}
