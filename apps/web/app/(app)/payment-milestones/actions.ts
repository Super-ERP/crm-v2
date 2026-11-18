"use server"

import { BILLING_MONTHS, validateBillingSchedule } from "@/lib/billing-schedule"
import { lockRecordVoidGraph } from "@/server/services/record-void-lock"
import {relatedQueryRegistry,relationshipSortColumns} from "@/server/services/table-controls/relationships"

import { enrichTableRows } from "@/server/services/table-controls/dataset-fields"

import { getTableFields } from "@/lib/table-controls/registry"
import { recordFilterRelated, recordSort } from "@/server/services/table-controls/record-filter"

import { milestoneReadScope } from "@/server/services/milestone-access"
import { milestoneStatusForFunnel, milestoneContextForFunnel } from "@/server/services/milestone-status"

import { and, asc, desc, eq, getTableColumns, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { revalidateMilestoneViews } from "@/lib/revalidate-milestone-views"
import { revalidatePath } from "next/cache"
import { withTenant, type Tx } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import {
  paymentMilestones,
  paymentMilestoneStatus,
  funnels,
  quotations,
  quotationLineItems,
  products,
  opportunities,
} from "@/db/schema"
import { runAction, type ActionResult } from "@/lib/action-result"
import { validateMilestoneDetails,isForecastOnlyMilestoneUpdate } from "@/lib/billing-schedule"
import {
  visibleMemberIds,
  ownsOrManages,
  canManageAllRecords,
} from "@/lib/access-scope"
import { logActivity } from "@/server/services/activity"
import { writeAudit } from "@/server/audit"
import { opportunityNetValue } from "@/server/services/value"
import { milestoneName } from "@/lib/so-milestones"
import {
  canTransitionPaymentMilestone,
  type PaymentMilestoneStatus,
} from "@/lib/payment-milestone-lifecycle"

export type PaymentMilestoneRow = typeof paymentMilestones.$inferSelect & {quoteNumber?:string|null;quotationItemDescription?:string|null}

/** A milestone row for the list, joined to its funnel + quotation for display. */
export type PaymentMilestoneListItem = PaymentMilestoneRow & {
  currency: string | null
  funnelName: string | null
  quoteNumber: string | null
}

/** A single milestone plus its resolved funnel name + quote number. */
export type PaymentMilestoneDetail = PaymentMilestoneRow & {
  hasFinanceHistory?: boolean
  currency: string | null
  funnelName: string | null
  quoteNumber: string | null
}

const milestoneCurrency = sql<string|null>`coalesce(${quotations.currency},${funnels.currency},(select projects.currency from projects where projects.id=${paymentMilestones.projectId} and projects.tenant_id=${paymentMilestones.tenantId}))`

/** Resolve product metadata from the quotation line that owns the milestone.
 * A legacy/default full-payment milestone has no line-item foreign key, so a
 * single-line quotation is unambiguous; multi-line milestones remain blank
 * until the data model can identify their source line. */
async function resolveMilestoneProduct(
  tx: Tx,
  quotationId: string | null,
  milestoneTitle: string,
  quotationLineItemId?: string | null
): Promise<{ productCategory: string | null; productSubcategory: string | null }> {
  if (!quotationId) return { productCategory: null, productSubcategory: null }
  const lines = await tx
    .select({
      id: quotationLineItems.id,
      description: quotationLineItems.description,
      productName: products.name,
      productCategory: products.productCode,
      productSubcategory: products.subcategory,
    })
    .from(quotationLineItems)
    .leftJoin(products, eq(quotationLineItems.productId, products.id))
    .where(eq(quotationLineItems.quotationId, quotationId))
    .orderBy(asc(quotationLineItems.sortOrder))
  const line =
    lines.find(candidate => candidate.id === quotationLineItemId) ?? lines.find(
      (candidate) =>
        candidate.description === milestoneTitle ||
        candidate.productName === milestoneTitle
    ) ?? (lines.length === 1 ? lines[0] : null)
  return {
    productCategory: line?.productCategory ?? null,
    productSubcategory: line?.productSubcategory ?? null,
  }
}

/**
 * All tenant payment milestones (RLS-scoped), joined to their funnel name and
 * quotation number for display, newest first.
 */
export async function listPaymentMilestonePage(input: ServerTableQuery): Promise<{ rows: PaymentMilestoneListItem[]; total: number }> {
  return withTenant(PERMISSIONS.PAYMENT_MILESTONE_VIEW, async (tx, ctx) => {
    const { limit, offset, query } = normalizeRecordListQuery(input,
      ["title", "amount", "quoteNumber", "status", "funnelName"], ["status"],getTableFields("payment-milestones"))
    const search = query.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
    const statuses = query.selections.status?.filter((value): value is (typeof paymentMilestoneStatus.enumValues)[number] => paymentMilestoneStatus.enumValues.includes(value as (typeof paymentMilestoneStatus.enumValues)[number]))
    const relatedFields=await relatedQueryRegistry(tx,ctx,"payment-milestones",query.filterTree,query.sorting)
  const tableFieldColumns = {title:paymentMilestones.title,amount:paymentMilestones.amount,quoteNumber:quotations.quoteNumber,expectedInvoiceMonth:paymentMilestones.expectedInvoiceMonth,expectedInvoiceYear:paymentMilestones.expectedInvoiceYear,status:paymentMilestones.status,funnelName:funnels.name}
    const where = and(recordFilterRelated("payment-milestones",query.filterTree,tableFieldColumns,relatedFields,{currency:milestoneCurrency}),
      await milestoneReadScope(tx, ctx),
      search ? or(ilike(paymentMilestones.title, search), ilike(funnels.name, search), ilike(quotations.quoteNumber, search)) : undefined,
      statuses?.length ? inArray(paymentMilestones.status, statuses) : undefined)
    const sortColumns = { ...relationshipSortColumns(relatedFields), ...tableFieldColumns,  title: paymentMilestones.title, amount: paymentMilestones.amount, quoteNumber: quotations.quoteNumber, status: paymentMilestones.status, funnelName: funnels.name }
    const sortColumn = query.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
    const ordering = sortColumn ? query.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(paymentMilestones.createdAt)
    const [rows, totalRows] = await Promise.all([tx
      .select({
        m: paymentMilestones,
        currency: milestoneCurrency,
        funnelName: funnels.name,
        quoteNumber: quotations.quoteNumber,
      })
      .from(paymentMilestones)
      .leftJoin(funnels, eq(paymentMilestones.funnelId, funnels.id))
      .leftJoin(quotations, eq(paymentMilestones.quotationId, quotations.id))
      .where(where)
      .orderBy(...recordSort(query.sorting,sortColumns,ordering, "payment-milestones"), desc(paymentMilestones.id))
      .limit(limit).offset(offset),
      tx.select({ count: sql<number>`count(*)::int` }).from(paymentMilestones)
        .leftJoin(funnels, eq(paymentMilestones.funnelId, funnels.id))
        .leftJoin(quotations, eq(paymentMilestones.quotationId, quotations.id)).where(where),
    ])
    return { rows: await enrichTableRows(tx, "payment-milestones", rows.map((r) => ({
      ...r.m,
      currency:r.currency,
      funnelName: r.funnelName,
      quoteNumber: r.quoteNumber,
    })), ctx.tenantId), total: totalRows[0]?.count ?? 0 }
  })
}

/**
 * Payment milestones attached to a funnel, ordered by their sort order then
 * creation time. Used by the funnel detail related tab.
 */
export async function listFunnelMilestones(
  funnelId: string
): Promise<PaymentMilestoneRow[]> {
  return withTenant(PERMISSIONS.PAYMENT_MILESTONE_VIEW, async (tx, ctx) => {
    const [funnel] = await tx.select().from(funnels).where(and(eq(funnels.id, funnelId), isNull(funnels.deletedAt)))
    const visible = await visibleMemberIds(tx, ctx)
    if (!funnel || (!canManageAllRecords(ctx) && !ownsOrManages(visible, funnel.ownerMemberId))) return []
    return tx
      .select({...getTableColumns(paymentMilestones),quoteNumber:ctx.can(PERMISSIONS.QUOTATION_VIEW)?quotations.quoteNumber:sql<string|null>`null`,quotationItemDescription:ctx.can(PERMISSIONS.QUOTATION_VIEW)?quotationLineItems.description:sql<string|null>`null`})
      .from(paymentMilestones)
      .leftJoin(quotations,and(eq(quotations.id,paymentMilestones.quotationId),eq(quotations.funnelId,funnelId),eq(quotations.tenantId,ctx.tenantId),isNull(quotations.deletedAt)))
      .leftJoin(quotationLineItems,and(eq(quotationLineItems.id,paymentMilestones.quotationLineItemId),eq(quotationLineItems.quotationId,quotations.id),eq(quotationLineItems.tenantId,ctx.tenantId)))
      .where(and(isNull(paymentMilestones.deletedAt), eq(paymentMilestones.funnelId, funnelId)))
      .orderBy(
        asc(paymentMilestones.sortOrder),
        asc(paymentMilestones.createdAt)
      )
  })
}

/** One milestone plus its resolved funnel name + quote number, or null. */
export async function getPaymentMilestone(
  id: string
): Promise<PaymentMilestoneDetail | null> {
  return withTenant(PERMISSIONS.PAYMENT_MILESTONE_VIEW, async (tx, ctx) => {
    const [row] = await tx
      .select({
        m: paymentMilestones,
        hasFinanceHistory: sql<boolean>`exists(select 1 from finance_docs d where d.milestone_id=${paymentMilestones.id} and d.tenant_id=${ctx.tenantId})`,
        currency: milestoneCurrency,
        funnelName: funnels.name,
        quoteNumber: quotations.quoteNumber,
      })
      .from(paymentMilestones)
      .leftJoin(funnels, eq(paymentMilestones.funnelId, funnels.id))
      .leftJoin(quotations, eq(paymentMilestones.quotationId, quotations.id))
      .where(and(isNull(paymentMilestones.deletedAt), and(eq(paymentMilestones.id, id), await milestoneReadScope(tx, ctx))))
      .limit(1)
    if (!row) return null
    const product = await resolveMilestoneProduct(tx, row.m.quotationId, row.m.title, row.m.quotationLineItemId)
    return {
      ...row.m,
      hasFinanceHistory: row.hasFinanceHistory,
      currency: row.currency,
      funnelName: row.funnelName,
      quoteNumber: row.quoteNumber,
      ...product,
    }
  })
}

// ── Funnel-scoped milestone CRUD (core; independent of the Projects module) ──
// Mirrors app/(app)/projects/actions.ts's create/update/delete/reorderMilestone
// functions, but reconciles against the FUNNEL's net value (opportunityNetValue)
// and scopes ownership via funnels.ownerMemberId instead of projects.

export type FunnelMilestoneCreateInput = {
  funnelId: string
  title: string
  description?: string | null
  amount?: string | null
  dueDate?: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  quotationLineItemId?: string | null
}

export type FunnelMilestoneUpdateInput = {
  title?: string
  description?: string | null
  amount?: string | null
  dueDate?: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  quotationLineItemId?: string | null
  status?: string
}

type MilestoneStatusValue = PaymentMilestoneStatus

function isMilestoneStatus(v: string | undefined): v is MilestoneStatusValue {
  return (
    !!v && (paymentMilestoneStatus.enumValues as readonly string[]).includes(v)
  )
}

/** Whole-cent comparison to avoid float drift when reconciling money. */
const cents = (n: number) => Math.round(n * 100)

/** Sum of milestone amounts for a funnel, optionally excluding one milestone. */
async function funnelAllocatedTotal(
  tx: Tx,
  funnelId: string,
  excludeId?: string
): Promise<number> {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(${paymentMilestones.amount}), 0)`,
    })
    .from(paymentMilestones)
    .where(and(isNull(paymentMilestones.deletedAt),
      excludeId
        ? and(
            eq(paymentMilestones.funnelId, funnelId),
            ne(paymentMilestones.id, excludeId)
          )
        : eq(paymentMilestones.funnelId, funnelId)
    ))
  return Number(row?.total ?? 0)
}

export async function createFunnelMilestone(
  input: FunnelMilestoneCreateInput
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const created = await withTenant(
      PERMISSIONS.PAYMENT_MILESTONE_MANAGE,
      async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
        // Lock the funnel row so concurrent milestone writes serialize against
        // the reconciliation check below (same guard as the project version).
        const [funnel] = await tx
          .select({
            ownerMemberId: funnels.ownerMemberId,
            primaryQuotationId: funnels.primaryQuotationId,
            projectCode: opportunities.projectCode,
          })
          .from(funnels)
          .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
          .where(and(isNull(funnels.deletedAt), eq(funnels.id, input.funnelId)))
          .limit(1)
          .for("update", { of: funnels })
        if (!funnel) throw new Error("Funnel not found")
        const visible = await visibleMemberIds(tx, ctx)
        if (
          !canManageAllRecords(ctx) &&
          !ownsOrManages(visible, funnel.ownerMemberId)
        ) {
          throw new Error("FORBIDDEN: not permitted on this Funnel")
        }

        if (funnel.primaryQuotationId) {
          const [item]=await tx.select({id:quotationLineItems.id}).from(quotationLineItems).where(eq(quotationLineItems.quotationId,funnel.primaryQuotationId)).limit(1)
          if(item) throw new Error("Create milestones from the quotation payment plan so every row has a quotation item.")
        }
        const title = input.title.trim()
        if (!title) throw new Error("Title is required")

        const milestoneContext = await milestoneContextForFunnel(tx, input.funnelId)
        const netValue = milestoneContext.value
        const funnelValue = Number(netValue) || 0
        // Milestones are split by exact amount.
        const amount = input.amount != null && input.amount !== "" ? input.amount : "0"

        // Reconciliation: total milestone amounts may not exceed the funnel's
        // net value. Skipped when no value. Only block when this addition
        // actually pushes the total higher, mirroring the project version.
        if (funnelValue > 0) {
          const existingTotal = await funnelAllocatedTotal(tx, input.funnelId)
          const newTotal = existingTotal + Number(amount)
          if (
            cents(newTotal) > cents(funnelValue) &&
            cents(newTotal) > cents(existingTotal)
          ) {
            throw new Error(
              "Milestones would exceed the funnel value. Lower the amount or adjust other milestones."
            )
          }
        }

        const [{ maxSort }] = await tx
          .select({
            maxSort: sql<number>`coalesce(max(${paymentMilestones.sortOrder}), -1)`,
          })
          .from(paymentMilestones)
          .where(and(isNull(paymentMilestones.deletedAt), eq(paymentMilestones.funnelId, input.funnelId)))

        validateBillingSchedule([{ title, amount, expectedInvoiceMonth: input.expectedInvoiceMonth ?? "", expectedInvoiceYear: input.expectedInvoiceYear ?? 0 }])
        const status = milestoneContext.status
        const [row] = await tx
          .insert(paymentMilestones)
          .values({
            tenantId: ctx.tenantId,
            funnelId: input.funnelId,
            quotationId: milestoneContext.quotationId,
            status,
            title,
            name: milestoneName(funnel.projectCode, title),
            description: input.description || null,
            amount,
            dueDate: input.dueDate || null,
            expectedInvoiceMonth: input.expectedInvoiceMonth || null,
            expectedInvoiceYear: input.expectedInvoiceYear || null,
            sortOrder: Number(maxSort) + 1,
          })
          .returning({ id: paymentMilestones.id })

        await logActivity(tx, ctx, {
          entityType: "opportunity",
          entityId: input.funnelId,
          type: "system",
          subject: `Milestone added: ${title}`,
        })

        await writeAudit(tx, ctx, {
          action: "milestone.created",
          entityType: "opportunity",
          entityId: input.funnelId,
          after: { milestoneId: row.id, title, amount },
        })
        return row
      }
    )
    revalidatePath(`/funnel/${input.funnelId}`)
    revalidateMilestoneViews()
    return created
  })
}

export async function updateFunnelMilestone(
  id: string,
  input: FunnelMilestoneUpdateInput
): Promise<ActionResult<void>> {
  return runAction(async () => {
    validateMilestoneDetails(input)
    const funnelId = await withTenant(
      PERMISSIONS.PAYMENT_MILESTONE_MANAGE,
      async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
        const [existing] = await tx
          .select()
          .from(paymentMilestones)
          .where(and(isNull(paymentMilestones.deletedAt), eq(paymentMilestones.id, id)))
          .limit(1)
        if (!existing || !existing.funnelId) throw new Error("Milestone not found")

        // Lock the funnel row so concurrent milestone writes serialize against
        // the reconciliation check below (same guard as createFunnelMilestone).
        const [funnel] = await tx
          .select({ ownerMemberId: funnels.ownerMemberId })
          .from(funnels)
          .where(and(isNull(funnels.deletedAt), eq(funnels.id, existing.funnelId)))
          .limit(1)
          .for("update")

        if (!funnel) throw new Error("Funnel not found")
        const visible = await visibleMemberIds(tx, ctx)
        if (
          !canManageAllRecords(ctx) &&
          !ownsOrManages(visible, funnel?.ownerMemberId ?? null)
        ) {
          throw new Error("FORBIDDEN: not permitted on this Funnel")
        }

        if (input.amount !== undefined && Number(input.amount) !== Number(existing.amount) && existing.quotationId) {
          const [item]=await tx.select({id:quotationLineItems.id}).from(quotationLineItems).where(eq(quotationLineItems.quotationId,existing.quotationId)).limit(1)
          if(item) throw new Error("Adjust amounts in the quotation payment plan so each item's instalments reconcile.")
        }
        // Existing planning rows can be edited before 4a, just like the quotation plan.
        // Moving into invoiced still requires the accepted-quotation/stage gate.
        const { value: netValue } = input.status === "invoiced" && existing.status !== "invoiced"
          ? await milestoneContextForFunnel(tx, existing.funnelId)
          : await opportunityNetValue(tx, existing.funnelId)
        const funnelValue = Number(netValue) || 0

        if (input.amount !== undefined && (!input.amount || !/^\d+(\.\d{1,2})?$/.test(input.amount) || Number(input.amount) <= 0)) throw new Error("Enter a positive amount in whole cents")
        if (input.expectedInvoiceMonth !== undefined && (!input.expectedInvoiceMonth || !(BILLING_MONTHS as readonly string[]).includes(input.expectedInvoiceMonth))) throw new Error("Invalid expected invoice month")
        if (input.expectedInvoiceYear !== undefined && (input.expectedInvoiceYear === null || !Number.isInteger(input.expectedInvoiceYear) || input.expectedInvoiceYear < 1900 || input.expectedInvoiceYear > 9999)) throw new Error("Invalid expected invoice year")
        const rewriting = Object.keys(input).some(key => key !== "status")
        if (rewriting) {
          const linked = await tx.execute(sql`select 1 from finance_docs where milestone_id = ${id} and tenant_id = ${ctx.tenantId} limit 1`)
          if ((existing.status === "invoiced" || linked.length) && !isForecastOnlyMilestoneUpdate(input)) throw new Error("Milestones with finance history only allow expected invoice month/year corrections.")
        }
        // Milestones are split by exact amount; an untouched amount is preserved.
        const nextAmount =
          input.amount === undefined
            ? existing.amount
            : input.amount
              ? input.amount
              : "0"

        // Reconciliation: block edits that push the milestone total over the
        // funnel value. Edits that don't raise the total are always allowed.
        if (funnelValue > 0) {
          const otherTotal = await funnelAllocatedTotal(tx, existing.funnelId, id)
          const newTotal = otherTotal + Number(nextAmount)
          const oldTotal = otherTotal + Number(existing.amount)
          if (
            cents(newTotal) > cents(funnelValue) &&
            cents(newTotal) > cents(oldTotal)
          ) {
            throw new Error(
              "Milestones would exceed the funnel value. Lower the amount or adjust other milestones."
            )
          }
        }

        const nextStatus = isMilestoneStatus(input.status)
          ? input.status
          : existing.status
        // Invoicing is independent of the funnel closing Won.
        if (
          nextStatus !== existing.status &&
          !canTransitionPaymentMilestone(existing.status, nextStatus)
        ) {
          throw new Error("Only milestones pending invoicing can be marked invoiced.")
        }
        if (nextStatus === "invoiced" && existing.status !== "invoiced") {
          await milestoneStatusForFunnel(tx, existing.funnelId)
        }
        const nextTitle =
          input.title === undefined
            ? existing.title
            : input.title.trim() || existing.title

        await tx
          .update(paymentMilestones)
          .set({
            title: nextTitle,
            description:
              input.description === undefined
                ? existing.description
                : input.description || null,
            amount: nextAmount,
            dueDate:
              input.dueDate === undefined
                ? existing.dueDate
                : input.dueDate || null,
            expectedInvoiceMonth: input.expectedInvoiceMonth === undefined ? existing.expectedInvoiceMonth : input.expectedInvoiceMonth,
            expectedInvoiceYear: input.expectedInvoiceYear === undefined ? existing.expectedInvoiceYear : input.expectedInvoiceYear,
            status: nextStatus,
            updatedAt: new Date(),
          })
          .where(and(isNull(paymentMilestones.deletedAt), eq(paymentMilestones.id, id)))

        await logActivity(tx, ctx, {
          entityType: "opportunity",
          entityId: existing.funnelId,
          type: "system",
          subject:
            nextStatus !== existing.status
              ? `Milestone ${nextTitle} marked ${nextStatus}`
              : `Milestone updated: ${nextTitle}`,
        })

        await writeAudit(tx, ctx, {
          action: "milestone.updated",
          entityType: "opportunity",
          entityId: existing.funnelId,
          before: { amount: existing.amount, status: existing.status },
          after: { milestoneId: id, amount: nextAmount, status: nextStatus },
        })

        return existing.funnelId
      }
    )
    revalidatePath(`/funnel/${funnelId}`)
    revalidateMilestoneViews()
  })
}

export async function deleteFunnelMilestone(id: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.PAYMENT_MILESTONE_MANAGE, async () => {
      void id
      throw new Error("Use Void to request reviewed cancellation")
    })
  })
}

export async function reorderFunnelMilestones(
  funnelId: string,
  order: string[]
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.PAYMENT_MILESTONE_MANAGE, async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
      const [funnel] = await tx
        .select({ ownerMemberId: funnels.ownerMemberId })
        .from(funnels)
        .where(and(isNull(funnels.deletedAt), eq(funnels.id, funnelId)))
        .limit(1)
      if (!funnel) throw new Error("Funnel not found")

      const visible = await visibleMemberIds(tx, ctx)
      if (!canManageAllRecords(ctx) && !ownsOrManages(visible, funnel.ownerMemberId)) {
        throw new Error("FORBIDDEN: not permitted on this Funnel")
      }

      if (new Set(order).size !== order.length) throw new Error("Duplicate milestone order entries")
      for (let i = 0; i < order.length; i++) {
        const [updated] = await tx
          .update(paymentMilestones)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(isNull(paymentMilestones.deletedAt),
            and(
              eq(paymentMilestones.id, order[i]),
              eq(paymentMilestones.funnelId, funnelId)
            )
          ))
          .returning({ id: paymentMilestones.id })
        if (!updated) throw new Error("Milestone not found or already voided")
      }

      await writeAudit(tx, ctx, {
        action: "milestone.reordered",
        entityType: "opportunity",
        entityId: funnelId,
        after: { order },
      })
    })
    revalidatePath(`/funnel/${funnelId}`)
    revalidateMilestoneViews()
  })
}

export type SplitMilestonePart = {
  title: string
  description?: string | null
  amount: string
  dueDate?: string | null
  expectedInvoiceMonth?: string | null
  expectedInvoiceYear?: number | null
  quotationLineItemId?: string | null
}

/**
 * Guided split: replace the funnel's current milestone(s) with N parts whose
 * amounts sum EXACTLY to the funnel's net quoted value — no partial commit.
 * "Never make it splitable" if it wouldn't reconcile: the caller (UI) only
 * offers this when the funnel is in its default, unsplit state, but the
 * exact-sum check here is the actual enforcement.
 */
export async function splitFunnelMilestones(
  funnelId: string,
  parts: SplitMilestonePart[]
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.PAYMENT_MILESTONE_MANAGE, async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
      if (parts.length < 2) {
        throw new Error("Split into at least 2 parts.")
      }
      validateBillingSchedule(parts.map(p => ({ ...p, expectedInvoiceMonth: p.expectedInvoiceMonth ?? "", expectedInvoiceYear: p.expectedInvoiceYear ?? 0 })))
      for (const p of parts) {
        if (!p.title.trim()) throw new Error("Every part needs a title.")
      }

      const [funnel] = await tx
        .select({
          ownerMemberId: funnels.ownerMemberId,
          primaryQuotationId: funnels.primaryQuotationId,
          projectCode: opportunities.projectCode,
        })
        .from(funnels)
        .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
        .where(and(isNull(funnels.deletedAt), eq(funnels.id, funnelId)))
        .limit(1)
        .for("update", { of: funnels })
      if (!funnel) throw new Error("Funnel not found")

      const visible = await visibleMemberIds(tx, ctx)
      if (!canManageAllRecords(ctx) && !ownsOrManages(visible, funnel.ownerMemberId)) {
        throw new Error("FORBIDDEN: not permitted on this Funnel")
      }

      const milestoneContext = await milestoneContextForFunnel(tx, funnelId)
      const netValue = milestoneContext.value
      const target = Number(netValue) || 0
      const sum = parts.reduce((n, p) => n + Number(p.amount || 0), 0)
      if (cents(sum) !== cents(target)) {
        throw new Error(
          `Parts must sum to exactly ${netValue} — they currently sum to ${sum.toFixed(2)}.`
        )
      }

      const [invoiced] = await tx.select({ id: paymentMilestones.id }).from(paymentMilestones)
        .where(and(isNull(paymentMilestones.deletedAt), and(eq(paymentMilestones.funnelId, funnelId), eq(paymentMilestones.status, "invoiced")))).limit(1)
      if (invoiced) throw new Error("Invoiced milestones cannot be split.")
      const linkedFinance = await tx.execute(sql`select 1 from finance_docs d
        join payment_milestones m on m.id = d.milestone_id and m.tenant_id = d.tenant_id
        where m.tenant_id = ${ctx.tenantId} and m.funnel_id = ${funnelId}
        and m.deleted_at is null limit 1`)
      if (linkedFinance.length) throw new Error("Milestones with finance history cannot be split. Use Void to request reviewed cancellation")
      const sources = await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.funnelId, funnelId), isNull(paymentMilestones.deletedAt)))
      if (sources.length > 1) throw new Error("Split an individual milestone to preserve its quotation and product source.")
      if (!sources.length && milestoneContext.quotationId) {
        const [item]=await tx.select({id:quotationLineItems.id}).from(quotationLineItems).where(eq(quotationLineItems.quotationId,milestoneContext.quotationId)).limit(1)
        if(item) throw new Error("Create milestones from the quotation payment plan so every row has a quotation item.")
      }
      const source = sources[0]
      const status = milestoneContext.status
      await tx.update(paymentMilestones).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(isNull(paymentMilestones.deletedAt), eq(paymentMilestones.funnelId, funnelId)))

      const rows = parts.map((p, i) => ({
        tenantId: ctx.tenantId,
        funnelId,
        quotationId: source?.quotationId ?? milestoneContext.quotationId,
        quotationLineItemId: source?.quotationLineItemId,
        status,
        title: p.title.trim(),
        name: milestoneName(funnel.projectCode, p.title.trim()),
        description: p.description || null,
        amount: p.amount,
        dueDate: p.dueDate ?? source?.dueDate ?? null,
        expectedInvoiceMonth: p.expectedInvoiceMonth || null,
        expectedInvoiceYear: p.expectedInvoiceYear || null,
        sortOrder: i,
      }))
      await tx.insert(paymentMilestones).values(rows)

      await writeAudit(tx, ctx, {
        action: "milestone.split",
        entityType: "opportunity",
        entityId: funnelId,
        after: { parts: rows.length, sum },
      })
      await logActivity(tx, ctx, {
        entityType: "opportunity",
        entityId: funnelId,
        type: "system",
        subject: `Payment split into ${rows.length} milestones`,
      })
    })
    revalidatePath(`/funnel/${funnelId}`)
    revalidateMilestoneViews()
  })
}

/** Split one row without changing its quotation, product source, or sibling rows. */
export async function splitPaymentMilestone(id: string, parts: SplitMilestonePart[]): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.PAYMENT_MILESTONE_MANAGE, async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
      const [row] = await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.id, id), isNull(paymentMilestones.deletedAt))).for("update")
      if (!row?.funnelId) throw new Error("Milestone not found")
      const [funnel] = await tx.select().from(funnels).where(and(eq(funnels.id, row.funnelId), isNull(funnels.deletedAt))).for("update")
      const visible = await visibleMemberIds(tx, ctx)
      if (!funnel || (!canManageAllRecords(ctx) && !ownsOrManages(visible, funnel.ownerMemberId))) throw new Error("FORBIDDEN: not permitted on this Funnel")
      const linked = await tx.execute(sql`select 1 from finance_docs where milestone_id = ${id} and tenant_id = ${ctx.tenantId} limit 1`)
      if (row.status === "invoiced" || linked.length) throw new Error("Invoiced milestones or milestones with finance history cannot be split.")
      validateBillingSchedule(parts.map(part => ({ ...part, expectedInvoiceMonth: part.expectedInvoiceMonth ?? row.expectedInvoiceMonth ?? "", expectedInvoiceYear: part.expectedInvoiceYear ?? row.expectedInvoiceYear ?? 0 })))
      if (parts.length < 2 || parts.some(p => !p.title.trim() || !Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0) || parts.reduce((sum,p) => sum + cents(Number(p.amount)),0) !== cents(Number(row.amount))) throw new Error("At least two positive parts must sum exactly to the original amount.")
      await tx.update(paymentMilestones).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(paymentMilestones.id,id))
      await tx.insert(paymentMilestones).values(parts.map((part,index) => ({ tenantId: ctx.tenantId, funnelId: row.funnelId, projectId: row.projectId, quotationId: row.quotationId, quotationLineItemId: row.quotationLineItemId, title: part.title.trim(), description: part.description ?? row.description, amount: part.amount, dueDate: part.dueDate ?? row.dueDate, expectedInvoiceMonth: part.expectedInvoiceMonth ?? row.expectedInvoiceMonth, expectedInvoiceYear: part.expectedInvoiceYear ?? row.expectedInvoiceYear, sortOrder: row.sortOrder + index })))
      await writeAudit(tx, ctx, { action: "milestone.split", entityType: "payment_milestone", entityId:id, after:{parts:parts.length} })
    })
    revalidateMilestoneViews()
    revalidatePath(`/payment-milestones/${id}`)
  })
}

export async function prepareQuotationBillingSchedule(quotationId: string, rows: import("@/lib/billing-schedule").BillingScheduleInput[]): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.PAYMENT_MILESTONE_MANAGE, async (tx, ctx) => {
      await lockRecordVoidGraph(tx, ctx.tenantId)
      const [quote] = await tx.select().from(quotations).where(and(eq(quotations.id, quotationId), isNull(quotations.deletedAt)))
      if (!quote) throw new Error("Quotation not found")
      const [funnel] = await tx.select().from(funnels).where(and(eq(funnels.id, quote.funnelId), isNull(funnels.deletedAt))).for("update")
      const visible = await visibleMemberIds(tx, ctx)
      if (!funnel || (!canManageAllRecords(ctx) && !ownsOrManages(visible, funnel.ownerMemberId))) throw new Error("FORBIDDEN: not permitted on this Funnel")
      const { saveBillingSchedule } = await import("@/server/services/billing-schedule")
      await saveBillingSchedule(tx, { funnelId: funnel.id, quotationId, rows })
      await writeAudit(tx, ctx, { action: "milestone.schedule", entityType: "quotation", entityId: quotationId, after: { rows: rows.length } })
    })
    revalidatePath(`/quotations/${quotationId}`)
    revalidateMilestoneViews()
  })
}
