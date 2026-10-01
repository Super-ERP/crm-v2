import "server-only"
import { and, eq, isNull, lte, asc, sql, count, type SQL } from "drizzle-orm"
import { requireContext } from "@/lib/server-context"
import { db, runInTenant } from "@/db"
import {
  stageApprovalRequests,
  funnels,
  activities,
  leads,
  accounts,
  persons,
  pipelineStages,
  taxSettings,
  member,
  user,
  tenantSettings,
  financeDocs,
  opportunityProducts,
  quotations,
} from "@/db/schema"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { DEFAULT_REMINDER_DAYS } from "@/lib/tenant-defaults"
import { canViewAllRecords } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"

export type PendingApproval = {
  id: string
  funnelId: string
  opportunityName: string
  reason: string
  requestedAt: Date
}

export type FollowUpDue = {
  id: string
  subject: string
  entityType: string
  entityId: string
  dueAt: Date
}

export type StaleDeal = {
  id: string
  name: string
  /** Last touch = the later of the funnel's own update and its latest activity. */
  lastTouchAt: Date
}

export type OverdueInvoice = {
  id: string
  number: string
  partyName: string | null
  amount: string
  currency: string
  dueDate: string
  reminderStage: number
}

export type OpenPipeline = {
  count: number
  byCurrency: { currency: string; count: number; total: string }[]
}

/**
 * One stacked-bar segment for the sales-by-Account-owner chart:
 * a single (Account Owner × Sales Stage) cell, measured by the summed
 * estimated funnel amount. Each cell belongs to one currency; unlike the
 * Salesforce source, this tenant may contain deals in several currencies.
 */
export type SalesByOwnerStage = {
  ownerMemberId: string
  ownerName: string
  currency: string
  stageId: string
  stageName: string
  /** Stage ladder position, so the client can order/stack segments. */
  stageSort: number
  /** Σ estimated funnel amount for this owner×stage cell. */
  amount: number
}

/**
 * One bar for the "Quandatics Closed Deals by Products" chart: the summed
 * line-item amount of CLOSED-WON funnels grouped by product category.
 * Sourced from opportunity_products (the SF OpportunityLineItem import),
 * which carries the productCategory + line totalPrice.
 */
export type ClosedDealsByProduct = {
  category: string
  currency: string
  amount: number
}

/**
 * One bar for the "Sales Activity This Year" chart: count of activities
 * logged per calendar month (Jan…current month), tenant-wide.
 */
export type SalesActivityMonth = {
  /** 1–12 */
  month: number
  count: number
}

/**
 * Derived completion for the getting-started checklist. Seeded items (funnel
 * stages + SST tax/currency) start checked so progress shows on day one.
 */
export type GettingStarted = {
  /** First lead captured. */
  hasLead: boolean
  /** At least one account or contact exists. */
  hasAccountOrContact: boolean
  /** Funnel stages reviewed (seeded by default → pre-checked). */
  hasStages: boolean
  /** Currency + SST tax configured (seeded by default → pre-checked). */
  hasCurrencyTax: boolean
  /** A teammate has been brought into the workspace. */
  hasTeammate: boolean
}

export type DashboardData = {
  /** Pending stage-approval requests the user can actually action: every
   *  pending request in the tenant for a platform superadmin, otherwise only those
   *  routed to them. Mirrors /approvals "Incoming" so the two never disagree. */
  pendingApprovals: PendingApproval[]
  pendingApprovalsCount: number
  /** True for platform superadmins (sees/acts on all pending requests),
   *  so the UI titles the card "Pending Approvals" rather than "Assigned to me". */
  canApproveAll: boolean
  followUpsDue: FollowUpDue[]
  followUpsDueCount: number
  followUpDueDays: number
  /** My open pipelines with no activity for `staleDealDays` (empty when off). */
  staleDeals: StaleDeal[]
  /** The configured nudge threshold (null = feature off). */
  staleDealDays: number | null
  /** Issued customer invoices past their due date (finance module only). */
  overdueInvoices: OverdueInvoice[]
  /** Reminder schedule (days after due) for the reminder-stage chips. */
  reminderSchedule: number[]
  /** The current member's own open funnel rollup ("My"). */
  myOpenPipeline: OpenPipeline
  /** Tenant-wide open funnel rollup ("Team"), present only for view-all roles
   *  (records.view_all / superadmin) so an Owner/Viewer who owns nothing still
   *  lands on a useful page. Null otherwise. */
  orgOpenPipeline: OpenPipeline | null
  /** True when the user may see all records (drives the My/Team toggle). */
  canViewAll: boolean
  /** True when the tenant has no leads/accounts/contacts/pipelines yet — render
   *  the "Get started" hero instead of the "all caught up" dashboard. */
  isFirstRun: boolean
  gettingStarted: GettingStarted
  /** Estimated amount by Account owner, stage, and currency. */
  salesByOwnerStage: SalesByOwnerStage[]
  /** Closed-won line amount by product category and currency. */
  closedDealsByProduct: ClosedDealsByProduct[]
  /** SF "Sales Activity This Year" — activity count by month. */
  salesActivityByMonth: SalesActivityMonth[]
  defaultCurrency: string
}

