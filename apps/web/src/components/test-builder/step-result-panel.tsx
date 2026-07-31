import { Fragment, useState } from "react"
import { EyeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessagePreview } from "@/components/test-builder/message-preview"
import { ScoreBar } from "@/components/test-runner/score-bar"
import {
  conditionUsesValue,
  formatVariableValueForDisplay,
  VARIABLE_CONDITION_LABELS,
} from "@/lib/variable-assert"
import { cn } from "@/lib/utils"
import type { StepResult } from "@/types/run"

// Variable values (context resources) can be arbitrarily large JSON blobs —
// truncate the inline preview past this length and let the eye icon open the
// full, pretty-printed value instead.
const VARIABLE_VALUE_PREVIEW_LIMIT = 120

interface StepResultPanelProps {
  stepResult: StepResult
}

export function StepResultPanel({ stepResult }: StepResultPanelProps) {
  const [viewingVariable, setViewingVariable] = useState<{
    name: string
    value: string
  } | null>(null)

  return (
    <div className="mt-3 border-t pt-3">
      <label className="mb-2 block text-xs font-medium text-muted-foreground">
        Result
      </label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
        <p className="text-xs font-medium text-muted-foreground">Expected</p>
        <span />
        <p className="text-xs font-medium text-muted-foreground">Actual</p>
        {stepResult.messages.map((message, index) => (
          <Fragment key={index}>
            <MessagePreview content={message.expected} className="min-w-0" />
            <ScoreBar
              score={message.score}
              threshold={message.threshold}
              className="justify-self-center"
            />
            {message.actual === null ? (
              <span className="text-xs text-destructive">
                No reply received (timeout)
              </span>
            ) : (
              <MessagePreview content={message.actual} className="min-w-0" />
            )}
          </Fragment>
        ))}
      </div>
      {((stepResult.variableResults && stepResult.variableResults.length > 0) ||
        (stepResult.receivedMessages &&
          stepResult.receivedMessages.length > 0)) && (
        <div className="mt-3">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Variables
          </label>
          {stepResult.receivedMessages &&
            stepResult.receivedMessages.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  This step doesn't check the bot's reply, but it said:
                </p>
                {stepResult.receivedMessages.map((message, index) => (
                  <MessagePreview
                    key={index}
                    content={message}
                    className="min-w-0"
                  />
                ))}
              </div>
            )}
          {stepResult.variableResults &&
            stepResult.variableResults.length > 0 && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
                {stepResult.variableResults.map((result, index) => (
                  <Fragment key={index}>
                    <p className="min-w-0 text-xs wrap-break-word">
                      <span className="font-medium">{result.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {VARIABLE_CONDITION_LABELS[result.condition]}
                      </span>
                      {conditionUsesValue(result.condition) && (
                        <> {result.value}</>
                      )}
                    </p>
                    <span
                      className={cn(
                        "justify-self-center text-xs font-medium",
                        result.passed
                          ? "text-green-600 dark:text-green-500"
                          : "text-destructive"
                      )}
                    >
                      {result.passed ? "pass" : "fail"}
                    </span>
                    {result.actual === null ? (
                      <span className="text-xs text-muted-foreground">
                        not set
                      </span>
                    ) : result.actual.length > VARIABLE_VALUE_PREVIEW_LIMIT ? (
                      <div className="flex min-w-0 items-start gap-1">
                        <p className="min-w-0 flex-1 text-xs wrap-break-word text-muted-foreground">
                          {result.actual.slice(0, VARIABLE_VALUE_PREVIEW_LIMIT)}
                          …
                        </p>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0"
                          onClick={() =>
                            setViewingVariable({
                              name: result.name,
                              value: result.actual as string,
                            })
                          }
                        >
                          <EyeIcon />
                        </Button>
                      </div>
                    ) : (
                      <p className="min-w-0 text-xs wrap-break-word">
                        {result.actual}
                      </p>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
        </div>
      )}

      <Dialog
        open={viewingVariable !== null}
        onOpenChange={(open) => !open && setViewingVariable(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingVariable?.name}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[70vh] overflow-auto rounded-lg bg-muted p-3 text-xs wrap-break-word whitespace-pre-wrap">
            {viewingVariable &&
              formatVariableValueForDisplay(viewingVariable.value)}
          </pre>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
