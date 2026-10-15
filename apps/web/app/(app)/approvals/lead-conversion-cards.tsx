"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { showActionError } from "@/lib/show-action-error"
import { ApprovalReviewFrame, ApprovalFact, ApprovalRequestMetadata } from "./approval-review-parts"
import { decideLeadConversionAction, type LeadConversionApprovalRow } from "./lead-conversion-actions"

function ConversionDecision({ row, decision }: { row: LeadConversionApprovalRow; decision: "approved" | "rejected" | "cancelled" }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const label = decision === "approved" ? "Approve conversion" : decision === "rejected" ? "Reject" : "Cancel request"
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger render={<Button className="min-h-10 max-sm:min-h-11" variant={decision === "approved" ? "default" : "outline"}>{label}</Button>} />
    <AlertDialogContent><AlertDialogHeader>
      <AlertDialogTitle>{label}</AlertDialogTitle>
      <AlertDialogDescription>{decision === "approved" ? `Convert ${row.leadName} using the submitted details. The account, contact and requested opportunity will be created now.` : `The conversion request for ${row.leadName} will be ${decision}.`}</AlertDialogDescription>
    </AlertDialogHeader>
    {decision === "rejected" ? <div className="grid gap-2"><Label htmlFor={`lead-reject-${row.id}`}>Rejection reason (required)</Label><Textarea id={`lead-reject-${row.id}`} value={reason} onChange={e => setReason(e.target.value)} /></div> : null}
    <AlertDialogFooter><AlertDialogCancel className="min-h-11" disabled={pending}>Back</AlertDialogCancel><AlertDialogAction className="min-h-11" variant={decision === "rejected" ? "destructive" : "default"} disabled={pending || (decision === "rejected" && !reason.trim())} onClick={e => {
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
 const input=row.inputSnapshot
 const address=Object.values(input.newAccount?.address??{}).filter(Boolean).join(', ')
 return <ApprovalReviewFrame kind="lead" title={row.leadName} subtitle={row.companyName} status={row.status} recordHref={`/leads/${row.leadId}`} recordLabel="View lead" actions={incoming && row.status==='pending'?<><ConversionDecision row={row} decision="rejected"/><ConversionDecision row={row} decision="approved"/></>:row.canCancel?<ConversionDecision row={row} decision="cancelled"/>:null}>
  <section className="space-y-2"><h3 className="text-sm font-semibold">What approval does</h3><p className="text-sm text-muted-foreground">Converts this lead using the submitted details. {input.existingAccountId?'Uses the selected existing account.':'Creates the submitted account.'} {input.createOpportunity?'Includes the requested opportunity and funnel.':'No opportunity was requested.'}</p></section>
  <dl className="grid gap-4 sm:grid-cols-2"><ApprovalFact label="Account">{row.accountName??'New account'}</ApprovalFact>{row.opportunityName?<ApprovalFact label="Opportunity">{row.opportunityName}</ApprovalFact>:null}</dl>
    <details open className="rounded-md border p-3 text-sm"><summary className="cursor-pointer font-medium">Submitted conversion details</summary><dl className="mt-2 grid gap-1 text-muted-foreground">
      <div><dt className="inline">Contact: </dt><dd className="inline">{row.leadName} · {row.email ?? "No email"}{row.phone ? ` · ${row.phone}` : ""}</dd></div>
      <div><dt className="inline">Account: </dt><dd className="inline">{input.existingAccountId ? "Existing account" : "Create new account"} · {row.accountName}</dd></div>
      {!input.existingAccountId ? <><div><dt className="inline">Company code: </dt><dd className="inline">{input.newAccount?.code}</dd></div><div><dt className="inline">Account type: </dt><dd className="inline">{input.newAccount?.accountType ?? "client"}</dd></div><div><dt className="inline">Account phone: </dt><dd className="inline">{input.newAccount?.phone ?? "—"}</dd></div><div><dt className="inline">Billing address: </dt><dd className="inline">{address || "—"}</dd></div></> : null}
      <div><dt className="inline">Create opportunity: </dt><dd className="inline">{input.createOpportunity ? "Yes" : "No"}</dd></div>
      {input.createOpportunity ? <><div><dt className="inline">Opportunity: </dt><dd className="inline">{input.opportunityName || `${row.companyName || row.leadName} opportunity`}</dd></div><div><dt className="inline">Funnel: </dt><dd className="inline">{input.funnelName || input.opportunityName || `${row.companyName || row.leadName} opportunity`}</dd></div><div><dt className="inline">Expected close: </dt><dd className="inline">{input.expectedCloseDate || "—"}</dd></div></> : null}
    </dl></details>

  <ApprovalRequestMetadata row={row} incoming={incoming}/>
  {row.status==='pending'?<p className="text-xs text-muted-foreground">These are the submitted conversion details. To change them, cancel and resubmit the request.</p>:null}
  {row.rejectionReason?<section className="space-y-1"><h3 className="text-sm font-semibold">Rejection reason</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.rejectionReason}</p></section>:null}
 </ApprovalReviewFrame>
}
