import { useState } from "react"
import {
  CopyIcon,
  CheckIcon as CopiedIcon,
  GripVertical,
  SettingsIcon,
  XIcon,
} from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageTypeSelect } from "@/components/test-builder/message-type-select"
import { ExpectedMessageFields } from "@/components/test-builder/expected-message-fields"
import { MessagePreview } from "@/components/test-builder/message-preview"
import { VariableAssertionsEditor } from "@/components/test-builder/variable-assertions-editor"
import { formatExpectedMessage } from "@/lib/message-format"
import { copyExpectedMessage } from "@/lib/message-clipboard"
import { cn } from "@/lib/utils"
import type { ExpectedMessage, ExpectedMessageType } from "@/types/test"

const EXPECTED_OUTPUT_TYPES: ExpectedMessageType[] = [
  "text",
  "quickReply",
  "menu",
  "cta",
]

interface ExpectedMessageRowProps {
  stepId: string
  message: ExpectedMessage
  isFirst: boolean
  canRemove: boolean
  onChangeType: (type: ExpectedMessageType) => void
  onChange: (updated: ExpectedMessage) => void
  onConfigOpen: () => void
  onRemove: () => void
}

export function ExpectedMessageRow({
  stepId,
  message,
  isFirst,
  canRemove,
  onChangeType,
  onChange,
  onConfigOpen,
  onRemove,
}: ExpectedMessageRowProps) {
  const [copied, setCopied] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: message.id,
    data: { type: "message", stepId, messageId: message.id },
  })
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const assert = message.assert ?? "message"
  const isMessageTab = assert === "message"
  const hasCustomThreshold = message.similarityThreshold !== undefined
  const hasCustomTimeout = message.timeoutMs !== undefined
  const assertionCount = message.variableAssertions?.length ?? 0

  const handleCopy = () => {
    copyExpectedMessage(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={cn(
        "group/message rounded-lg border p-2",
        isDragging && "opacity-50"
      )}
    >
      <Tabs
        value={assert}
        onValueChange={(next) =>
          onChange({ ...message, assert: next as "message" | "variable" })
        }
      >
        <div className="mb-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            className="cursor-grab opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100"
            {...attributes}
            {...listeners}
          >
            <GripVertical />
          </Button>
          <TabsList variant="line">
            <TabsTrigger value="message">Message</TabsTrigger>
            <TabsTrigger value="variable">
              Variable
              {assertionCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-green-500 px-0.5 text-[9px] leading-none font-medium text-white">
                  {assertionCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          {/* Type, threshold and timeout only describe a message check —
              a variable assertion has no use for any of them. */}
          {isMessageTab && (
            <>
              <MessageTypeSelect
                value={message.type}
                types={EXPECTED_OUTPUT_TYPES}
                onChange={onChangeType}
              />
              <Button
                variant={
                  hasCustomThreshold || hasCustomTimeout ? "secondary" : "ghost"
                }
                size="icon"
                onClick={onConfigOpen}
              >
                <SettingsIcon />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100"
            onClick={handleCopy}
          >
            {copied ? <CopiedIcon /> : <CopyIcon />}
          </Button>
          {isMessageTab && (
            <div className="flex items-center gap-1">
              {hasCustomThreshold && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(message.similarityThreshold! * 100)}%
                </span>
              )}
              {hasCustomTimeout && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(message.timeoutMs! / 1000)}s
                </span>
              )}
            </div>
          )}
          <div className="flex-1" />
          {canRemove && (
            <Button variant="ghost" size="icon-xs" onClick={onRemove}>
              <XIcon />
            </Button>
          )}
        </div>
        <TabsContent value="message">
          <ExpectedMessageFields
            message={message}
            onChange={onChange}
            textPlaceholder={
              isFirst ? "Expected response..." : "Additional message..."
            }
          />
          <div className="mt-2 border-t pt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Preview
            </p>
            <MessagePreview content={formatExpectedMessage(message)} />
          </div>
        </TabsContent>
        <TabsContent value="variable">
          <VariableAssertionsEditor
            assertions={message.variableAssertions ?? []}
            onChange={(variableAssertions) =>
              onChange({ ...message, variableAssertions })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
