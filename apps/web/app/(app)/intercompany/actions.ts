"use server"

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { revalidatePath } from "next/cache"
import { withModule } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { runAction, type ActionResult } from "@/lib/action-result"
import { writeAudit } from "@/server/audit"
import {
  accounts,
  intercompanyDeals,
  intercompanyDealResponses,
  organization,
  projects,
} from "@/db/schema"

export type IntercompanyResponseValue = "accepted" | "declined"

/**
 * One INBOUND intercompany deal: a deal a sibling entity owns and has assigned
 * to the current entity for delivery. Snapshotted by the origin's sync service
 * (server/services/intercompany.ts); this side only responds (accept/decline)
 * and may spin up a local delivery project.
 */
export type InboundIntercompanyDeal = {
  id: string
  /** The sibling entity that owns the deal (live org name; snapshot-free). */
  originEntityName: string | null
  name: string
  accountName: string | null
  currency: string
  estimatedAmount: string | null
  quotedAmount: string | null
  /** This entity's own share of the deal (percent-of-invoice or a fixed leg). */
  shareType: "percent" | "amount"
  shareValue: string
  /** This entity's own invoicing currency + rate off the deal currency. */
  partnerCurrency: string
  manualFxRate: string | null
  status: string
  stageName: string | null
  expectedCloseDate: string | null
  projectYear: number | null
  updatedAt: Date
  /** This entity's handshake on the assignment, if any. */
  response: IntercompanyResponseValue | null
  responseReason: string | null
  respondedAt: Date | null
  /** Local delivery project created from this deal, if any. */
  projectId: string | null
  projectCode: string | null
}

/**
 * Deals other group entities have assigned to this entity for delivery.
 * RLS on intercompany_deals grants the partner side SELECT; the explicit
 * partner predicate keeps the intent readable (and excludes this entity's own
 * OUTBOUND mirrors, which the same policy would also let it read).
 */
export async function listInboundIntercompanyDealPage(input: ServerTableQuery): Promise<{ rows: InboundIntercompanyDeal[]; total: number }> {
  return withModule("finance", PERMISSIONS.INTERCOMPANY_VIEW, async (tx, ctx) => {
    const { limit, offset, query } = normalizeRecordListQuery(input,
      ["name", "originEntityName", "status", "dealValue", "yourShare", "expectedCloseDate", "updatedAt"], ["status", "response"])
    const search = query.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
    const responses = query.selections.response?.filter((value): value is IntercompanyResponseValue => value === "accepted" || value === "declined")
    const where = and(eq(intercompanyDeals.partnerTenantId, ctx.tenantId),
      search ? or(ilike(intercompanyDeals.name, search), ilike(intercompanyDeals.accountName, search), ilike(organization.name, search)) : undefined,
      query.selections.status?.length ? inArray(intercompanyDeals.status, query.selections.status) : undefined,
      responses?.length ? inArray(intercompanyDealResponses.response, responses) : undefined)
    const dealValue = sql`coalesce(${intercompanyDeals.quotedAmount}, ${intercompanyDeals.estimatedAmount}, 0)`
    const yourShare = sql`greatest(0, case when ${intercompanyDeals.shareType} = 'amount' then ${intercompanyDeals.shareValue} else ${dealValue} * ${intercompanyDeals.shareValue} / 100 end)`
    const sortColumns = { name: intercompanyDeals.name, originEntityName: organization.name, status: intercompanyDeals.status, dealValue, yourShare, expectedCloseDate: intercompanyDeals.expectedCloseDate, updatedAt: intercompanyDeals.updatedAt }
    const sortColumn = query.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
    const ordering = sortColumn ? query.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(intercompanyDeals.updatedAt)
    const [rows, totalRows] = await Promise.all([tx
      .select({
        id: intercompanyDeals.id,
        originEntityName: organization.name,
        name: intercompanyDeals.name,
        accountName: intercompanyDeals.accountName,
        currency: intercompanyDeals.currency,
        estimatedAmount: intercompanyDeals.estimatedAmount,
        quotedAmount: intercompanyDeals.quotedAmount,
        shareType: intercompanyDeals.shareType,
        shareValue: intercompanyDeals.shareValue,
        partnerCurrency: intercompanyDeals.partnerCurrency,
        manualFxRate: intercompanyDeals.manualFxRate,
        status: intercompanyDeals.status,
        stageName: intercompanyDeals.stageName,
        expectedCloseDate: intercompanyDeals.expectedCloseDate,
        projectYear: intercompanyDeals.projectYear,
        updatedAt: intercompanyDeals.updatedAt,
        response: intercompanyDealResponses.response,
        responseReason: intercompanyDealResponses.reason,
        respondedAt: intercompanyDealResponses.respondedAt,
        projectId: projects.id,
        projectCode: projects.projectCode,
      })
      .from(intercompanyDeals)
      .leftJoin(organization, eq(intercompanyDeals.tenantId, organization.id))
      .leftJoin(
        intercompanyDealResponses,
        eq(intercompanyDealResponses.dealId, intercompanyDeals.id)
      )
      // Local delivery project (RLS scopes projects to this tenant, so only
      // OUR project can match).
      .leftJoin(
        projects,
        eq(projects.intercompanyDealId, intercompanyDeals.id)
      )
      .where(where)
      .orderBy(ordering, desc(intercompanyDeals.id))
      .limit(limit).offset(offset),
      tx.select({ count: sql<number>`count(*)::int` }).from(intercompanyDeals)
        .leftJoin(organization, eq(intercompanyDeals.tenantId, organization.id))
        .leftJoin(intercompanyDealResponses, eq(intercompanyDealResponses.dealId, intercompanyDeals.id))
        .leftJoin(projects, eq(projects.intercompanyDealId, intercompanyDeals.id))
        .where(where),
    ])
    return { rows, total: totalRows[0]?.count ?? 0 }
  })
}

