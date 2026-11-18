"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PencilIcon, PlusIcon } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { BILLING_MONTHS, validateBillingSchedule, quotationItemAllocations, billingRowsFromQuotationItems, validateQuotationItemAllocation, type BillingScheduleInput } from "@/lib/billing-schedule"
import { prepareQuotationBillingSchedule } from "@/app/(app)/payment-milestones/actions"
import { BillingScheduleEditor, type ScheduleErrors } from "./billing-schedule-editor"
import { useUnsavedChanges } from "./use-unsaved-changes"
import { Button } from "./ui/button"
import { MilestoneAllocation } from "./payment-milestone-table"

type ScheduleRow = BillingScheduleInput & { id?: string; status?: string; description?: string | null; dueDate?: string | null }
function draftRows(rows: ScheduleRow[]): ScheduleRow[] {
  return rows.map(row => ({ ...row }))
}

export function QuotationBillingSchedule({ quotationId, initial, lines, canManage, currency, netValue, dateOnly = false }: {
  quotationId: string
  initial: ScheduleRow[]
  lines: { id: string; description: string; lineSubtotal: string | null }[]
  canManage: boolean
  currency: string
  netValue: string
  dateOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [submitted, setSubmitted] = useState(false)
  const container = useRef<HTMLElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (editing) container.current?.querySelector<HTMLElement>('[data-schedule-field]:not(:disabled)')?.focus() }, [editing])
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()
  const locked = dateOnly || initial.some(row => row.status === "invoiced")
  const displayed = editing ? rows : initial
  const scheduled = displayed.reduce((sum, row) => sum + Math.round(Number(row.amount || 0) * 100), 0) / 100
  const remaining = (Math.round(Number(netValue) * 100) - Math.round(scheduled * 100)) / 100

  const items = quotationItemAllocations(lines, netValue)
  const dirty = JSON.stringify(rows) !== JSON.stringify(draftRows(initial))
  const confirmDiscard=useUnsavedChanges(editing && dirty,pending)
  const fieldErrors: ScheduleErrors = {}
  if (submitted) rows.forEach((row, index) => {
    const issues: ScheduleErrors[number] = {}
    if (!row.title.trim()) issues.title = `Row ${index + 1}: enter a milestone title.`
    if (!Number.isFinite(Number(row.amount)) || !/^\d+(\.\d{1,2})?$/.test(row.amount) || Number(row.amount) <= 0) issues.amount = `Row ${index + 1}: enter a positive amount in cents.`
    if (!(BILLING_MONTHS as readonly string[]).includes(row.expectedInvoiceMonth) || !Number.isInteger(row.expectedInvoiceYear) || row.expectedInvoiceYear < 1900 || row.expectedInvoiceYear > 9999) issues.period = `Row ${index + 1}: select month and enter a valid year.`
    if (Object.keys(issues).length) fieldErrors[index] = issues
  })
  function finishEdit() { setEditing(false); setError(""); setSubmitted(false); requestAnimationFrame(() => editButton.current?.focus()) }
  function beginEdit() {
    setRows(initial.length ? draftRows(initial) : billingRowsFromQuotationItems(items))
    setError("")
    setSubmitted(false)
    setEditing(true)
  }
  function save() {
    setError("")
    setSubmitted(true)
    try {
      validateBillingSchedule(rows)
      validateQuotationItemAllocation(rows, items)
      if (remaining !== 0) throw new Error(`Milestones must equal the quotation net. ${formatMoney(Math.abs(remaining),currency)} is ${remaining>0?'still unallocated':'over allocated'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the milestones.")
      requestAnimationFrame(() => container.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    start(async () => {
      const result = await prepareQuotationBillingSchedule(quotationId, rows)
      if (!result.ok) { setError(result.error || "Could not save the payment milestones."); return }
      finishEdit()
      toast.success("Payment milestones saved")
      router.refresh()
    })
  }

  return <section ref={container} className="grid gap-3 rounded-lg border bg-card p-4 sm:p-5" aria-labelledby="quotation-milestones-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1"><h2 id="quotation-milestones-heading" className="font-semibold">Payment Milestones</h2></div>
      {canManage && !editing ? <Button disabled={!initial.length && !items.some(item=>Number(item.billingAmount)>0)} ref={editButton} variant="outline" onClick={beginEdit}>{initial.length ? <PencilIcon /> : <PlusIcon />}{initial.length ? "Edit payment plan" : "Create payment plan"}</Button> : null}
      {editing ? <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "No changes"}</span><Button variant="outline" disabled={pending} onClick={()=>{if(confirmDiscard())finishEdit()}}>Cancel</Button><Button disabled={pending || !dirty || remaining !== 0} onClick={save}>{pending ? "Saving…" : "Save payment plan"}</Button></div> : null}
    </div>
    <MilestoneAllocation total={netValue} scheduled={scheduled} currency={currency} totalLabel="Quotation net"/>
    {editing && remaining!==0 ? <p role="status" className="text-sm text-warning">{remaining>0?"Allocate the remaining amount to save.":"Reduce the allocation to save."}</p> : null}
    {locked ? <p className="text-sm text-muted-foreground">Invoice history is preserved. Only forecast month and year can be corrected.</p> : null}
    {displayed.length || editing ? <>
      <BillingScheduleEditor quotationId={quotationId} currency={currency} rows={displayed} onChange={next => { setRows(next); setError("") }} lines={items} disabled={pending} dateOnly={locked} readOnly={!editing} errors={fieldErrors}/>
      {editing && Object.keys(fieldErrors).length ? <p role="alert" className="text-sm text-destructive">Correct the highlighted billing rows before saving.</p> : null}
      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
    </> : <p className="py-6 text-center text-sm text-muted-foreground">No payment milestones yet. Create a plan for this quotation.</p>}
  </section>
}
