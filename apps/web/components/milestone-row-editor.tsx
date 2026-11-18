"use client"
import {useState,useTransition} from 'react'
import {BillingScheduleEditor} from './billing-schedule-editor'
import {Button} from './ui/button'
import type {MilestoneItemBase,MilestoneUpdateValues} from './milestones-panel'
import type {ActionResult} from '@/lib/action-result'
import {validateBillingSchedule,type BillingScheduleInput} from '@/lib/billing-schedule'
export function MilestoneRowEditor({row,currency,onSave,onCancel}:{row:MilestoneItemBase;currency:string;onSave:(patch:MilestoneUpdateValues)=>Promise<ActionResult<unknown>>;onCancel:()=>void}) {
 const [rows,setRows]=useState<BillingScheduleInput[]>([{id:row.id,title:row.title,amount:row.amount??'',expectedInvoiceMonth:row.expectedInvoiceMonth??'',expectedInvoiceYear:row.expectedInvoiceYear??0,description:row.description,dueDate:row.dueDate}])
 const [error,setError]=useState('');const [pending,start]=useTransition()
 return <div className="grid gap-3 py-2"><BillingScheduleEditor expandInitially allowRowChanges={false} rows={rows} onChange={setRows} currency={currency} disabled={pending} dateOnly={row.status==='invoiced'}/>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}<div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>Cancel</Button><Button size="sm" disabled={pending||rows.length!==1} onClick={()=>{try{validateBillingSchedule(rows)}catch(e){setError(e instanceof Error?e.message:'Check the milestone');return}start(async()=>{const next=rows[0];const period={expectedInvoiceMonth:next.expectedInvoiceMonth,expectedInvoiceYear:next.expectedInvoiceYear};const result=await onSave(row.status==='invoiced'?period:{title:next.title,dueDate:next.dueDate||null,description:next.description||null,amount:next.amount,...period});if(!result.ok)setError(result.error);else onCancel()})}}>Save milestone</Button></div></div>
}
