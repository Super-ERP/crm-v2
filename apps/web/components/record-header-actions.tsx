"use client"
import { Button } from "@/components/ui/button"
import { RecordVoidButton } from "@/components/record-void-button"
import type { VoidTarget } from "@/lib/record-void"

export function RecordHeaderActions({ canEdit, editing = false, saving = false, onEdit, onSave, onCancel, voidTarget, relatedTarget }: {
  canEdit: boolean; editing?: boolean; saving?: boolean
  onEdit?: () => void; onSave?: () => void; onCancel?: () => void
  voidTarget?: VoidTarget
  relatedTarget?: VoidTarget
}) {
  return <div className="flex min-w-0 flex-wrap items-center justify-end gap-2" aria-label="Record actions">
    {editing ? <><Button size="sm" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button><Button size="sm" disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Save changes"}</Button></> : <>
      {canEdit && onEdit ? <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button> : null}
      {voidTarget || relatedTarget ? <RecordVoidButton target={(voidTarget ?? relatedTarget)!} allowVoid={!!voidTarget} allowRelated={!!relatedTarget || voidTarget?.type === "funnel"} /> : null}
    </>}
  </div>
}
