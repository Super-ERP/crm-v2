import * as React from "react"

import { cn } from "@/lib/utils"

/** Compact, accessible choice control for multi-option inline selectors. */
export function ChoiceChip({
  selected = false,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      data-slot="choice-chip"
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}
