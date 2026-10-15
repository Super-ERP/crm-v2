"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { showActionError } from "@/lib/show-action-error"
import { formatDate } from "@/lib/format"
import { decideLeadConversionAction, type LeadConversionApprovalRow } from "./lead-conversion-actions"

function ConversionDecision({ row, decision }: { row: LeadConversionApprovalRow; decision: "approved" | "rejected" | "cancelled" }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const label = decision === "approved" ? "Approve conversion" : decision === "rejected" ? "Reject" : "Cancel request"
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger render={<Button size="sm" variant={decision === "approved" ? "default" : "outline"}>{label}</Button>} />
    <AlertDialogContent><AlertDialogHeader>
      <AlertDialogTitle>{label}</AlertDialogTitle>
      <AlertDialogDescription>{decision === "approved" ? `Convert ${row.leadName} using the submitted details. The account, contact and requested opportunity will be created now.` : `The conversion request for ${row.leadName} will be ${decision}.`}</AlertDialogDescription>
    </AlertDialogHeader>
    {decision === "rejected" ? <div className="grid gap-2"><Label htmlFor={`lead-reject-${row.id}`}>Rejection reason (required)</Label><Textarea id={`lead-reject-${row.id}`} value={reason} onChange={e => setReason(e.target.value)} /></div> : null}
    <AlertDialogFooter><AlertDialogCancel disabled={pending}>Back</AlertDialogCancel><AlertDialogAction disabled={pending || (decision === "rejected" && !reason.trim())} onClick={e => {
      e.preventDefault()
      startTransition(async () => {
        const result = await decideLeadConversionAction(row.id, decision, reason)
        if (!result.ok) { showActionError(result); return }
        toast.success(decision === "approved" ? "Lead converted" : decision === "rejected" ? "Conversion rejected" : "Conversion request cancelled")
        setOpen(false)
        router.refresh()
      })
    }}>{pending ? "Saving…" : label}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
  </AlertDialog>
}

export function LeadConversionApprovalCard({ row, incoming }: { row: LeadConversionApprovalRow; incoming: boolean }) {
  const input = row.inputSnapshot
  const address = Object.values(input.newAccount?.address ?? {}).filter(Boolean).join(", ")
  return <Card><CardContent className="flex flex-col gap-3 py-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><span className="font-medium">{row.leadName}</span><span className="text-sm text-muted-foreground">{row.companyName}</span></div><div className="flex gap-2"><Badge variant="outline">Lead conversion</Badge><Badge variant="secondary" className="capitalize">{row.status}</Badge></div></div>
    <dl className="grid gap-1 text-sm"><div><dt className="inline text-muted-foreground">Account: </dt><dd className="inline">{row.accountName ?? "New account"}</dd></div>{row.opportunityName ? <div><dt className="inline text-muted-foreground">Opportunity: </dt><dd className="inline">{row.opportunityName}</dd></div> : null}</dl>
    <details className="text-sm"><summary className="cursor-pointer font-medium">Submitted conversion details</summary><dl className="mt-2 grid gap-1 text-muted-foreground">
      <div><dt className="inline">Contact: </dt><dd className="inline">{row.leadName} · {row.email ?? "No email"}{row.phone ? ` · ${row.phone}` : ""}</dd></div>
      <div><dt className="inline">Account: </dt><dd className="inline">{input.existingAccountId ? "Existing account" : "Create new account"} · {row.accountName}</dd></div>
      {!input.existingAccountId ? <><div><dt className="inline">Company code: </dt><dd className="inline">{input.newAccount?.code}</dd></div><div><dt className="inline">Account type: </dt><dd className="inline">{input.newAccount?.accountType ?? "client"}</dd></div><div><dt className="inline">Account phone: </dt><dd className="inline">{input.newAccount?.phone ?? "—"}</dd></div><div><dt className="inline">Billing address: </dt><dd className="inline">{address || "—"}</dd></div></> : null}
      <div><dt className="inline">Create opportunity: </dt><dd className="inline">{input.createOpportunity ? "Yes" : "No"}</dd></div>
      {input.createOpportunity ? <><div><dt className="inline">Opportunity: </dt><dd className="inline">{input.opportunityName || `${row.companyName || row.leadName} opportunity`}</dd></div><div><dt className="inline">Funnel: </dt><dd className="inline">{input.funnelName || input.opportunityName || `${row.companyName || row.leadName} opportunity`}</dd></div><div><dt className="inline">Expected close: </dt><dd className="inline">{input.expectedCloseDate || "—"}</dd></div></> : null}
    </dl></details>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Requested by {row.requesterName ?? "Unknown"}</span><span>Requested {formatDate(row.requestedAt)}</span>{!incoming ? <span>Approver {row.approverName ?? "Unrouted"}</span> : null}{row.decidedAt ? <span>Decided {formatDate(row.decidedAt)}</span> : null}</div>
    {row.status === "pending" ? <p className="text-xs text-muted-foreground">Conversion details are awaiting approval. Saved lead changes require cancelling and resubmitting this request.</p> : null}
    {row.rejectionReason ? <p className="text-sm text-muted-foreground">Rejection reason: {row.rejectionReason}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" render={<Link href={`/leads/${row.leadId}`} />}>View lead</Button>{incoming ? <><ConversionDecision row={row} decision="rejected" /><ConversionDecision row={row} decision="approved" /></> : row.canCancel ? <ConversionDecision row={row} decision="cancelled" /> : null}</div>
  </CardContent></Card>
}
