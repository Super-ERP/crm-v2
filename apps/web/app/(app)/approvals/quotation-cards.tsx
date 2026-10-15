"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { approveQuotation, rejectQuotation, recallQuotation } from "@/app/(app)/quotations/actions"
import { showActionError } from "@/lib/show-action-error"
import { ApprovalReviewFrame, ApprovalFact, ApprovalRequestMetadata } from "./approval-review-parts"
import { formatMoney } from "@/lib/format"
import type { QuotationApprovalRow } from "./quotation-actions"

function QuotationDecision({ row, action }: { row: QuotationApprovalRow; action: "approve" | "reject" | "recall" }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const label = action === "approve" ? "Approve quotation" : action === "reject" ? "Reject" : "Recall to Draft"
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger render={<Button className="min-h-10 max-sm:min-h-11" variant={action === "approve" ? "default" : "outline"}>{label}</Button>} />
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{action === "approve" ? "Approve quotation" : action === "reject" ? "Reject quotation" : "Recall quotation to Draft"}</AlertDialogTitle>
        <AlertDialogDescription>{row.quoteNumber}{action === "approve" ? " will be approved." : " will return to Draft for editing."}</AlertDialogDescription>
      </AlertDialogHeader>
      {action === "reject" ? <div className="grid gap-2">
        <Label htmlFor={`reject-${row.id}`}>Rejection reason (required)</Label>
        <Textarea id={`reject-${row.id}`} value={reason} onChange={e => setReason(e.target.value)} rows={3} />
      </div> : null}
      <AlertDialogFooter>
        <AlertDialogCancel className="min-h-11" disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction className="min-h-11" variant={action === "reject" ? "destructive" : "default"} disabled={pending || (action === "reject" && !reason.trim())} onClick={e => {
          e.preventDefault()
          startTransition(async () => {
            const result = action === "approve" ? await approveQuotation(row.id)
              : action === "reject" ? await rejectQuotation(row.id, reason.trim()) : await recallQuotation(row.id)
            if (!result.ok) { showActionError(result); return }
            toast.success(action === "approve" ? "Quotation approved" : action === "reject" ? "Quotation rejected and returned to Draft" : "Quotation recalled to Draft")
            setOpen(false)
            router.refresh()
          })
        }}>{pending ? "Saving…" : label}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

export function QuotationApprovalCard({ row, incoming }: { row: QuotationApprovalRow; incoming: boolean }) {
 return <ApprovalReviewFrame kind="quotation" title={row.quoteNumber} subtitle={row.funnelName} status={row.status} recordHref={`/quotations/${row.id}`} recordLabel="View quotation" actions={incoming && row.status==='pending_approval'?<><QuotationDecision row={row} action="reject"/><QuotationDecision row={row} action="approve"/></>:row.canRecall?<QuotationDecision row={row} action="recall"/>:null}>
  <section className="space-y-2"><h3 className="text-sm font-semibold">What approval does</h3><p className="text-sm text-muted-foreground">Approves this quotation. Review its line items, prices and terms before deciding.</p></section>
  <dl className="grid gap-5 sm:grid-cols-2">
   <ApprovalFact label="Quotation total"><span className="text-2xl font-semibold tabular-nums">{formatMoney(row.total,row.currency)}</span></ApprovalFact>
   <ApprovalFact label="Customer / end user">{row.customerName}</ApprovalFact><ApprovalFact label="Bill to">{row.billToName}</ApprovalFact>
  </dl>
  <ApprovalRequestMetadata row={row} incoming={incoming}/>
  {row.rejectionReason?<section className="space-y-1"><h3 className="text-sm font-semibold">Rejection reason</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.rejectionReason}</p></section>:null}
  {!incoming?<p className="text-xs text-muted-foreground">The status above is the quotation’s current status. A rejected or recalled quotation returns to Draft.</p>:null}
 </ApprovalReviewFrame>
}
