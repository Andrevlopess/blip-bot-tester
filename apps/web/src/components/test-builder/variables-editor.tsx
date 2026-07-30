import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { KeyValuePair, TestVariables } from "@/types/test"

interface VariablesEditorProps {
  variables: TestVariables | undefined
  onChange: (variables: TestVariables) => void
}

export function VariablesEditor({ variables, onChange }: VariablesEditorProps) {
  const contact = variables?.contact ?? { extras: [] }
  const context = variables?.context ?? []

  const emit = (patch: Partial<TestVariables>) => {
    onChange({ contact, context, ...patch })
  }

  const updateContactField = (
    field: "name" | "phoneNumber" | "taxDocument",
    value: string
  ) => {
    emit({ contact: { ...contact, [field]: value || undefined } })
  }

  const updateExtra = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    emit({
      contact: {
        ...contact,
        extras: contact.extras.map((pair, i) =>
          i === index ? { ...pair, [field]: value } : pair
        ),
      },
    })
  }

  const addExtra = () => {
    emit({
      contact: {
        ...contact,
        extras: [
          ...contact.extras,
          { id: crypto.randomUUID(), key: "", value: "" },
        ],
      },
    })
  }

  const removeExtra = (index: number) => {
    emit({
      contact: {
        ...contact,
        extras: contact.extras.filter((_, i) => i !== index),
      },
    })
  }

  const updateContextVariable = (
    index: number,
    data: Partial<Omit<TestVariables["context"][number], "id">>
  ) => {
    emit({
      context: context.map((variable, i) =>
        i === index ? { ...variable, ...data } : variable
      ),
    })
  }

  const addContextVariable = () => {
    emit({
      context: [
        ...context,
        { id: crypto.randomUUID(), name: "", resource: "" },
      ],
    })
  }

  const removeContextVariable = (index: number) => {
    emit({ context: context.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 font-heading text-sm font-medium">
          Contact variables
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Merged onto the tester visitor's contact before the test runs.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={contact.name ?? ""}
              onChange={(e) => updateContactField("name", e.target.value)}
              placeholder="André Vitor Lopes"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Phone number
            </label>
            <Input
              value={contact.phoneNumber ?? ""}
              onChange={(e) =>
                updateContactField("phoneNumber", e.target.value)
              }
              placeholder="5511954291621"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Tax document
            </label>
            <Input
              value={contact.taxDocument ?? ""}
              onChange={(e) =>
                updateContactField("taxDocument", e.target.value)
              }
              placeholder="00000000000"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Extras
          </label>
          {contact.extras.map((pair: KeyValuePair, index) => (
            <div key={pair.id} className="flex gap-1">
              <Input
                value={pair.key}
                onChange={(e) => updateExtra(index, "key", e.target.value)}
                placeholder="Key"
                className="flex-1"
              />
              <Input
                value={pair.value}
                onChange={(e) => updateExtra(index, "value", e.target.value)}
                placeholder="Value"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeExtra(index)}
              >
                <XIcon />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={addExtra}
          >
            <PlusIcon />
            Add extra
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-heading text-sm font-medium">
          Context variables
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Set on the tester visitor via <code>/contexts</code> before the test
          runs.
        </p>
        <div className="flex flex-col gap-2">
          {context.map((variable, index) => (
            <div key={variable.id} className="flex gap-1">
              <Input
                value={variable.name}
                onChange={(e) =>
                  updateContextVariable(index, { name: e.target.value })
                }
                placeholder="Variable name"
                className="w-40"
              />
              <Textarea
                value={variable.resource}
                onChange={(e) =>
                  updateContextVariable(index, { resource: e.target.value })
                }
                placeholder="Value"
                className="min-h-9 flex-1"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeContextVariable(index)}
              >
                <XIcon />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={addContextVariable}
          >
            <PlusIcon />
            Add context variable
          </Button>
        </div>
      </div>
    </div>
  )
}
