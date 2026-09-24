"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import MDEditor, { commands, type ICommand } from "@uiw/react-md-editor/nohighlight"
import "@uiw/react-md-editor/markdown-editor.css"
import { Button } from "@/components/ui/button"
import { QuotationDescription } from "@/components/quotation-description-view"

const underline: ICommand = {
  name: "underline",
  keyCommand: "underline",
  buttonProps: { "aria-label": "Underline selection", title: "Underline" },
  icon: <span className="underline">U</span>,
  execute: (state, api) => api.replaceSelection(`++${state.selectedText || "text"}++`),
}

const formattingCommands: ICommand[] = [
  commands.bold,
  commands.italic,
  underline,
  commands.strikethrough,
  commands.divider,
  commands.title,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.link,
]

export function QuotationDescriptionEditor({
  value,
  onChange,
  onBlur,
  label,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  label: string
}) {
  const [preview, setPreview] = React.useState(false)
  const [expanded, setExpanded] = React.useState(!value.trim())
  const { resolvedTheme } = useTheme()

  return (
    <div className="quotation-markdown min-w-0" data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <div className="flex items-center gap-1">
          {expanded ? <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</Button> : null}
          <Button type="button" variant="ghost" size="sm" className="h-7" aria-label={`${expanded ? "Hide" : "Show"} ${label}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "Show"}</Button>
        </div>
      </div>
      {!expanded ? (
        <QuotationDescription value={value} className="max-h-12 overflow-hidden text-xs text-muted-foreground" />
      ) : preview ? (
        <QuotationDescription value={value} className="min-h-40 rounded-lg border bg-background p-3" />
      ) : (
        <MDEditor
          value={value}
          onChange={(next) => onChange(next ?? "")}
          preview="edit"
          commands={formattingCommands}
          extraCommands={[]}
          height={180}
          minHeight={140}
          visibleDragbar
          textareaProps={{ "aria-label": label, onBlur }}
        />
      )}
    </div>
  )
}
