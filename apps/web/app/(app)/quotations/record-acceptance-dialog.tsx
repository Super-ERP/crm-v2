"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { showActionError } from "@/lib/show-action-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusCallout } from "@/components/status-callout"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { recordQuotationAcceptanceAction, undoQuotationAcceptanceAction } from "./acceptance-actions"

function todayInMalaysia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date())
}

export function RecordAcceptanceDialog({ quotationId, quoteNumber, validUntil, quoteDate }: { quotationId: string; quoteNumber: string; validUntil: string | null; quoteDate: string | null }) {
  const router = useRouter()
  const today = todayInMalaysia()
  const [open, setOpen] = React.useState(false)
  const [acceptedOn, setAcceptedOn] = React.useState(today)
  const [note, setNote] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const lapsed = !!validUntil && acceptedOn > validUntil

  async function submit() {
    setBusy(true)
    const form = new FormData()
    form.set("quotationId", quotationId)
    form.set("acceptedOn", acceptedOn)
    form.set("note", note)
    if (file) form.set("file", file)
    const res = await recordQuotationAcceptanceAction(form)
    setBusy(false)
    if (!res.ok) return showActionError(res)
    setOpen(false)
    toast.success(`${quoteNumber} recorded as accepted`, res.data.needsReplan
      ? { description: "The payment milestones don’t match this quotation. Re-plan them in the Payment milestones tab." }
      : res.data.relinkedMilestones ? { description: `${res.data.relinkedMilestones} payment milestone(s) moved onto this quotation.` } : undefined)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default">Record acceptance</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record customer acceptance</DialogTitle>
          <DialogDescription>
            Marks {quoteNumber} as accepted and primary, without the approval or send steps. The quotation is then locked from editing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="accepted-on" required>Acceptance date</Label>
            <Input id="accepted-on" type="date" value={acceptedOn} max={today} min={quoteDate ?? undefined} onChange={event => setAcceptedOn(event.target.value)} />
            {lapsed ? <StatusCallout tone="warning">This is after the validity date ({validUntil}). Explain the late acceptance in the note.</StatusCallout> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acceptance-note" required>Note</Label>
            <Textarea id="acceptance-note" value={note} maxLength={2000} placeholder="e.g. Customer accepted by email on 3 Dec 2025, PO 4500123" onChange={event => setNote(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acceptance-file">Attachment</Label>
            <Input id="acceptance-file" type="file" onChange={event => setFile(event.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">Optional, e.g. the PO or the customer’s email. Max 25 MB.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !note.trim() || !acceptedOn}>{busy ? "Recording…" : "Record acceptance"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UndoAcceptanceDialog({ quotationId, quoteNumber }: { quotationId: string; quoteNumber: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  async function submit() {
    setBusy(true)
    const res = await undoQuotationAcceptanceAction(quotationId, reason)
    setBusy(false)
    if (!res.ok) return showActionError(res)
    setOpen(false)
    toast.success(`${quoteNumber} acceptance undone`, { description: `Status is now ${res.data.status.replace("_", " ")}.` })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Undo acceptance</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo acceptance of {quoteNumber}?</DialogTitle>
          <DialogDescription>
            The quotation goes back to the status it had before it was accepted. This isn’t possible once a payment milestone on it has been invoiced.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="undo-reason" required>Reason</Label>
          <Textarea id="undo-reason" value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !reason.trim()}>{busy ? "Undoing…" : "Undo acceptance"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
