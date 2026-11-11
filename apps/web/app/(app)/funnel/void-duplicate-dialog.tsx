"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { listDuplicateWonTargets, voidDuplicateFunnel } from "./void-actions"

export function VoidDuplicateDialog({ funnelId, name }: { funnelId: string; name: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [targets, setTargets] = React.useState<Awaited<ReturnType<typeof listDuplicateWonTargets>>>([])
  const [retainedFunnelId, setRetained] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const id = React.useId()
  const router = useRouter()

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    listDuplicateWonTargets(funnelId).then(rows => { if (!cancelled) setTargets(rows) }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : "Unable to load funnels. Close and try again.") }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, funnelId])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || loading || !retainedFunnelId || !reason.trim()) return
    setBusy(true)
    setError("")
    try {
      const result = await voidDuplicateFunnel({ funnelId, retainedFunnelId, reason })
      if (!result.ok) { setError(result.error); return }
      toast.success("Void request sent to Sales Admin")
      setOpen(false)
      router.push("/approvals?tab=mine")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to void the duplicate. Try again.")
    } finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={next => {
    if (busy) return
    if (next) { setRetained(""); setReason(""); setError(""); setTargets([]); setLoading(true) }
    setOpen(next)
  }}>
    <DialogTrigger render={<Button variant="outline" />}>Void</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Request to void funnel</DialogTitle>
        <DialogDescription>Ask Sales Admin to void “{name}” as a duplicate. Nothing is archived until approved.</DialogDescription>
      </DialogHeader>
      <form id={id} onSubmit={submit} className="grid gap-4">
        <fieldset disabled={busy || loading} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor={`${id}-retained`} className="text-sm font-medium">Funnel to keep</label>
            <Combobox id={`${id}-retained`} value={retainedFunnelId} onChange={setRetained} disabled={busy || loading} options={targets.map(target => ({ value: target.id, label: `${target.name}${target.projectCode ? ` · ${target.projectCode}` : ""}` }))} placeholder={loading ? "Loading funnels…" : "Select the correct funnel"} />
            <p className="text-sm text-muted-foreground">Closed Won funnels for the same customer and currency, within your access.</p>
            {retainedFunnelId ? <Link href={`/funnel/${retainedFunnelId}`} target="_blank" rel="noopener noreferrer" className="link text-sm">Review selected funnel (opens a new tab)</Link> : null}
          </div>
          <div className="grid gap-2">
            <label htmlFor={`${id}-reason`} className="text-sm font-medium">Reason</label>
            <Textarea id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)} required maxLength={1000} rows={3} />
          </div>
        </fieldset>
        {!loading && !targets.length && !error ? <p role="status" className="text-sm">No eligible funnel to keep. Ask an administrator to review the records.</p> : null}
        <p className="text-sm text-muted-foreground">After approval, the duplicate and its quotations leave active lists and totals; pending invoice schedules are hidden. History is retained in the audit log. Linked invoicing, delivery, contracts, purchase costs or intercompany records must be reviewed first.</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" form={id} variant="destructive" disabled={loading || busy || !retainedFunnelId || !reason.trim()}>{busy ? "Submitting…" : "Submit request"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
