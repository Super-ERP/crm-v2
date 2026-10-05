import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Semantic tone shared by every status surface so the same meaning always
 *  reads in the same color. The "won/approved" moment (accepted / approved /
 *  converted / won) all map to one emerald success treatment. */
export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success dark:bg-success/15",
  danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  warning: "bg-warning-soft text-warning dark:bg-warning/15",
  info: "bg-info-soft text-info dark:bg-info/15",
  neutral: "bg-muted text-muted-foreground",
}

/** Maps a raw status/kind string to its semantic tone. Case-insensitive. */
const STATUS_TONE: Record<string, StatusTone> = {
  // success — the deal/quote/order reached a positive terminal state
  accepted: "success",
  approved: "success",
  converted: "success",
  won: "success",
  active: "success",
  completed: "success",
  paid: "success",
  // danger — negative terminal / removed
  rejected: "danger",
  disqualified: "danger",
  lost: "danger",
  void: "danger",
  expired: "danger",
  disabled: "danger",
  cancelled: "danger",
  declined: "danger",
  // warning — awaiting a decision / on hold
  pending: "warning",
  pending_review: "warning",
  parked: "warning",
  kiv: "warning",
  invited: "warning",
  on_hold: "warning",
  contacted: "warning",
  // info — in flight
  sent: "info",
  submitted: "info",
  open: "info",
  qualified: "info",
  invoiced: "info",
  issued: "info",
  settled: "success",
  // neutral — not yet started
  draft: "neutral",
  new: "neutral",
  planning: "neutral",
  planned: "neutral",
}

/** Tone for a status string; falls back to neutral for anything unmapped. */
export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status?.toLowerCase()] ?? "neutral"
}

/** Rounded-full pill shape so solid-tone badges read as pills, not filled cells. */
const PILL_CLASS = "rounded-full"

function defaultLabel(status: string) {
  if (!status) return status
  return status
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

/** Shared status pill. Pass `tone` to override the inferred tone, or `label`
 *  to override the humanized status text. */
export function StatusBadge({
  status,
  tone,
  label,
  className,
}: {
  status: string
  tone?: StatusTone
  label?: React.ReactNode
  className?: string
}) {
  const resolved = tone ?? statusTone(status)
  return (
    <Badge className={cn(TONE_CLASSES[resolved], PILL_CLASS, className)}>
      {label ?? defaultLabel(status)}
    </Badge>
  )
}
