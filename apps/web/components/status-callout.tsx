import * as React from "react"

import { cn } from "@/lib/utils"
import type { StatusTone } from "@/components/status-badge"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-success/25 bg-success-soft text-foreground",
  danger: "border-destructive/25 bg-destructive/10 text-foreground dark:bg-destructive/15",
  warning: "border-warning/25 bg-warning-soft text-foreground",
  info: "border-info/25 bg-info-soft text-foreground",
  neutral: "border-border bg-muted text-foreground",
}

/** Shared message surface for persistent status and validation notices. */
export function StatusCallout({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"div"> & { tone?: StatusTone }) {
  return (
    <div
      role="status"
      className={cn("rounded-md border px-3 py-2 text-sm", TONE_CLASSES[tone], className)}
      {...props}
    />
  )
}
