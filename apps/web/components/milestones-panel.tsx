"use client"

import { MilestoneRowEditor } from "./milestone-row-editor"
import { BillingScheduleEditor } from "@/components/billing-schedule-editor"
import { type BillingScheduleInput } from "@/lib/billing-schedule"
import { RecordVoidButton } from "@/components/record-void-button"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Plus, SplitIcon} from "lucide-react"
import { MilestoneSplitDialog } from "@/components/milestone-split-dialog"
import { EmptyState } from "@/components/empty-state"

import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { showActionError } from "@/lib/show-action-error"

import { PaymentMilestoneTable, MilestoneAllocation } from "./payment-milestone-table"
import type { ActionResult } from "@/lib/action-result"
import type { paymentMilestoneStatus } from "@/db/schema"

export type MilestoneStatus = (typeof paymentMilestoneStatus.enumValues)[number]

/** The subset of a milestone row this panel needs — satisfied by both the
 *  project-scoped MilestoneItem and the funnel-scoped PaymentMilestoneRow. */
export type MilestoneItemBase = {
  id: string
  title: string
  /** Optional user-facing notes. Undefined for milestone shapes that don't carry it yet. */
  description?: string | null
  amount: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  dueDate: string | null
  status: MilestoneStatus
  sortOrder: number
}

export type MilestoneCreateValues = {
  title: string
  description?: string | null
  amount: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  dueDate: string | null
}

export type MilestoneUpdateValues = {
  title?: string
  description?: string | null
  amount?: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  dueDate?: string | null
  status?: string
}

/**
 * Shared readable milestone list + explicit expanded-row edit/add controls. Used for both
 * project-scoped milestones (app/(app)/projects/[id]/milestones-panel.tsx)
 * and funnel-scoped milestones (the funnel detail page's Payment Milestones
 * tab) — the parent supplies the create/update/reorder callbacks
 * already bound to its own id, so this component stays entity-agnostic.
 */
