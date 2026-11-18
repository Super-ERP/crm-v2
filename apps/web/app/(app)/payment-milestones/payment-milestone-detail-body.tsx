"use client"

import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import { CRM_TERMS } from "@/lib/crm-terminology"
import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import { BILLING_MONTHS } from "@/lib/billing-schedule"
import * as React from "react"
import { RecordHeaderActions } from "@/components/record-header-actions"
import { useRecordEditor } from "@/components/use-record-editor"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DetailAside,
  DetailCardHeader,
  FieldRow,
  FieldSection,
  RelatedCard,
  useSaveField,
} from "@/components/detail-page"
import { InlineValue } from "@/components/inline-value"
import { StagePathView, type PathStep } from "@/components/stage-path-view"
import { formatDate, formatMoney } from "@/lib/format"
import { paymentMilestoneStatus } from "@/db/schema"
import {
  updateFunnelMilestone,
  type FunnelMilestoneUpdateInput,
  type PaymentMilestoneDetail,
} from "./actions"

const STATUS_ORDER = paymentMilestoneStatus.enumValues
const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  pending_invoicing: "Pending invoicing",
  invoiced: "Invoiced",
}

/** Planning-only milestone detail. Finance documents are intentionally absent. */
export function PaymentMilestoneDetailBody({
  milestone: initial,
  canManage,
  canVoid,
}: {
  milestone: PaymentMilestoneDetail
  canManage: boolean
  canVoid: boolean
}) {
  const permissions = usePermissions()
  const canViewQuote = permissions.has(PERMISSIONS.QUOTATION_VIEW)
  const editor = useRecordEditor({ initial, onSave: async (_draft, changes) => updateFunnelMilestone(initial.id, changes) })
  const milestone = editor.record
  const plannedMoney = (amount: string) => milestone.currency ? formatMoney(amount, milestone.currency) : `${amount} (currency unavailable)`
  const saveField = (patch: Partial<Pick<PaymentMilestoneDetail, "amount" | "title" | "dueDate" | "description" | "expectedInvoiceMonth" | "expectedInvoiceYear">>) => { editor.stage(patch) }
  const saveStatus = useSaveField((patch: FunnelMilestoneUpdateInput) =>
    updateFunnelMilestone(milestone.id, patch)
  )
  const [pending, startTransition] = React.useTransition()
  const historyLocked=milestone.status === "invoiced" || !!milestone.hasFinanceHistory
  const editable=canManage && !historyLocked
  const canEditAmount = editable && editor.editing && !milestone.quotationId
  const currentIndex = STATUS_ORDER.indexOf(milestone.status)
  const steps: PathStep[] = STATUS_ORDER.map((status, index) => ({
    id: status,
    label: STATUS_LABELS[status],
    state:
      index < currentIndex
        ? "done"
        : index === currentIndex
          ? "current"
          : "upcoming",
    tone: "default",
  }))

  return (
    <fieldset disabled={editor.saving} className="grid min-w-0 gap-4 border-0 p-0 lg:grid-cols-3 lg:items-start">
      <DetailAside>
        <Card>
          <DetailCardHeader
            kind="milestone"
            eyebrow="Payment milestone"
            title={milestone.title}
            actions={<RecordHeaderActions canEdit={editable} editing={editor.editing} saving={editor.saving} onEdit={editor.start} onSave={editor.save} onCancel={editor.cancel} voidTarget={canVoid ? { type: "payment_milestone", id: milestone.id } : undefined} />}
          />
          <CardContent key={editor.session} onChangeCapture={editor.markDirty} className="grid gap-3">
            <p className="text-sm text-muted-foreground">Planned amount (excl. tax)</p>
            {canEditAmount ? (
              <InlineValue
                value={milestone.amount}
                display={
                  <span className="text-2xl font-semibold tabular-nums">
                    {plannedMoney(milestone.amount)}
                  </span>
                }
                formatDraft={(value) => (
                  <span className="text-2xl font-semibold tabular-nums">
                    {plannedMoney(value || "0")}
                  </span>
                )}
                type="number"
                title="Click to edit amount"
                onSave={(next) => saveField({ amount: next })}
              />
            ) : (
              <div
                className="text-2xl font-semibold tabular-nums"
                title={
                  canManage && milestone.status === "invoiced"
                    ? "Amount is locked once the milestone is invoiced."
                    : undefined
                }
              >
                {plannedMoney(milestone.amount)}
              </div>
            )}
            {canViewQuote && milestone.quotationId ? <Link className="link text-sm" href={`/quotations/${milestone.quotationId}?tab=milestones`}>Edit payment plan</Link> : null}
            {historyLocked ? <p className="text-xs text-muted-foreground">Finance history is locked. Forecast periods can be corrected in the quotation plan.</p> : null}
          </CardContent>
        </Card>

        <RelatedCard
          items={[
            ...(milestone.funnelId
              ? [{ kind: "funnel" as const, label: milestone.funnelName || "Funnel", href: `/funnel/${milestone.funnelId}?tab=milestones` }]
              : []),
            ...(milestone.projectId
              ? [{ kind: "project" as const, label: "Project", href: `/projects/${milestone.projectId}` }]
              : []),
            ...(canViewQuote && milestone.quotationId
              ? [{ kind: "quotation" as const, label: milestone.quoteNumber || "Quotation", href: `/quotations/${milestone.quotationId}?tab=milestones` }]
              : []),
          ]}
        />
      </DetailAside>

      <div className="grid gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow actions</CardTitle>
          </CardHeader>
          <CardContent>
            <StagePathView steps={steps} />
            <p className="mt-3 text-sm text-muted-foreground">This status records planning progress only; it does not create an invoice or record payment. Manage invoice and receipt evidence in Billing.</p>
            {canManage && milestone.status === "pending_invoicing" ? (
              <Button className="mt-4" disabled={pending || editor.editing} onClick={() => startTransition(async () => { await saveStatus({ status: "invoiced" }) })}>Mark invoiced</Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planning details</CardTitle>
          </CardHeader>
          <CardContent key={editor.session} onChangeCapture={editor.markDirty}>
            <div className="grid gap-6">
              <FieldSection title="Payment Milestone">
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {editor.editing ? <>{/* Name is already the record heading in read mode. */}                  <FieldRow label="Name">
                    {editable && editor.editing ? (
                      <InlineValue
                        value={milestone.title}
                        display={milestone.title}
                        title="Click to edit name"
                        onSave={(next) => {
                          if (!next.trim()) return
                          return saveField({ title: next })
                        }}
                      />
                    ) : (
                      milestone.title
                    )}
                  </FieldRow>
</> : null}
                  <FieldRow label="Expected invoice month">
                    {editable && editor.editing ? <Select value={milestone.expectedInvoiceMonth || null} onValueChange={month=>saveField({expectedInvoiceMonth:month || ""})}><SelectTrigger width="full" aria-label="Expected invoice month"><SelectValue placeholder="Select month"/></SelectTrigger><SelectContent alignItemWithTrigger={false}>{BILLING_MONTHS.map(month=><SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent></Select> : milestone.expectedInvoiceMonth || "Not set"}
                  </FieldRow>
                  <FieldRow label="Expected invoice year">
                    {editable && editor.editing ? <InlineValue type="number" value={String(milestone.expectedInvoiceYear ?? "")} display={milestone.expectedInvoiceYear ?? "Not set"} onSave={year => saveField({ expectedInvoiceYear: Number(year) })} /> : milestone.expectedInvoiceYear || "Not set"}
                  </FieldRow>
                  <details open={editor.editing} className="border-t pt-3 sm:col-span-2"><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Remarks &amp; Due Date</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">                  <FieldRow label="Payment due date">
                    {editable && editor.editing ? (
                      <Input aria-label="Payment due date" type="date" value={milestone.dueDate ?? ""} onChange={event=>saveField({dueDate:event.target.value || null})}/>
                    ) : (
                      formatDate(milestone.dueDate)
                    )}
                  </FieldRow>
                  <FieldRow label="Remarks" className="sm:col-span-2">
                    {editable && editor.editing ? (
                      <Textarea aria-label="Remarks" rows={3} maxLength={4000} placeholder="Add remarks…" value={milestone.description ?? ""} onChange={event=>saveField({description:event.target.value || null})}/>
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {milestone.description || "—"}
                      </span>
                    )}
                  </FieldRow><FieldRow label={CRM_TERMS.productCategory}>{milestone.productCategory || "Not set"}</FieldRow><FieldRow label={CRM_TERMS.productSubcategory}>{milestone.productSubcategory || "Not set"}</FieldRow></div></details>
                </div>
              </FieldSection>
            </div>
          </CardContent>
        </Card>
      </div>
    </fieldset>
  )
}
