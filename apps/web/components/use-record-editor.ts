"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useUnsavedChanges } from "@/components/use-unsaved-changes"
import { showActionError } from "@/lib/show-action-error"

/** One draft and one explicit mutation for a record. Permissions stay server-side. */
export function useRecordEditor<T extends object>({ initial, onSave, initialEditing = false }: {
  initial: T
  initialEditing?: boolean
  onSave: (draft: T, changes: Partial<T>) => Promise<{ ok: boolean; error?: string } | void>
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(initialEditing)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState("")
  const [session, setSession] = React.useState(0)
  const [draft, setDraft] = React.useState(initial)
  const savingNow = React.useRef(false)
  const editingNow = React.useRef(initialEditing)
  const current = React.useRef(initial)
  const changes = React.useRef<Partial<T>>({})
  const confirmDiscard = useUnsavedChanges(dirty, saving)
  function start() {
    if (savingNow.current || editingNow.current) return
    editingNow.current = true
    current.current = initial; changes.current = {}; setDraft(initial)
    setError(""); setDirty(false); setEditing(true); setSession(value => value + 1)
  }
  function stage(patch: Partial<T>) {
    if (!editingNow.current || savingNow.current) return
    changes.current = { ...changes.current, ...patch }
    current.current = { ...current.current, ...patch }
    setDraft(current.current); setDirty(true)
  }
  function cancel() {
    if (savingNow.current || !confirmDiscard()) return false
    editingNow.current = false
    current.current = initial; changes.current = {}; setDraft(initial)
    setDirty(false); setError(""); setEditing(false); setSession(value => value + 1)
    return true
  }
  async function save() {
    if (savingNow.current || !editingNow.current) return false
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) active.blur()
    savingNow.current = true
    setSaving(true); setError("")
    try {
      const result = await onSave(current.current, changes.current)
      if (result && !result.ok) {
        const message = result.error || "Could not save changes."
        setError(message); showActionError({ok:false,error:message}); return false
      }
      editingNow.current = false
      setDirty(false); setEditing(false); setSession(value => value + 1); router.refresh(); return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save changes."
      setError(message); showActionError({ok:false,error:message}); return false
    } finally { savingNow.current = false; setSaving(false) }
  }
  return { record: editing ? draft : initial, editing, saving, dirty, error, session, start, stage, cancel, save,
    markDirty: () => { if (editing) setDirty(true) } }
}
