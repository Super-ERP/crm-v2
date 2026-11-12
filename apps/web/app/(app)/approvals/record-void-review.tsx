"use client"
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VoidImpactDetails } from '@/components/record-void-button'
import type { VoidImpact } from '@/lib/record-void'
import { previewRecordVoid,decideUniversalVoid,type UniversalVoidRow } from '@/app/(app)/record-void-actions'
import { ApprovalReviewFrame } from './approval-review-parts'
import { formatDate } from '@/lib/format'

export function RecordVoidReview({row,incoming}:{row:UniversalVoidRow;incoming:boolean}) {
 const router=useRouter(),id=React.useId()
 const [impact,setImpact]=React.useState<VoidImpact|null>(null),[error,setError]=React.useState(''),[note,setNote]=React.useState(''),[busy,setBusy]=React.useState(false),[loading,setLoading]=React.useState(incoming&&row.status==='pending'),[refresh,setRefresh]=React.useState(0)
 React.useEffect(()=>{
  if(!incoming||row.status!=='pending')return
  let active=true
  void previewRecordVoid({type:row.entityType,id:row.entityId}).then(value=>{if(active){if(value.ok)setImpact(value.data);else setError(value.error)}}).catch(err=>{if(active)setError(err instanceof Error?err.message:'Cannot load current impact. You can reject with a note.')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[incoming,row.entityType,row.entityId,row.status,refresh])
 async function decide(approve:boolean) {
  if(busy||approve&&!impact)return
  setBusy(true);setError('')
  try {
   const result=await decideUniversalVoid({requestId:row.id,approve,note,fingerprint:approve?impact!.fingerprint:undefined})
   if(!result.ok){setError(result.error);return}
   toast.success(approve?'Record voided':'Void request rejected');router.refresh()
  }catch{setError('Could not save the decision. Refresh the impact and try again.')}
  finally{setBusy(false)}
 }
 return <ApprovalReviewFrame kind="record_void" title={row.impact.target.label} status={row.status} recordHref={row.status==='approved'?'/approvals?tab=mine':row.impact.target.href??'/approvals?tab=mine'} recordLabel={row.status==='approved'||!row.impact.target.href?'Request history':'Open record'} actions={incoming&&row.status==='pending'?<><Button variant="outline" disabled={busy||!note.trim()} onClick={()=>void decide(false)}>Reject</Button><Button variant="destructive" disabled={busy||loading||!impact||!!impact.blockers.length} onClick={()=>void decide(true)}>{busy?'Saving…':'Approve void'}</Button></>:undefined}>
 <div><p className="text-sm font-medium">Reason</p><p className="whitespace-pre-wrap text-sm">{row.reason}</p></div>
 <p className="text-sm text-muted-foreground">Requested by {row.requesterName??'Unknown'} · {formatDate(row.requestedAt)}</p>
 {row.decidedAt?<p className="text-sm">Decided by {row.deciderName??'Reviewer'} · {formatDate(row.decidedAt)}</p>:null}
 {row.decisionNote?<p className="whitespace-pre-wrap text-sm">{row.decisionNote}</p>:null}
 {incoming&&row.status==='pending'?<><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Current impact</p><Button size="sm" variant="outline" disabled={busy||loading} onClick={()=>{setLoading(true);setImpact(null);setError('');setRefresh(value=>value+1)}}>Refresh impact</Button></div>{loading?<p role="status" className="text-sm">Checking linked records…</p>:impact?<VoidImpactDetails impact={impact}/>:null}<label htmlFor={id} className="grid gap-2 text-sm">Decision note (required to reject)<Textarea id={id} value={note} maxLength={1000} disabled={busy} onChange={event=>setNote(event.target.value)}/></label></>:<VoidImpactDetails impact={row.impact}/>}
 {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
 </ApprovalReviewFrame>
}
