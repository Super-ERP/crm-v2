"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDownIcon, CircleCheckIcon } from "lucide-react"
import { formatDate, formatMoney } from "@/lib/format"
import { StatusBadge } from "./status-badge"
import { Button } from "./ui/button"
import { DataTable } from "./data-table"
import type { ColumnDef } from "@tanstack/react-table"

export type PaymentMilestoneTableRow = {
  id: string; title: string; amount: string | null; status: string
  expectedInvoiceMonth?: string | null; expectedInvoiceYear?: number | null
  description?: string | null; dueDate?: string | null; quotationLineItemId?: string | null;quotationItemDescription?:string|null;quotationId?:string|null;quoteNumber?:string|null
}
/** One read presentation; mutation/eligibility policy stays with its caller. */
export function PaymentMilestoneTable({rows,currency,lines=[],actions,rowDetails,expandedId,linkRecords=true,toolbar}:{rows:PaymentMilestoneTableRow[];currency:string;lines?:{id:string;description:string}[];actions?:(row:PaymentMilestoneTableRow,index:number)=>ReactNode;rowDetails?:(row:PaymentMilestoneTableRow,index:number)=>ReactNode;expandedId?:string|null;linkRecords?:boolean;toolbar?:ReactNode}) {
  const [expanded,setExpanded]=useState<string[]>([])
  const showSource=lines.length>0 || rows.some(row=>row.quotationItemDescription || row.quoteNumber)
  const columns: ColumnDef<PaymentMilestoneTableRow>[] = [
    {accessorKey:'title',header:'Milestone',cell:({row:{original:row}})=>{
      const open=expanded.includes(row.id)||expandedId===row.id
      return <div className="flex min-w-0 items-center gap-1">{linkRecords?<Link href={`/payment-milestones/${row.id}`} className="link min-w-0 font-medium">{row.title}</Link>:<span className="min-w-0">{row.title}</span>}{row.description||row.dueDate||rowDetails?<Button variant="ghost" size="icon-sm" className="shrink-0" disabled={expandedId===row.id} aria-label={`${open?'Hide':'Show'} details for ${row.title}`} aria-expanded={open} onClick={()=>setExpanded(ids=>open?ids.filter(id=>id!==row.id):[...ids,row.id])}><ChevronDownIcon className={`size-3.5 ${open?'rotate-180':''}`}/></Button>:null}</div>
    }},
    ...(showSource ? [{id:'quotationItemDescription',accessorFn:(row:PaymentMilestoneTableRow)=>lines.find(line=>line.id===row.quotationLineItemId)?.description||row.quotationItemDescription||'Whole quotation',header:'Quotation item',cell:({row:{original:row},getValue}: import('@tanstack/react-table').CellContext<PaymentMilestoneTableRow,unknown>)=><div className="whitespace-normal text-muted-foreground">{String(getValue())}{row.quoteNumber&&row.quotationId?<div className="mt-1 text-xs"><Link className="link" href={`/quotations/${row.quotationId}?tab=milestones`}>{row.quoteNumber}</Link></div>:null}</div>}] : []),
    {id:'expectedInvoice',accessorFn:row=>row.expectedInvoiceMonth&&row.expectedInvoiceYear?`${row.expectedInvoiceYear}-${String(['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(row.expectedInvoiceMonth)+1).padStart(2,'0')}`:'',header:'Expected invoice',cell:({row:{original:row}})=> <span className="whitespace-nowrap">{row.expectedInvoiceMonth&&row.expectedInvoiceYear?`${row.expectedInvoiceMonth} ${row.expectedInvoiceYear}`:'Not set'}</span>},
    {accessorKey:'amount',header:`Amount (${currency})`,cell:({row:{original:row}})=><span className="block whitespace-nowrap text-right tabular-nums">{formatMoney(row.amount,currency)}</span>},
    {accessorKey:'status',header:'Status',cell:({row:{original:row}})=><StatusBadge status={row.status}/>},
    ...(actions?[{id:'actions',header:'',enableSorting:false,enableHiding:false,cell:({row:{original:row}}:import('@tanstack/react-table').CellContext<PaymentMilestoneTableRow,unknown>)=>actions(row,rows.findIndex(item=>item.id===row.id))}]:[]),
  ]
  return <DataTable toolbar={toolbar} columns={columns} data={rows} tableId={linkRecords?'funnel-milestones':'project-milestones'} searchColumn="title" searchPlaceholder="Search milestones…" pageSize={5} fieldCurrencies={{amount:currency}} renderRowDetails={row=>{
    if(!expanded.includes(row.id)&&expandedId!==row.id)return null
    return <>{rowDetails?.(row,rows.findIndex(item=>item.id===row.id))}<dl className="grid gap-3 py-2 text-sm sm:grid-cols-2">{row.description?<div><dt className="text-muted-foreground">Remarks</dt><dd className="mt-1 whitespace-pre-wrap">{row.description}</dd></div>:null}{row.dueDate?<div><dt className="text-muted-foreground">Payment due date</dt><dd className="mt-1">{formatDate(row.dueDate)}</dd></div>:null}</dl></>
  }}/>

}

export function MilestoneAllocation({total,scheduled,currency,totalLabel='Net value'}:{total:string|number|null;scheduled:number;currency:string;totalLabel?:string}) {
 const hasTotal=total!==null && total!==''
 const remaining=hasTotal?(Math.round(Number(total)*100)-Math.round(scheduled*100))/100:null
 return <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md bg-muted/30 px-3 py-2.5">
   <dl className="flex flex-1 flex-wrap gap-x-8 gap-y-3 text-sm">
     {hasTotal ? <div><dt className="text-xs text-muted-foreground">{totalLabel} · excl. tax</dt><dd className="mt-0.5 font-medium tabular-nums">{formatMoney(total,currency)}</dd></div> : null}
     <div><dt className="text-xs text-muted-foreground">Scheduled</dt><dd className="mt-0.5 font-medium tabular-nums">{formatMoney(scheduled,currency)}</dd></div>
     {remaining!==null ? <div role="status"><dt className="text-xs text-muted-foreground">{remaining<0?'Over allocated':'Remaining'}</dt><dd className={`mt-0.5 flex items-center gap-1.5 font-medium tabular-nums ${remaining===0?'text-success':remaining<0?'text-destructive':'text-foreground'}`}>{remaining===0?<CircleCheckIcon className="size-4" aria-label="Fully allocated"/>:null}{formatMoney(Math.abs(remaining),currency)}</dd></div> : null}
   </dl>
 </div>
}