/**
 * Build the actionable dashboard lists for the current member: approvals
 * awaiting their decision, follow-ups coming due, and a rollup of their open
 * pipeline.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const ctx = await requireContext()
  const memberId = ctx.memberId
  const canViewAll = canViewAllRecords(ctx)
  const canApproveAll = ctx.isSuperadmin
  // Match the manager-only inbox; ordinary permission holders cannot act on unrelated requests.
  return runInTenant(ctx.tenantId, async (tx) => {
    const approvalWhere: SQL | undefined = ctx.isSuperadmin
      ? eq(stageApprovalRequests.status, "pending")
      : memberId && ctx.can(PERMISSIONS.STAGE_ADVANCE_APPROVE)
        ? and(eq(stageApprovalRequests.approverMemberId, memberId), eq(stageApprovalRequests.status, "pending"))
        : undefined

    const [approvalCount] = approvalWhere ? await tx.select({ value: count() }).from(stageApprovalRequests).where(approvalWhere) : []
    const pendingApprovalsCount = approvalCount?.value ?? 0
    const pendingApprovals: PendingApproval[] = approvalWhere
      ? (
          await tx
            .select({
              id: stageApprovalRequests.id,
              funnelId: stageApprovalRequests.funnelId,
              opportunityName: funnels.name,
              reason: stageApprovalRequests.reason,
              requestedAt: stageApprovalRequests.requestedAt,
            })
            .from(stageApprovalRequests)
            .innerJoin(
              funnels,
              eq(funnels.id, stageApprovalRequests.funnelId)
            )
            .where(approvalWhere)
            .orderBy(asc(stageApprovalRequests.requestedAt), asc(stageApprovalRequests.id))
            .limit(5)
        ).map((r) => ({
          id: r.id,
          funnelId: r.funnelId,
          opportunityName: r.opportunityName,
          reason: r.reason,
          requestedAt: r.requestedAt,
        }))
      : []

    // Behavior windows — tenant-configurable (Settings → General → Behavior).
    const [s] = await tx
      .select({
        followUpDueDays: tenantSettings.followUpDueDays,
        staleDealDays: tenantSettings.staleDealDays,
        invoiceReminderDays: tenantSettings.invoiceReminderDays,
        defaultCurrency: tenantSettings.defaultCurrency,
      })
      .from(tenantSettings)
      .where(eq(tenantSettings.organizationId, ctx.tenantId))
      .limit(1)
    const dueDays = s?.followUpDueDays ?? 7
    const staleDealDays = s?.staleDealDays ?? null

    // Overdue customer invoices — finance add-on, capability-gated.
    const financeOn =
      (await getEntitledModuleMap()).finance && ctx.can(PERMISSIONS.FINANCE_VIEW)
    const reminderSchedule = financeOn
      ? s?.invoiceReminderDays?.length
        ? s.invoiceReminderDays
        : DEFAULT_REMINDER_DAYS
      : []
    const overdueInvoices: OverdueInvoice[] = financeOn
      ? await tx
          .select({
            id: financeDocs.id,
            number: financeDocs.number,
            partyName: financeDocs.partyName,
            amount: financeDocs.amount,
            currency: financeDocs.currency,
            dueDate: sql<string>`${financeDocs.dueDate}`,
            reminderStage: financeDocs.reminderStage,
          })
          .from(financeDocs)
          .where(
            and(
              eq(financeDocs.kind, "invoice"),
              eq(financeDocs.status, "issued"),
              sql`${financeDocs.dueDate} < current_date`
            )
          )
          .orderBy(asc(financeDocs.dueDate))
          .limit(10)
      : []

    const followUpRows = memberId
      ? (
          await tx
            .select({
              id: activities.id,
              subject: activities.subject,
              entityType: activities.entityType,
              entityId: activities.entityId,
              dueAt: activities.dueAt,
              totalDue: sql<number>`count(*) over()::int`,
            })
            .from(activities)
            .where(
              and(
                eq(activities.memberId, memberId),
                sql`${activities.dueAt} is not null`,
                lte(
                  activities.dueAt,
                  sql`now() + make_interval(days => ${dueDays})`
                )
              )
            )
            .orderBy(asc(activities.dueAt))
            .limit(10)
        )
      : []
    const followUpsDueCount = followUpRows[0]?.totalDue ?? 0
    const followUpsDue: FollowUpDue[] = followUpRows.map((r) => ({
          id: r.id,
          subject: r.subject ?? "Follow-up",
          entityType: r.entityType,
          entityId: r.entityId,
          dueAt: r.dueAt as Date,
        }))

    // Stale-funnel nudges: MY open deals whose last touch — the later of the
    // record's own update and its newest activity — is older than the
    // threshold. Oldest first, capped so a long-neglected book doesn't flood
    // the dashboard.
    const lastTouch = sql<Date>`greatest(${funnels.updatedAt}, coalesce((
      select max(recent_activity.occurred_at)
      from activities recent_activity
      where recent_activity.tenant_id = ${ctx.tenantId}
        and recent_activity.entity_type = 'opportunity'
        and recent_activity.entity_id = ${funnels.id}
    ), ${funnels.updatedAt}))`
    const staleDeals: StaleDeal[] =
      staleDealDays && memberId
        ? (
            await tx
              .select({
                id: funnels.id,
                name: funnels.name,
                lastTouchAt: lastTouch,
              })
              .from(funnels)
              .where(and(
                eq(funnels.status, "open"),
                isNull(funnels.deletedAt),
                eq(funnels.ownerMemberId, memberId),
                sql`${lastTouch} < now() - make_interval(days => ${staleDealDays})`
              ))
              .orderBy(asc(lastTouch))
              .limit(10)
          ).map((r) => ({
            id: r.id,
            name: r.name,
            lastTouchAt: new Date(r.lastTouchAt),
          }))
        : []

    // Grouped by effective value currency so we never sum across currencies
    // (no implicit FX). A primary quotation drives funnels.amount, so its
    // currency takes precedence over the funnel's original currency.
    // `ownerFilter` undefined → tenant-wide rollup (RLS still scopes to tenant).
    const pipelineFor = async (
      ownerFilter: SQL | undefined
    ): Promise<OpenPipeline> => {
      const valueCurrency = sql<string>`coalesce(${quotations.currency}, ${funnels.currency})`
      const rows = await tx
        .select({
          currency: valueCurrency,
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${funnels.amount}), 0)`,
        })
        .from(funnels)
        .leftJoin(quotations, and(
          eq(funnels.primaryQuotationId, quotations.id),
          isNull(quotations.deletedAt)
        ))
        .where(
          and(
            eq(funnels.status, "open"),
            isNull(funnels.deletedAt),
            ownerFilter
          )
        )
        .groupBy(valueCurrency)

      const count = rows.reduce((n, r) => n + Number(r.count), 0)
      return {
        count,
        byCurrency: rows.map((r) => ({
          currency: r.currency,
          count: Number(r.count),
          total: r.total,
        })),
      }
    }

    const myOpenPipeline: OpenPipeline = memberId
      ? await pipelineFor(eq(funnels.ownerMemberId, memberId))
      : { count: 0, byCurrency: [] }
    // Tenant-wide rollup only for view-all roles; gives an Owner/Viewer who owns
    // nothing a useful landing page (the My/Team toggle defaults to this).
    const orgOpenPipeline: OpenPipeline | null = canViewAll
      ? await pipelineFor(undefined)
      : null

    // Dashboard sales charts.
    // Chart 1: estimated funnel amount by
    // Account Owner × Sales Stage. Tenant-wide (RLS scopes to the tenant); the
    // owner name comes from the auth schema (member → user), joined the same
    // way listOpportunities() does. Scoped users see only their own records.
    const salesByOwnerStage: SalesByOwnerStage[] = (
      await tx
        .select({
          ownerMemberId: funnels.ownerMemberId,
          ownerName: user.name,
          currency: funnels.currency,
          stageId: pipelineStages.id,
          stageName: pipelineStages.name,
          stageSort: pipelineStages.sortOrder,
          amount: sql<string>`coalesce(sum(${funnels.estimatedAmount}), 0)`,
        })
        .from(funnels)
        .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
        .leftJoin(member, eq(funnels.ownerMemberId, member.id))
        .leftJoin(user, eq(member.userId, user.id))
        .where(and(
          isNull(funnels.deletedAt),
          canViewAll ? undefined : memberId ? eq(funnels.ownerMemberId, memberId) : sql`false`
        ))
        .groupBy(
          funnels.ownerMemberId,
          user.name,
          funnels.currency,
          pipelineStages.id,
          pipelineStages.name,
          pipelineStages.sortOrder
        )
    ).map((r) => ({
      ownerMemberId: r.ownerMemberId,
      ownerName: r.ownerName ?? "Unassigned",
      currency: r.currency,
      stageId: r.stageId,
      stageName: r.stageName,
      stageSort: r.stageSort,
      amount: Number(r.amount),
    }))

    // Chart 2: line amount by product
    // category for CLOSED-WON funnels. Sourced from opportunity_products (the SF
    // OpportunityLineItem import), which is the only table carrying both a
    // product category and a per-line amount. Tenant RLS and record scope both
    // apply. Lines
    // with no category fall under "Uncategorized". Synced lines inherit the
    // primary quotation currency, not the funnel's original currency.
    const closedDealsByProduct: ClosedDealsByProduct[] = (
      await tx
        .select({
          category: sql<string>`coalesce(nullif(${opportunityProducts.productCategory}, ''), 'Uncategorized')`,
          currency: sql<string>`coalesce(${quotations.currency}, ${funnels.currency})`,
          amount: sql<string>`coalesce(sum(coalesce(${opportunityProducts.totalPrice}, 0)), 0)`,
        })
        .from(opportunityProducts)
        .innerJoin(funnels, eq(opportunityProducts.funnelId, funnels.id))
        .leftJoin(quotations, and(
          eq(funnels.primaryQuotationId, quotations.id),
          isNull(quotations.deletedAt)
        ))
        .where(and(
          eq(funnels.status, "won"),
          isNull(funnels.deletedAt),
          canViewAll ? undefined : memberId ? eq(funnels.ownerMemberId, memberId) : sql`false`
        ))
        .groupBy(
          sql`coalesce(nullif(${opportunityProducts.productCategory}, ''), 'Uncategorized')`,
          sql`coalesce(${quotations.currency}, ${funnels.currency})`
        )
    ).map((r) => ({
      category: r.category,
      currency: r.currency,
      amount: Number(r.amount),
    }))

    // Chart 3 — "Sales Activity This Year": count of activities logged per
    // calendar month, filtered to the member unless they have view-all access.
    const salesActivityByMonth: SalesActivityMonth[] = (
      await tx
        .select({
          month: sql<number>`extract(month from ${activities.occurredAt})`,
          count: sql<string>`count(*)`,
        })
        .from(activities)
        .where(and(
          sql`${activities.occurredAt} >= date_trunc('year', now())
            and ${activities.occurredAt} < date_trunc('year', now()) + interval '1 year'`,
          canViewAll ? undefined : memberId ? eq(activities.memberId, memberId) : sql`false`
        ))
        .groupBy(sql`extract(month from ${activities.occurredAt})`)
    ).map((r) => ({
      month: Number(r.month),
      count: Number(r.count),
    }))

    // These are boolean checklist gates, so stop at the first matching row
    // instead of counting entire tables in six separate round trips.
    const [presence] = await tx.select({
      hasLead: sql<boolean>`exists(select 1 from ${leads} where ${leads.deletedAt} is null)`,
      hasAccount: sql<boolean>`exists(select 1 from ${accounts} where ${accounts.deletedAt} is null)`,
      hasPerson: sql<boolean>`exists(select 1 from ${persons} where ${persons.deletedAt} is null)`,
      hasFunnel: sql<boolean>`exists(select 1 from ${funnels} where ${funnels.deletedAt} is null)`,
      hasStage: sql<boolean>`exists(select 1 from ${pipelineStages})`,
      hasTax: sql<boolean>`exists(select 1 from ${taxSettings})`,
    }).from(sql`(select 1) as dashboard_presence`)

    // Member count is sourced from the auth schema (not tenant-RLS scoped), so
    // query it on the base connection by organization.
    const [memberPresence] = await db
        .select({ hasTeammate: sql<boolean>`(count(*) > 1)` })
        .from(member)
        .where(eq(member.organizationId, ctx.tenantId))

    const gettingStarted: GettingStarted = {
      hasLead: presence.hasLead,
      hasAccountOrContact: presence.hasAccount || presence.hasPerson,
      hasStages: presence.hasStage,
      hasCurrencyTax: presence.hasTax,
      hasTeammate: memberPresence?.hasTeammate ?? false,
    }

    const isFirstRun =
      !presence.hasLead &&
      !presence.hasAccount &&
      !presence.hasPerson &&
      !presence.hasFunnel

    return {
      pendingApprovals,
      pendingApprovalsCount,
      canApproveAll,
      followUpsDue,
      followUpsDueCount,
      followUpDueDays: dueDays,
      staleDeals,
      staleDealDays,
      overdueInvoices,
      reminderSchedule,
      myOpenPipeline,
      orgOpenPipeline,
      canViewAll,
      isFirstRun,
      gettingStarted,
      salesByOwnerStage,
      closedDealsByProduct,
      salesActivityByMonth,
      defaultCurrency: s?.defaultCurrency ?? "MYR",
    }
  })
}