export async function listInboundIntercompanyFilterOptions() {
  return withModule("finance", PERMISSIONS.INTERCOMPANY_VIEW, async (tx, ctx) => {
    const [row] = await tx.select({
      statuses: sql<string[]>`coalesce(jsonb_agg(distinct ${intercompanyDeals.status}), '[]'::jsonb)`,
      responses: sql<string[]>`coalesce(jsonb_agg(distinct ${intercompanyDealResponses.response}) filter (where ${intercompanyDealResponses.response} is not null), '[]'::jsonb)`,
    }).from(intercompanyDeals)
      .leftJoin(intercompanyDealResponses, eq(intercompanyDealResponses.dealId, intercompanyDeals.id))
      .where(eq(intercompanyDeals.partnerTenantId, ctx.tenantId))
    return { statuses: (row?.statuses ?? []).sort(), responses: (row?.responses ?? []).sort() }
  })
}

/**
 * Accept or decline an inbound intercompany assignment. One response per
 * deal; responding again overwrites (e.g. decline after a mistaken accept).
 * The origin entity sees the response on its funnel detail page.
 */
export async function respondToIntercompanyDeal(
  dealId: string,
  response: IntercompanyResponseValue,
  reason?: string
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withModule("finance", PERMISSIONS.INTERCOMPANY_VIEW, async (tx, ctx) => {
      const [deal] = await tx
        .select({
          id: intercompanyDeals.id,
          originTenantId: intercompanyDeals.tenantId,
        })
        .from(intercompanyDeals)
        .where(
          and(
            eq(intercompanyDeals.id, dealId),
            eq(intercompanyDeals.partnerTenantId, ctx.tenantId)
          )
        )
        .limit(1)
      if (!deal)
        throw new Error("Deal not found or not assigned to this entity.")

      const trimmed = (reason ?? "").trim()
      if (response === "declined" && !trimmed) {
        throw new Error("A reason is required when declining.")
      }

      const values = {
        dealId: deal.id,
        tenantId: ctx.tenantId,
        originTenantId: deal.originTenantId,
        response,
        reason: trimmed || null,
        respondedByMemberId: ctx.memberId,
        respondedAt: new Date(),
        updatedAt: new Date(),
      }
      await tx
        .insert(intercompanyDealResponses)
        .values(values)
        .onConflictDoUpdate({
          target: intercompanyDealResponses.dealId,
          set: values,
        })

      await writeAudit(tx, ctx, {
        action: `intercompany.${response}`,
        entityType: "intercompany_deal",
        entityId: deal.id,
        after: { response, reason: trimmed || null },
      })
    })
    revalidatePath("/intercompany")
  })
}

/**
 * Ensure a local internal Account exists representing the ORIGIN sibling entity
 * of an inbound intercompany deal, and return it. Idempotent — reuses a live
 * account already named after the origin entity rather than creating a
 * duplicate. Used by the "create delivery project" flow so the partner doesn't
 * have to hand-create an account for the sibling entity first.
 */
export async function ensureOriginEntityAccount(
  dealId: string
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(async () => {
    return withModule("finance", PERMISSIONS.ACCOUNT_CREATE, async (tx, ctx) => {
      const [deal] = await tx
        .select({
          id: intercompanyDeals.id,
          originEntityName: organization.name,
        })
        .from(intercompanyDeals)
        .leftJoin(organization, eq(intercompanyDeals.tenantId, organization.id))
        .where(
          and(
            eq(intercompanyDeals.id, dealId),
            eq(intercompanyDeals.partnerTenantId, ctx.tenantId)
          )
        )
        .limit(1)
      if (!deal)
        throw new Error("Deal not found or not assigned to this entity.")
      const entityName =
        (deal.originEntityName ?? "").trim() || "Origin entity"

      // Reuse an existing live account with this name (idempotent).
      const [existing] = await tx
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(
          and(
            eq(accounts.tenantId, ctx.tenantId),
            eq(accounts.name, entityName),
            isNull(accounts.deletedAt)
          )
        )
        .limit(1)
      if (existing) return existing

      const [created] = await tx
        .insert(accounts)
        .values({
          tenantId: ctx.tenantId,
          name: entityName,
          // The sibling entity we bill through is a channel/reseller to us.
          accountType: "reseller",
          ownerMemberId: ctx.memberId,
        })
        .returning({ id: accounts.id, name: accounts.name })

      await writeAudit(tx, ctx, {
        action: "account.created",
        entityType: "account",
        entityId: created.id,
        after: { name: entityName, source: "intercompany-auto-provision" },
      })
      revalidatePath("/accounts")
      return created
    })
  })
}
