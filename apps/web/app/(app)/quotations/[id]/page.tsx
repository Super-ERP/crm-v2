import { notFound } from "next/navigation"
import { and, asc, isNull, eq, sql } from "drizzle-orm"
import { withTenant } from "@/lib/actions"
import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { QuotationBillingSchedule } from "@/components/quotation-billing-schedule"
import { tenantSettings, paymentMilestones, funnels } from "@/db/schema"
import { listTaxOptions, listProjectNatures, listProductOptions } from "@/lib/lookups"
import { PageBody } from "@/components/page-header"
import { listEntityAttachments } from "@/app/(app)/_shared/attachment-actions"
import {
  getQuotation,
  canApproveQuotation,
  canDirectlyApproveQuotation,
  getQuotationDocument,
  getProjectForQuotation,
  getQuotationFormMeta,
} from "../actions"
import { QuotationForm } from "../quotation-form"

async function getTaxInclusive(): Promise<boolean> {
  return withTenant(PERMISSIONS.QUOTATION_VIEW, async (tx, ctx) => {
    const [s] = await tx
      .select({ taxInclusive: tenantSettings.taxInclusive })
      .from(tenantSettings)
      .where(eq(tenantSettings.organizationId, ctx.tenantId))
      .limit(1)
    return s?.taxInclusive ?? false
  })
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getQuotation(id)
  if (!detail) notFound()

  const [
    taxOptions,
    taxInclusive,
    projectNatures,
    products,
    attachments,
    project,
    ctx,
    modules,
    formMeta,
    preview,
    canApprove,
    canDirectApprove,
  ] = await Promise.all([
    listTaxOptions(),
    getTaxInclusive(),
    listProjectNatures(),
    listProductOptions(),
    listEntityAttachments("quotation", id),
    getProjectForQuotation(id),
    requireContext(),
    getEntitledModuleMap(),
    getQuotationFormMeta(detail.quotation.funnelId, detail.quotation.billToAccountId, id),
    getQuotationDocument(id),
    canApproveQuotation(id),
    canDirectlyApproveQuotation(),
  ])

  // Once the Funnel is Closed Won its quotations are locked: only duplicate or revise.
  const funnelWon = await withTenant(PERMISSIONS.QUOTATION_VIEW, async (tx) => {
    const [f] = await tx.select({ status: funnels.status }).from(funnels).where(eq(funnels.id, detail.quotation.funnelId)).limit(1)
    return f?.status === "won"
  })

  const perms = {
    canUpdate: ctx.can(PERMISSIONS.QUOTATION_UPDATE) && !funnelWon,
    canApprove,
    canDirectApprove,
    canSend: ctx.can(PERMISSIONS.QUOTATION_SEND),
    canAccept: ctx.can(PERMISSIONS.QUOTATION_ACCEPT),
    canDelete: ctx.can(PERMISSIONS.QUOTATION_DELETE),
    canCreateProject:
      modules.projects && ctx.can(PERMISSIONS.PROJECT_CREATE),
    canCreateRevision: ctx.can(PERMISSIONS.QUOTATION_CREATE),
  }

  const schedule = ctx.can(PERMISSIONS.PAYMENT_MILESTONE_VIEW) ? await withTenant(PERMISSIONS.PAYMENT_MILESTONE_VIEW, tx => tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.quotationId, id), isNull(paymentMilestones.deletedAt))).orderBy(asc(paymentMilestones.sortOrder),asc(paymentMilestones.id))) : null

  const scheduleLocked = schedule?.some(row => row.status === "invoiced") || (schedule?.length ? await withTenant(PERMISSIONS.PAYMENT_MILESTONE_VIEW, async tx => {
    const linked = await tx.execute(sql`select 1 from finance_docs d join payment_milestones m on m.id = d.milestone_id and m.tenant_id = d.tenant_id where m.quotation_id = ${id} and m.deleted_at is null limit 1`)
    return linked.length > 0
  }) : false)

  return (
    <>
      <PageBody>
        <h1 className="text-xl font-semibold tracking-tight break-words">{detail.quotation.quoteNumber}</h1>
        <QuotationForm
          detail={detail}
          preview={preview}
          taxOptions={taxOptions}
          taxInclusive={taxInclusive}
          projectNatures={projectNatures}
          products={products}
          contacts={formMeta.contacts}
          project={
            project ? { id: project.id, projectCode: project.projectCode } : null
          }
          documents={attachments.map((a) => ({
            ...a,
            source: "Quotation",
            ownedHere: true,
          }))}
          billingScheduleCount={schedule?.length ?? 0}
          billingSchedule={schedule ? <QuotationBillingSchedule quotationId={id} currency={detail.quotation.currency} netValue={String(Number(detail.quotation.subtotal) - Number(detail.quotation.discountTotal))} dateOnly={scheduleLocked} initial={schedule.map(row => ({ id: row.id, title: row.title, amount: row.amount, description: row.description, dueDate: row.dueDate, status: row.status, quotationLineItemId: row.quotationLineItemId, expectedInvoiceMonth: row.expectedInvoiceMonth ?? "", expectedInvoiceYear: row.expectedInvoiceYear ?? 0 }))} lines={detail.lines} canManage={detail.quotation.isPrimary && ctx.can(PERMISSIONS.PAYMENT_MILESTONE_MANAGE)} /> : null}
          perms={perms}
        />

      </PageBody>
    </>
  )
}
