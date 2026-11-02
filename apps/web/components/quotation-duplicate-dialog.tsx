"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { getQuotationFormMeta, listOpportunityOptions } from "@/app/(app)/quotations/actions"

type Destination = {funnelId:string;billToAccountId:string|null;attentionContactId:string|null}
export function QuotationDuplicateDialog({funnelId,currency,billToAccountId,attentionContactId,onCreate,disabled}: {
  funnelId:string;currency:string;billToAccountId:string|null;attentionContactId:string|null;
  onCreate:(destination:Destination)=>Promise<void>;disabled?:boolean
}) {
  const controlId=React.useId()
  const [open,setOpen]=React.useState(false)
  const [target,setTarget]=React.useState(funnelId)
  const [billTo,setBillTo]=React.useState(billToAccountId ?? "__funnel__")
  const [attention,setAttention]=React.useState(attentionContactId ?? "__none__")
  const [options,setOptions]=React.useState<{id:string;name:string;currency:string}[]>([])
  const [meta,setMeta]=React.useState<Awaited<ReturnType<typeof getQuotationFormMeta>>|null>(null)
  const [loading,setLoading]=React.useState(false)
  const [busy,setBusy]=React.useState(false)
  const [failed,setFailed]=React.useState(false)
  React.useEffect(()=>{
    if(!open)return
    let active=true
    listOpportunityOptions().then(rows=>{if(active)setOptions(rows.filter(row=>row.currency===currency))}).catch(()=>{if(active)toast.error("Could not load funnels")})
    return ()=>{active=false}
  },[open,currency])
  React.useEffect(()=>{
    if(!open)return
    let active=true
    getQuotationFormMeta(target,billTo==='__funnel__'?null:billTo).then(value=>{
      if(!active)return
      setMeta(value)
      setAttention(current=>value.contacts.some(contact=>contact.id===current)?current:'__none__')
    }).catch(()=>{if(active){setFailed(true);toast.error("Could not load billing contacts. Select a valid Bill To account.")}}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[open,target,billTo])
  return <Dialog open={open} onOpenChange={next=>{if(busy)return;if(next){setOptions([]);setLoading(true);setFailed(false);setMeta(null);setTarget(funnelId);setBillTo(billToAccountId??'__funnel__');setAttention(attentionContactId??'__none__')}setOpen(next)}}>
    <DialogTrigger render={<Button variant="outline" disabled={disabled}>Duplicate</Button>}/>
    <DialogContent>
      <DialogHeader><DialogTitle>Duplicate quotation</DialogTitle><DialogDescription>Create an independent draft with a new quotation number. Products, prices and terms are copied. Approval history and expiry are reset.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><label htmlFor={`${controlId}-funnel`} className="text-sm font-medium">Destination funnel</label><Combobox id={`${controlId}-funnel`} value={target} onChange={value=>{setLoading(true);setFailed(false);setMeta(null);setTarget(value);setBillTo('__funnel__');setAttention('__none__')}} options={options.map(row=>({value:row.id,label:`${row.name}${row.id===funnelId?' (same funnel)':''}`}))} placeholder="Choose funnel"/></div>
        <p className="text-xs text-muted-foreground">Only accessible funnels in {currency} are available.</p>
        <div className="space-y-2"><label htmlFor={`${controlId}-bill-to`} className="text-sm font-medium">Bill To</label><Combobox id={`${controlId}-bill-to`} value={billTo} onChange={value=>{setLoading(true);setFailed(false);setMeta(null);setBillTo(value);setAttention('__none__')}} options={[{value:'__funnel__',label:'End customer (destination funnel)'},...(meta?.billToAccounts??[]).map(account=>({value:account.id,label:account.name}))]} placeholder="Choose Bill To"/></div>
        <div className="space-y-2"><label htmlFor={`${controlId}-attention`} className="text-sm font-medium">Attention</label><Combobox id={`${controlId}-attention`} value={attention} onChange={setAttention} options={[{value:'__none__',label:'Select later'},...(meta?.contacts??[]).map(contact=>({value:contact.id,label:contact.name}))]} placeholder="Choose contact"/></div>
        {loading?<p className="text-sm text-muted-foreground">Loading billing details…</p>:null}
        {failed?<p role="alert" className="text-sm text-destructive">Billing details unavailable. Choose the end customer or another available Bill To account.</p>:null}
      </div>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy||loading||failed||!meta||!options.some(row=>row.id===target)} onClick={async()=>{setBusy(true);try{await onCreate({funnelId:target,billToAccountId:billTo==='__funnel__'?null:billTo,attentionContactId:attention==='__none__'?null:attention})}finally{setBusy(false)}}}>{busy?'Creating…':'Create duplicate'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
