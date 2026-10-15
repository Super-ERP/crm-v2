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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { approveQuotation, rejectQuotation, recallQuotation } from "@/app/(app)/quotations/actions"
import { showActionError } from "@/lib/show-action-error"
import { formatDate, formatMoney } from "@/lib/format"
import type { QuotationApprovalRow } from "./quotation-actions"

function QuotationDecision({ row, action }: { row: QuotationApprovalRow; action: "approve" | "reject" | "recall" }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  const label = action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Recall to Draft"
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger render={<Button size="sm" variant={action === "approve" ? "default" : "outline"}>{label}</Button>} />
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{label} quotation</AlertDialogTitle>
        <AlertDialogDescription>{row.quoteNumber}{action === "approve" ? " will be approved." : " will return to Draft for editing."}</AlertDialogDescription>
      </AlertDialogHeader>
      {action === "reject" ? <div className="grid gap-2">
        <Label htmlFor={`reject-${row.id}`}>Rejection reason (required)</Label>
        <Textarea id={`reject-${row.id}`} value={reason} onChange={e => setReason(e.target.value)} rows={3} />
      </div> : null}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={pending || (action === "reject" && !reason.trim())} onClick={e => {
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
  return <Card><CardContent className="flex flex-col gap-3 py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1"><span className="font-medium">{row.quoteNumber}</span><span className="text-sm text-muted-foreground">{row.funnelName}</span></div>
      <div className="flex gap-2"><Badge variant="outline">Quotation</Badge><Badge variant="secondary" className="capitalize">{row.status.replaceAll("_", " ")}</Badge></div>
    </div>
    <dl className="grid gap-1 text-sm">
      <div><dt className="inline text-muted-foreground">Customer: </dt><dd className="inline">{row.customerName}</dd></div>
      <div><dt className="inline text-muted-foreground">Bill To: </dt><dd className="inline">{row.billToName}</dd></div>
      <div><dt className="inline text-muted-foreground">Total: </dt><dd className="inline">{formatMoney(row.total, row.currency)}</dd></div>
    </dl>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Requested by {row.requesterName ?? "Unknown"}</span>
      <span>Requested {formatDate(row.requestedAt)}</span>
      {!incoming ? <span>Approver {row.approverName ?? "Unrouted"}</span> : null}
      {row.decidedAt ? <span>Decided {formatDate(row.decidedAt)}</span> : null}
    </div>
    {row.rejectionReason ? <p className="text-sm text-muted-foreground">Rejection reason: {row.rejectionReason}</p> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" render={<Link href={`/quotations/${row.id}`} />}>View quotation</Button>
      {incoming ? <><QuotationDecision row={row} action="reject" /><QuotationDecision row={row} action="approve" /></>
        : row.canRecall ? <QuotationDecision row={row} action="recall" /> : null}
    </div>
  </CardContent></Card>
}
