"use client"

import { Fragment, useId, useState } from "react"
import Link from "next/link"
import { ChevronDownIcon, PlusIcon, Trash2Icon, SplitIcon, ExternalLinkIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { StatusBadge } from "./status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import { BILLING_MONTHS, type BillingScheduleInput } from "@/lib/billing-schedule"

type ScheduleRow = BillingScheduleInput & { status?: string; description?: string | null; dueDate?: string | null }
export type ScheduleErrors = Record<number, Partial<Record<"title" | "amount" | "period", string>>>
export function BillingScheduleEditor({ rows, onChange, lines = [], disabled = false, dateOnly = false, currency, allowRowChanges = true, readOnly = false, errors = {}, expandInitially = false, quotationId }: {
  rows: ScheduleRow[]; onChange: (rows: ScheduleRow[]) => void; lines?: { id: string; description: string; billingAmount?: string }[]
  disabled?: boolean; dateOnly?: boolean; currency?: string; allowRowChanges?: boolean; expandInitially?: boolean
  readOnly?: boolean; errors?: ScheduleErrors; quotationId?: string
}) {
  const [expanded, setExpanded] = useState<string[]>(()=>expandInitially?rows.map((row,index)=>row.id||`new-${index}`):[])
  const [removed, setRemoved] = useState<{ row: ScheduleRow; index: number } | null>(null)
  const [previousReadOnly, setPreviousReadOnly] = useState(readOnly)
  if (previousReadOnly !== readOnly) {
    setPreviousReadOnly(readOnly)
    if (readOnly) setRemoved(null)
  }
  const prefix = useId()
  const keyFor = (row: ScheduleRow, index: number) => row.id || `new-${index}`
  const allOpen = rows.length > 0 && rows.every((row, index) => expanded.includes(keyFor(row, index)))
  function update(index: number, patch: Partial<ScheduleRow>) { onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row)) }
  function focusRow(index: number) { requestAnimationFrame(() => document.getElementById(`${prefix}-${index}-title`)?.focus()) }
  function remove(index: number) {
    setRemoved({ row: rows[index], index }); onChange(rows.filter((_, i) => i !== index))
    requestAnimationFrame(() => document.getElementById(`${prefix}-undo`)?.focus())
  }
  return <fieldset disabled={disabled} className="grid min-w-0 gap-3 border-0 p-0">
    {rows.length > 1 ? <Button type="button" variant="ghost" size="sm" className="justify-self-end" aria-expanded={allOpen} onClick={() => setExpanded(allOpen ? [] : rows.map(keyFor))}>{allOpen ? "Collapse details" : "Expand details"}</Button> : null}
    <div className="min-w-0 rounded-lg border"><Table className="table-fixed min-w-[880px]">
      <colgroup><col className="w-10"/><col className="w-[24%]"/>{lines.length ? <col className="w-[25%]"/> : null}<col className="w-60"/><col className="w-40"/><col className="w-36"/><col className="w-28"/></colgroup>
      <TableHeader><TableRow><TableHead>#</TableHead><TableHead className="sticky left-0 z-10 bg-card">Milestone</TableHead>{lines.length ? <TableHead>Quotation item</TableHead> : null}<TableHead>Expected invoice</TableHead><TableHead className="text-right">Amount {currency ? `(${currency})` : ""}<span className="block text-xs font-normal text-muted-foreground">Excl. tax</span></TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Row actions</span></TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((row, index) => {
        const key = keyFor(row, index), open = expanded.includes(key), id = `${prefix}-${index}`
        const problem = errors[index] || {}
        return <Fragment key={key}><TableRow>
          <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="sticky left-0 z-10 bg-card"><div className="flex min-h-8 items-center">{readOnly ? row.id ? <Link className="link font-medium" href={`/payment-milestones/${row.id}`}>{row.title}</Link> : row.title : <Input id={`${id}-title`} data-schedule-field disabled={dateOnly} required aria-label={`Billing row ${index + 1} title`} aria-invalid={!!problem.title} aria-describedby={problem.title ? `${id}-title-error` : undefined} placeholder="Milestone title" value={row.title} onChange={e => update(index, { title: e.target.value })}/>}</div>{problem.title ? <p id={`${id}-title-error`} className="mt-1 text-xs text-destructive">{problem.title}</p> : null}</TableCell>
          {lines.length ? <TableCell>{readOnly ? quotationId ? <Link className="link" href={`/quotations/${quotationId}`}>{lines.find(line => line.id === row.quotationLineItemId)?.description || "Whole quotation"}</Link> : <span className="text-muted-foreground">{lines.find(line => line.id === row.quotationLineItemId)?.description || "Whole quotation"}</span> : <Select disabled={dateOnly} value={row.quotationLineItemId || null} onValueChange={value => update(index, { quotationLineItemId: value })}><SelectTrigger width="full" aria-label={`Billing row ${index + 1} quotation item`}><SelectValue>{lines.find(line => line.id === row.quotationLineItemId)?.description || "Select quotation item"}</SelectValue></SelectTrigger><SelectContent alignItemWithTrigger={false}>{lines.map((line, i) => <SelectItem key={line.id} value={line.id}><span className="whitespace-normal">{i + 1}. {line.description}</span></SelectItem>)}</SelectContent></Select>}</TableCell> : null}
          <TableCell>{readOnly ? <div className="flex min-h-8 items-center">{row.expectedInvoiceMonth && row.expectedInvoiceYear ? `${row.expectedInvoiceMonth} ${row.expectedInvoiceYear}` : "Not set"}</div> : <div className="grid grid-cols-[1fr_5rem] gap-2"><Select value={row.expectedInvoiceMonth || null} onValueChange={value => update(index, { expectedInvoiceMonth: value || "" })}><SelectTrigger width="full" id={`${id}-month`} data-schedule-field aria-required="true" aria-invalid={!!problem.period} aria-describedby={problem.period ? `${id}-period-error` : undefined} aria-label={`Billing row ${index + 1} invoice month`}><SelectValue placeholder="Month"/></SelectTrigger><SelectContent alignItemWithTrigger={false}>{BILLING_MONTHS.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent></Select><Input id={`${id}-year`} data-schedule-field required aria-label={`Billing row ${index + 1} invoice year`} aria-invalid={!!problem.period} aria-describedby={problem.period ? `${id}-period-error` : undefined} type="number" min="1900" max="9999" placeholder="YYYY" className="tabular-nums" value={row.expectedInvoiceYear || ""} onChange={e => update(index, { expectedInvoiceYear: Number(e.target.value) })}/></div>}{problem.period ? <p id={`${id}-period-error`} className="mt-1 text-xs text-destructive">{problem.period}</p> : null}</TableCell>
          <TableCell>{readOnly ? <div className="flex min-h-8 items-center justify-end tabular-nums">{formatMoney(row.amount, currency)}</div> : <Input id={`${id}-amount`} data-schedule-field required disabled={dateOnly} aria-label={`Billing row ${index + 1} amount excluding tax`} aria-invalid={!!problem.amount} aria-describedby={problem.amount ? `${id}-amount-error` : undefined} type="number" min="0.01" step="0.01" className="text-right tabular-nums" value={row.amount} onChange={e => update(index, { amount: e.target.value })}/>}{problem.amount ? <p id={`${id}-amount-error`} className="mt-1 text-xs text-destructive">{problem.amount}</p> : null}</TableCell>
          <TableCell><StatusBadge status={row.status || "pending_invoicing"}/></TableCell>
          <TableCell><div className="flex justify-end"><Button type="button" variant="ghost" size="icon-sm" aria-label={`${open ? "Hide" : "Show"} details for ${row.title || `row ${index + 1}`}`} aria-controls={`${id}-details`} aria-expanded={open} onClick={() => setExpanded(ids => open ? ids.filter(value => value !== key) : [...ids, key])}><ChevronDownIcon className={`size-4 ${open ? "rotate-180" : ""}`}/></Button>{!readOnly && !dateOnly && allowRowChanges ? <><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove row ${index + 1}`} onClick={() => remove(index)}><Trash2Icon className="size-3.5"/></Button><Button type="button" variant="ghost" size="icon-sm" disabled={!Number.isFinite(Number(row.amount)) || Math.round(Number(row.amount)*100)<2} aria-label={`Split row ${index+1}`} onClick={()=>{const cents=Math.round(Number(row.amount)*100),first=Math.floor(cents/2);onChange(rows.flatMap((item,i)=>i===index?[{...item,amount:(first/100).toFixed(2)},{...item,id:undefined,title:`${item.title} — instalment 2`,amount:((cents-first)/100).toFixed(2),status:"pending_invoicing",description:null,dueDate:null}]:[item]));focusRow(index+1)}}><SplitIcon className="size-3.5"/></Button></> : <span className="w-14"/>}</div></TableCell>
        </TableRow>{open ? <TableRow id={`${id}-details`}><TableCell colSpan={lines.length ? 7 : 6} className="bg-muted/20 py-3"><div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="grid min-w-0 gap-2 sm:col-span-2"><Label htmlFor={readOnly || dateOnly ? undefined : `${id}-remarks`}>Remarks</Label>{readOnly || dateOnly ? <p className="whitespace-pre-wrap">{row.description || "—"}</p> : <Textarea id={`${id}-remarks`} aria-label={`Billing row ${index+1} remarks`} maxLength={4000} rows={2} placeholder="Add remarks…" value={row.description ?? ""} onChange={event=>update(index,{description:event.target.value})}/>}</div>
            <div className="grid content-start gap-2"><Label htmlFor={readOnly || dateOnly ? undefined : `${id}-due`}>Payment due date</Label>{readOnly || dateOnly ? <p>{row.dueDate ? formatDate(row.dueDate) : "—"}</p> : <Input id={`${id}-due`} aria-label={`Billing row ${index+1} payment due date`} type="date" value={row.dueDate ?? ""} onChange={event=>update(index,{dueDate:event.target.value || null})}/>}</div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs sm:col-span-3">
              <span className="text-muted-foreground">{row.quotationLineItemId && lines.find(line=>line.id===row.quotationLineItemId)?.billingAmount ? `Item allocation: ${formatMoney(lines.find(line=>line.id===row.quotationLineItemId)?.billingAmount,currency)} · excl. tax` : ""}</span>
              <div className="flex flex-wrap gap-3">{row.id ? <Link className="link inline-flex items-center gap-1" href={`/payment-milestones/${row.id}`}>Open milestone<ExternalLinkIcon className="size-3" aria-hidden="true"/></Link> : null}{quotationId ? <Link className="link inline-flex items-center gap-1" href={`/quotations/${quotationId}`}>Open quotation<ExternalLinkIcon className="size-3" aria-hidden="true"/></Link> : null}</div>
            </div>
          </div></TableCell></TableRow> : null}</Fragment>
      })}</TableBody>
    </Table></div>
    {removed && !readOnly ? <div className="flex items-center gap-2 text-sm" role="status">Milestone removed.<Button id={`${prefix}-undo`} variant="link" size="sm" onClick={() => { const next = [...rows]; next.splice(removed.index, 0, removed.row); onChange(next); focusRow(removed.index); setRemoved(null) }}>Undo</Button></div> : null}
    {!readOnly && !dateOnly && allowRowChanges ? <Button type="button" variant="outline" className="justify-self-start" onClick={() => { onChange([...rows, { title: "", amount: "", expectedInvoiceMonth: "", expectedInvoiceYear: 0 }]); focusRow(rows.length) }}><PlusIcon/>Add milestone</Button> : null}
  </fieldset>
}
