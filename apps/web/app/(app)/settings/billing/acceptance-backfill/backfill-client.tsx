"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { showActionError } from "@/lib/show-action-error"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusCallout } from "@/components/status-callout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { runAcceptanceBackfill, type BackfillOutcome, type BackfillRow } from "@/app/(app)/quotations/acceptance-actions"

const ACTION_LABEL: Record<BackfillRow["action"], string> = {
  accept: "Record acceptance",
  switch_primary: "Make accepted quotation primary",
  skip: "Skipped",
}

export function AcceptanceBackfillClient({ rows }: { rows: BackfillRow[] }) {
  const router = useRouter()
  const actionable = rows.filter(row => row.action !== "skip")
  const skipped = rows.filter(row => row.action === "skip")
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(actionable.map(row => row.funnelId)))
  const [note, setNote] = React.useState("Backfill: legacy import — customer acceptance recorded for a Closed Won Funnel.")
  const [busy, setBusy] = React.useState(false)
  const [outcome, setOutcome] = React.useState<BackfillOutcome | null>(null)

  const toggle = (id: string, on: boolean) => setSelected(prev => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })
  const allOn = actionable.length > 0 && actionable.every(row => selected.has(row.funnelId))
  const counts = {
    accept: actionable.filter(row => row.action === "accept" && selected.has(row.funnelId)).length,
    switch: actionable.filter(row => row.action === "switch_primary" && selected.has(row.funnelId)).length,
  }

  async function run() {
    setBusy(true)
    const res = await runAcceptanceBackfill([...selected], note)
    setBusy(false)
    if (!res.ok) return showActionError(res)
    setOutcome(res.data)
    toast.success(`Backfill done: ${res.data.accepted} accepted, ${res.data.switched} primary switched`)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold">Acceptance backfill</h2>
        <p className="text-sm text-muted-foreground">
          Closed Won Funnels whose primary quotation isn’t accepted yet. Recording the acceptance lets their payment milestones be invoiced. The acceptance date is the Funnel’s close date (today if it’s missing or in the future). Validity dates are ignored. Every change is audited with this batch’s note.
        </p>
      </div>

      {outcome ? (
        <StatusCallout tone="success">
          {outcome.accepted} accepted, {outcome.switched} primary switched, {outcome.skipped.length} skipped.
          {outcome.needsReplan.length ? ` Payment milestones need re-planning on: ${outcome.needsReplan.join(", ")}.` : ""}
        </StatusCallout>
      ) : null}

      {actionable.length === 0 ? (
        <StatusCallout tone="info">Nothing to backfill. Every Closed Won Funnel with a usable primary quotation is already accepted.</StatusCallout>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="backfill-note" required>Note</Label>
            <Textarea id="backfill-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"><Checkbox aria-label="Select all" checked={allOn} onCheckedChange={on => setSelected(on ? new Set(actionable.map(row => row.funnelId)) : new Set())} /></TableHead>
                  <TableHead>Funnel</TableHead>
                  <TableHead>Project code</TableHead>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Status now</TableHead>
                  <TableHead>Acceptance date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionable.map(row => (
                  <TableRow key={row.funnelId}>
                    <TableCell><Checkbox aria-label={`Select ${row.funnelName}`} checked={selected.has(row.funnelId)} onCheckedChange={on => toggle(row.funnelId, !!on)} /></TableCell>
                    <TableCell><Link className="link" href={`/funnel/${row.funnelId}`}>{row.funnelName}</Link></TableCell>
                    <TableCell>{row.projectCode ?? "—"}</TableCell>
                    <TableCell>{row.quotationId ? <Link className="link" href={`/quotations/${row.quotationId}`}>{row.quoteNumber}</Link> : "—"}</TableCell>
                    <TableCell className="capitalize">{row.quoteStatus?.replace("_", " ") ?? "—"}</TableCell>
                    <TableCell>{row.action === "accept" ? row.acceptedOn : "—"}</TableCell>
                    <TableCell>{ACTION_LABEL[row.action]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger render={<Button disabled={busy || selected.size === 0 || !note.trim()}>{busy ? "Applying…" : `Apply to ${selected.size} Funnel(s)`}</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply the acceptance backfill?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {counts.accept} quotation(s) will be recorded as accepted and {counts.switch} Funnel(s) will have their accepted quotation made primary. All changes are saved together; any Funnel that changed since this page loaded is skipped. Owners and Admins can undo individual acceptances until something is invoiced.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={run}>Apply</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      {skipped.length ? (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Needs review ({skipped.length})</h3>
          <p className="text-sm text-muted-foreground">These are left untouched. Open each one to create, revise or record its quotation.</p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Funnel</TableHead><TableHead>Quotation</TableHead><TableHead>Reason</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {skipped.map(row => (
                  <TableRow key={row.funnelId}>
                    <TableCell><Link className="link" href={`/funnel/${row.funnelId}`}>{row.funnelName}</Link></TableCell>
                    <TableCell>{row.quotationId ? <Link className="link" href={`/quotations/${row.quotationId}`}>{row.quoteNumber}</Link> : "—"}</TableCell>
                    <TableCell>{row.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
