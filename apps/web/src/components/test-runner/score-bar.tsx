import { cn } from "@/lib/utils"

export function ScoreBar({
  score,
  threshold,
  className,
}: {
  score: number
  threshold: number
  className?: string
}) {
  const passed = score >= threshold
  const percent = Math.round(score * 100)

  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        passed ? "text-green-600 dark:text-green-500" : "text-destructive",
        className
      )}
    >
      {percent}%
    </span>
  )
}
