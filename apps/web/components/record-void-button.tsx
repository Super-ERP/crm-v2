"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { previewRecordVoid,submitRecordVoid,listRelatedVoidRecords } from '@/app/(app)/record-void-actions'
import { VOID_ENTITY_LABELS, type VoidTarget,type VoidImpact,type VoidRecord } from '@/lib/record-void'
import type { RelatedVoidCursor } from '@/server/services/related-void-records'

export function VoidImpactDetails({impact}:{impact:VoidImpact}) {
 return <div className="grid gap-3 text-sm"><p className="font-medium">{impact.target.label}</p>{impact.target.amount&&impact.target.currency?<p>{impact.target.amount} {impact.target.currency}</p>:null}<ul className="list-disc space-y-1 pl-5">{impact.effects.map(effect=><li key={effect}>{effect}</li>)}</ul>{impact.blockers.length?<div className="rounded-md border p-3"><p className="font-medium">Resolve before approval</p><ul className="list-disc space-y-1 pl-5">{impact.blockers.map((blocker,index)=><li key={`${blocker.code}-${index}`}>{blocker.message}</li>)}</ul></div>:null}</div>
}

/** Record-local More menu. The same reviewed Void dialog handles every target. */
export function RecordVoidButton({target,allowVoid=true,allowRelated=target.type==='account'||target.type==='funnel'}:{target:VoidTarget;allowVoid?:boolean;allowRelated?:boolean}) {
 const router=useRouter()
 const [open,setOpen]=React.useState(false)
 const [dialogTarget,setDialogTarget]=React.useState(target)
 const [impact,setImpact]=React.useState<VoidImpact|null>(null)
 const [reason,setReason]=React.useState(''),[error,setError]=React.useState('')
 const [busy,setBusy]=React.useState(false),[loading,setLoading]=React.useState(false)
 const [relatedOpen,setRelatedOpen]=React.useState(false),[relatedLoading,setRelatedLoading]=React.useState(false)
 const [related,setRelated]=React.useState<{rows:VoidRecord[];nextCursor:RelatedVoidCursor|null}>({rows:[],nextCursor:null})
 const [relatedError,setRelatedError]=React.useState(''),[retry,setRetry]=React.useState(0)
 const [cursors,setCursors]=React.useState<Array<RelatedVoidCursor|undefined>>([undefined])
 const [page,setPage]=React.useState(0)
 const openingChild=React.useRef(false),moreButton=React.useRef<HTMLButtonElement>(null)
 const key=JSON.stringify(dialogTarget),parentKey=JSON.stringify(target),id=React.useId()
 const after=cursors[page]
 function openVoid(next:VoidTarget) {
  setDialogTarget({type:next.type,id:next.id});setReason('');setImpact(null);setLoading(true);setError('');setOpen(true)
 }
 React.useEffect(()=>{
  if(!open)return
  let active=true
  void previewRecordVoid(JSON.parse(key)).then(value=>{if(active){if(value.ok)setImpact(value.data);else setError(value.error)}}).catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to preview this record')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[open,key])
 React.useEffect(()=>{
  if(!relatedOpen)return
  let active=true
  void listRelatedVoidRecords({parent:JSON.parse(parentKey),after}).then(value=>{
   if(!active)return
   if(value.ok)setRelated(value.data);else setRelatedError(value.error)
  }).catch(()=>{if(active)setRelatedError('Could not load related records.')}).finally(()=>{if(active)setRelatedLoading(false)})
  return()=>{active=false}
 },[relatedOpen,parentKey,after,retry])
 function showRelated() {
  openingChild.current=false;setCursors([undefined]);setPage(0);setRelated({rows:[],nextCursor:null});setRelatedError('');setRelatedLoading(true);setRelatedOpen(true)
 }
 function changePage(next:number) {
  setRelatedLoading(true);setRelatedError('');setPage(next)
 }
 async function submit(event:React.FormEvent) {
  event.preventDefault()
  if(!impact||busy)return
  setBusy(true);setError('')
  try {
   const result=await submitRecordVoid({target:dialogTarget,reason,fingerprint:impact.fingerprint})
   if(!result.ok){setError(result.error);return}
   toast.success('Void request sent for review');setOpen(false);router.push('/approvals?tab=mine');router.refresh()
  }catch{setError('Could not submit the request. Reopen to refresh the impact and try again.')}
  finally{setBusy(false)}
 }
 return <>
  <DropdownMenu>
   <DropdownMenuTrigger render={<Button ref={moreButton} variant="ghost" size="icon-sm" aria-label="More record actions" title="More record actions"/>}><MoreHorizontal className="size-4"/></DropdownMenuTrigger>
   <DropdownMenuContent align="end">
    {allowVoid?<DropdownMenuItem variant="destructive" onClick={()=>openVoid(target)}>Void…</DropdownMenuItem>:null}
    {allowRelated?<>{allowVoid?<DropdownMenuSeparator/>:null}<DropdownMenuItem onClick={showRelated}>Related records…</DropdownMenuItem></>:null}
   </DropdownMenuContent>
  </DropdownMenu>
  <Dialog open={open} onOpenChange={next=>{if(!busy)setOpen(next)}}>
   <DialogContent finalFocus={moreButton} className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Request to void</DialogTitle><DialogDescription>Review the impact and enter a reason. Nothing changes until an authorised reviewer approves.</DialogDescription></DialogHeader>
    <form id={id} className="grid gap-4" onSubmit={submit}>
     {loading?<p role="status">Loading impact…</p>:impact?<VoidImpactDetails impact={impact}/>:null}
     <label className="grid gap-2 text-sm">Reason<Textarea required value={reason} maxLength={1000} disabled={busy} onChange={event=>setReason(event.target.value)}/></label>
     {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
    </form>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" form={id} disabled={busy||loading||!impact||!reason.trim()}>{busy?'Submitting…':'Submit request'}</Button></DialogFooter>
   </DialogContent>
  </Dialog>
  <Dialog open={relatedOpen} onOpenChange={setRelatedOpen}>
   <DialogContent finalFocus={()=>openingChild.current?false:moreButton.current}>
    <DialogHeader><DialogTitle>Related records</DialogTitle><DialogDescription>Linked contracts, contract years and purchase costs. Review these here when they need correction.</DialogDescription></DialogHeader>
    {relatedLoading?<p role="status">Loading related records…</p>:relatedError?<div role="alert" className="grid gap-2 text-sm"><p>{relatedError}</p><Button variant="outline" onClick={()=>{setRelatedLoading(true);setRelatedError('');setRetry(value=>value+1)}}>Retry</Button></div>:<>
     {related.rows.length?<ul className="grid gap-3">{related.rows.map(row=><li key={`${row.type}:${row.id}`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b pb-3"><div className="min-w-0 text-sm [overflow-wrap:anywhere]"><p>{row.label}</p><p className="text-xs text-muted-foreground">{VOID_ENTITY_LABELS[row.type]}{row.status?` · ${row.status}`:''}</p></div><Button size="sm" variant="outline" onClick={()=>{openingChild.current=true;setRelatedOpen(false);openVoid(row)}}>Review void…</Button></li>)}</ul>:<p className="text-sm text-muted-foreground">No related records available to you.</p>}
    </>}
    <DialogFooter><Button variant="outline" onClick={()=>setRelatedOpen(false)}>Close</Button><div className="flex gap-2"><Button size="sm" variant="outline" disabled={relatedLoading||page===0} onClick={()=>changePage(page-1)}>Previous</Button><Button size="sm" variant="outline" disabled={relatedLoading||!!relatedError||!related.nextCursor} onClick={()=>{if(related.nextCursor){setCursors(current=>[...current.slice(0,page+1),related.nextCursor!]);changePage(page+1)}}}>Next</Button></div></DialogFooter>
   </DialogContent>
  </Dialog>
 </>
}
