"use client"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import { ApprovalReviewFrame } from "./approval-review-parts"
import { decideVoidRequest, type FunnelVoidApprovalRow } from "./void-actions"

export function VoidApprovalReview({ row, incoming }: { row: FunnelVoidApprovalRow; incoming: boolean }) {
 const router=useRouter()
 const [note,setNote]=React.useState("")
 const [busy,setBusy]=React.useState(false)
 const [error,setError]=React.useState("")
 async function decide(approve:boolean) {
  if(busy)return
  setBusy(true);setError("")
  try {
   const result=await decideVoidRequest({requestId:row.id,approve,note})
   if(!result.ok){setError(result.error);return}
   toast.success(approve?"Funnel void approved":"Void request rejected")
   router.refresh()
  } catch {setError("Could not save the decision. Try again.")}
  finally {setBusy(false)}
 }
 return <ApprovalReviewFrame kind="void" title={row.opportunityName} status={row.status} recordHref={`/funnel/${row.retainedFunnelId}`} recordLabel="Open funnel to keep" actions={incoming&&row.status==='pending'?<><Button variant="outline" disabled={busy||!note.trim()} onClick={()=>void decide(false)}>Reject</Button><Button variant="destructive" disabled={busy} onClick={()=>void decide(true)}>{busy?"Saving…":"Approve void"}</Button></>:undefined}>
  <p className="text-sm">Sales Admin review: approving archives this duplicate and its quotations. Linked financial or delivery records can block approval.</p>
  {row.status!=='approved'?<Link className="link text-sm" href={`/funnel/${row.funnelId}`} target="_blank">Review funnel to void</Link>:null}
  <p className="text-sm">Keep: <Link className="link" href={`/funnel/${row.retainedFunnelId}`} target="_blank">{row.retainedName}</Link></p>
  <div><p className="text-sm font-medium">Reason</p><p className="whitespace-pre-wrap text-sm">{row.reason}</p></div>
  <p className="text-sm text-muted-foreground">Requested by {row.requesterName??"Unknown"} · {formatDate(row.requestedAt)}</p>
  {row.decidedAt?<p className="text-sm">Decided by {row.deciderName??"Sales Admin"} · {formatDate(row.decidedAt)}</p>:null}
  {row.decisionNote?<p className="whitespace-pre-wrap text-sm">{row.decisionNote}</p>:null}
  {incoming&&row.status==='pending'?<div className="grid gap-2"><label className="text-sm font-medium" htmlFor={`void-note-${row.id}`}>Decision note (required to reject)</label><Textarea id={`void-note-${row.id}`} value={note} maxLength={1000} disabled={busy} onChange={event=>setNote(event.target.value)}/></div>:null}
  {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
 </ApprovalReviewFrame>
}
