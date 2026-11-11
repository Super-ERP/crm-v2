"use client"
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger,DialogFooter } from '@/components/ui/dialog'
import { previewRecordVoid,submitRecordVoid } from '@/app/(app)/voids/actions'
import type { VoidTarget,VoidImpact } from '@/lib/record-void'

export function VoidImpactDetails({impact}:{impact:VoidImpact}) {
 return <div className="grid gap-3 text-sm"><p className="font-medium">{impact.target.label}</p>{impact.target.amount&&impact.target.currency?<p>{impact.target.amount} {impact.target.currency}</p>:null}<ul className="list-disc space-y-1 pl-5">{impact.effects.map(effect=><li key={effect}>{effect}</li>)}</ul>{impact.blockers.length?<div className="rounded-md border p-3"><p className="font-medium">Resolve before approval</p><ul className="list-disc space-y-1 pl-5">{impact.blockers.map((blocker,index)=><li key={`${blocker.code}-${index}`}>{blocker.message}</li>)}</ul></div>:null}</div>
}
export function RecordVoidButton({target}:{target:VoidTarget}) {
 const router=useRouter()
 const [open,setOpen]=React.useState(false),[impact,setImpact]=React.useState<VoidImpact|null>(null),[reason,setReason]=React.useState(''),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[loading,setLoading]=React.useState(false)
 const key=JSON.stringify(target),id=React.useId()
 React.useEffect(()=>{
  if(!open)return
  let active=true
  void previewRecordVoid(JSON.parse(key)).then(value=>{if(active){if(value.ok)setImpact(value.data);else setError(value.error)}}).catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to preview this record')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[open,key])
 async function submit(event:React.FormEvent) {
  event.preventDefault()
  if(!impact||busy)return
  setBusy(true);setError('')
  try {
   const result=await submitRecordVoid({target,reason,fingerprint:impact.fingerprint})
   if(!result.ok){setError(result.error);return}
   toast.success('Void request sent for review');setOpen(false);router.push('/approvals?tab=mine');router.refresh()
  }catch{setError('Could not submit the request. Reopen to refresh the impact and try again.')}
  finally{setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={next=>{if(!busy){setOpen(next);if(next){setReason('');setImpact(null);setLoading(true);setError('')}}}}><DialogTrigger render={<Button variant="outline"/>}>Void</DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Request to void</DialogTitle><DialogDescription>Review the impact and enter a reason. Nothing changes until an authorised reviewer approves.</DialogDescription></DialogHeader><form id={id} className="grid gap-4" onSubmit={submit}>{loading?<p role="status">Loading impact…</p>:impact?<VoidImpactDetails impact={impact}/>:null}<label className="grid gap-2 text-sm">Reason<Textarea required value={reason} maxLength={1000} disabled={busy} onChange={event=>setReason(event.target.value)}/></label>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}</form><DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" form={id} disabled={busy||loading||!impact||!reason.trim()}>{busy?'Submitting…':'Submit request'}</Button></DialogFooter></DialogContent></Dialog>
}