export function MilestonesPanel({
  milestones,
  valueCeiling,
  valueCeilingLabel = "net value, ex-tax",
  currency,
  canManage = true,
  onCreate,
  onUpdate,
  onReorder,
  onSplit,
  linkRecords = true,
  planHref,
  canEditPlan,
}: {
  canEditPlan?: boolean
  planHref?: string
  milestones: MilestoneItemBase[]
  linkRecords?: boolean
  /** The value the milestone amounts reconcile against (e.g. project/funnel net value), or null when unset. */
  valueCeiling: string | null
  /** Label for the ceiling in the footer, e.g. "net project value, ex-tax". */
  valueCeilingLabel?: string
  currency: string
  /** When false the panel is read-only: no inline edits, status changes,
   * reordering, or add-row (gated on the caller's manage permission). */
  canManage?: boolean
  onCreate: (values: MilestoneCreateValues) => Promise<ActionResult<unknown>>
  onUpdate: (id: string, values: MilestoneUpdateValues) => Promise<ActionResult<unknown>>
  onReorder: (order: string[]) => Promise<ActionResult<unknown>>
  /** Configure an empty schedule or split an uninvoiced full-value row. */
  onSplit?: (parts: { title: string; amount: string }[]) => Promise<ActionResult<unknown>>
}) {
  const permissions = usePermissions()
  const canRequestVoid = permissions.has(PERMISSIONS.PAYMENT_MILESTONE_MANAGE) && permissions.has(PERMISSIONS.PAYMENT_MILESTONE_VIEW)
  const showActions = canManage || canRequestVoid
  const router = useRouter()
  const [editingRow,setEditingRow] = React.useState<string|null>(null)
  const [adding, setAdding] = React.useState(false)
  const [newRows, setNewRows] = React.useState<BillingScheduleInput[]>([{ title: "", amount: "", expectedInvoiceMonth: "", expectedInvoiceYear: 0 }])
  const [splitRow, setSplitRow] = React.useState<MilestoneItemBase | null>(null)
  const [splitOpen, setSplitOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const value = valueCeiling ? Number(valueCeiling) : 0
  const hasValue = valueCeiling != null && valueCeiling !== ""
  const allocated = milestones.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  )

  // All contexts follow saved order. Reordering must not be silently overridden
  // by a due date (which is distinct from the expected invoice period).
  const sortedMilestones = React.useMemo(
    () => [...milestones].sort((a,b)=>a.sortOrder-b.sortOrder || a.id.localeCompare(b.id)),
    [milestones]
  )

  // Configure an empty schedule or split an uninvoiced full-value row.
  const canSplit =
    !planHref && !!onSplit &&
    hasValue &&
    value > 0 &&
    canManage &&
    (milestones.length === 0 || (
      milestones.length === 1 &&
      milestones[0].status !== "invoiced" &&
      Math.round((Number(milestones[0].amount) || 0) * 100) === Math.round(value * 100)
    ))

  function run(
    fn: () => Promise<ActionResult<unknown>>,
    success?: string
  ) {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) {
        showActionError(res)
        return
      }
      if (success) toast.success(success)
      router.refresh()
    })
  }

  /** Save via `run`, always resolving once the action settles (success or
   *  error, which `run` toasts) so inline editors never await a dead promise. */
  function save(fn: () => Promise<ActionResult<unknown>>) {
    return new Promise<void>((resolve) =>
      run(async () => {
        try {
          return await fn()
        } finally {
          resolve()
        }
      }, "Milestone updated")
    )
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= sortedMilestones.length) return
    const order = sortedMilestones.map((m) => m.id)
    ;[order[index], order[next]] = [order[next], order[index]]
    run(() => onReorder(order), "Milestones reordered")
  }

  // Add a blank row (like appending a quote line item): create a milestone
  // with sensible defaults, then the user edits it inline via the row's cell
  // editors. Title is required by onCreate, so seed it non-empty.
  function onAdd() { setAdding(true) }
  function createRows() {
    run(async () => {
      if (newRows.length !== 1) return { ok: false, error: "Add one milestone at a time." }
      const row = newRows[0]
      const result = await onCreate({ ...row, dueDate: null })
      if (result.ok) { setAdding(false); setNewRows([{ title: "", amount: "", expectedInvoiceMonth: "", expectedInvoiceYear: 0 }]) }
      return result
    }, "Milestone added")
  }

  return (
    <div className="grid gap-3">
      <MilestoneAllocation total={valueCeiling} scheduled={allocated} currency={currency} totalLabel={valueCeilingLabel.replace(/,? (ex-tax|excl\. tax)/g, "")}/>
      {canSplit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setSplitOpen(true)}
        >
          <SplitIcon className="size-4" />
          {milestones.length === 0 ? "Create payment schedule" : "Split payment"}
        </Button>
      ) : null}
      {milestones.length > 0 ? <PaymentMilestoneTable toolbar={planHref && (canEditPlan ?? canManage) ? <Button variant="outline" nativeButton={false} render={<Link href={planHref}/>} className="justify-self-end">Edit payment plan</Button> : null} rows={sortedMilestones} currency={currency} linkRecords={linkRecords} expandedId={editingRow} rowDetails={canManage && !planHref ? (_row,index)=>editingRow===sortedMilestones[index].id ? <MilestoneRowEditor key={editingRow} row={sortedMilestones[index]} currency={currency} onSave={patch=>onUpdate(sortedMilestones[index].id,patch)} onCancel={()=>{setEditingRow(null);router.refresh()}}/> : <Button variant="outline" size="sm" onClick={()=>setEditingRow(sortedMilestones[index].id)}>Edit milestone</Button> : undefined} actions={showActions ? (_row,index)=>{
        const m=sortedMilestones[index]
        return <RecordVoidButton target={{type:'payment_milestone',id:m.id}} allowVoid={canRequestVoid} allowRelated={false} actionLabel={`More actions for ${m.title}`} menuItems={canManage ? <>
          {!planHref ? <DropdownMenuItem disabled={pending} onClick={()=>setEditingRow(m.id)}>Edit milestone</DropdownMenuItem> : null}
          <DropdownMenuItem disabled={pending || index===0} onClick={()=>move(index,-1)}><ChevronUp/>Move up</DropdownMenuItem>
          <DropdownMenuItem disabled={pending || index===sortedMilestones.length-1} onClick={()=>move(index,1)}><ChevronDown/>Move down</DropdownMenuItem>
          {m.status==='pending_invoicing' ? <DropdownMenuItem disabled={pending} onClick={()=>save(()=>onUpdate(m.id,{status:'invoiced'}))}>Mark invoiced</DropdownMenuItem> : null}
          {onSplit && m.status!=='invoiced' && Number(m.amount)>0 ? <DropdownMenuItem disabled={pending} onClick={()=>setSplitRow(m)}>Split milestone</DropdownMenuItem> : null}
        </> : undefined}/>

      } : undefined}/> : <EmptyState title="Payment schedule not configured" className="px-2 py-5"/>}

      {adding ? <div className="grid gap-2 rounded border p-3"><BillingScheduleEditor allowRowChanges={false} expandInitially currency={currency} rows={newRows} onChange={setNewRows} disabled={pending}/><div className="flex gap-2"><Button disabled={pending || newRows.length !== 1} onClick={createRows}>Save milestone</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div></div> : null}
      {canManage && !planHref ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={pending}
          onClick={onAdd}
        >
          <Plus className="size-4" />
          Add milestone
        </Button>
      ) : null}

      {splitRow ? <MilestoneSplitDialog open onOpenChange={open => { if (!open) setSplitRow(null) }} targetAmount={Number(splitRow.amount)} currency={currency} onSplit={async parts => { const { splitPaymentMilestone } = await import("@/app/(app)/payment-milestones/actions"); const result = await splitPaymentMilestone(splitRow.id, parts); if (result.ok) router.refresh(); return result }} /> : null}
      {onSplit ? (
        <MilestoneSplitDialog
          open={splitOpen}
          onOpenChange={setSplitOpen}
          targetAmount={value}
          currency={currency}
          onSplit={async (parts) => {
            const res = await onSplit(parts)
            if (res.ok) router.refresh()
            return res
          }}
        />
      ) : null}
    </div>
  )
}
