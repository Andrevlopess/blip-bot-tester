import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExpectedMessageType } from "@/types/test"

const LABELS: Record<ExpectedMessageType, string> = {
  text: "Text",
  quickReply: "Quick reply",
  menu: "Menu",
  cta: "CTA",
}

interface MessageTypeSelectProps {
  value: ExpectedMessageType
  types: ExpectedMessageType[]
  onChange: (type: ExpectedMessageType) => void
}

export function MessageTypeSelect({
  value,
  types,
  onChange,
}: MessageTypeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ExpectedMessageType)}
      disabled={types.length <= 1}
    >
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {types.map((type) => (
            <SelectItem key={type} value={type}>
              {LABELS[type]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
