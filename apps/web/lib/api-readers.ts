import "server-only"
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { expectedCloseYearFilter } from "@/server/services/funnel-filters"
import type { RecordListQuery } from "@/lib/record-list-query"
import { type Tx, type ServerContext } from "@/lib/actions"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions"
import {
  visibleMemberIds,
  ownerScope,
  ownsOrManages,
} from "@/lib/access-scope"
import {
  leads,
  accounts,
  persons,
  pipelines,
  pipelineStages,
  funnels,
  opportunities,
  opportunityProducts,
  quotations,
  quotationLineItems,
  projects,
  member,
  user,
  organization,
  funnelStageHistory,
  stageApprovalRequests,
  intercompanyDeals,
  intercompanyDealParties,
  intercompanyDealResponses,
} from "@/db/schema"
import type { QuotationStatus } from "@/lib/quotation-transitions"

/**
 * Shared read layer for the six list/detail CRM resources. Each `<entity>List`
 * / `<entity>Get` pair is the exact Drizzle query body that used to live inline
 * inside the corresponding UI server action's `withTenant(...)` callback — moved
 * here so the server action AND (later) the REST API route handler call the
 * SAME implementation. Behavior-preserving: callers control paging via
 * `{ limit, offset }`; the UI actions pass their historical defaults (see each
 * actions.ts) so their return shape/values are unchanged.
 */

export type PagingOpts = { limit: number; offset: number }
export type ReadResult<T> = { rows: T[]; total: number }

const countOf = (rows: { count: number }[]): number => rows[0]?.count ?? 0

// ---------------------------------------------------------------------------
// leads (apps/web/app/(app)/leads/actions.ts)
// ---------------------------------------------------------------------------

export type LeadRow = typeof leads.$inferSelect

export async function leadsList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query }: PagingOpts & { query?: RecordListQuery }
): Promise<ReadResult<LeadRow>> {
  const visible = await visibleMemberIds(tx, ctx)
  const search = query?.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
  const validStatuses = ["new", "contacted", "qualified", "disqualified", "converted"] as const
  const statuses = query?.selections.status?.filter((value): value is (typeof validStatuses)[number] => validStatuses.includes(value as (typeof validStatuses)[number]))
  const where = and(
    isNull(leads.deletedAt), ownerScope(leads.ownerMemberId, visible),
    search ? or(ilike(leads.name, search), ilike(leads.companyName, search), ilike(leads.email, search), ilike(leads.phone, search), ilike(leads.mobile, search), ilike(leads.source, search), ilike(user.name, search)) : undefined,
    statuses?.length ? inArray(leads.status, statuses) : undefined,
    query?.selections.source?.length ? inArray(leads.source, query.selections.source) : undefined,
    query?.selections.ownerName?.length ? inArray(user.name, query.selections.ownerName) : undefined
  )
  const sortColumns = { name: leads.name, company: leads.companyName, status: leads.status, ownerName: user.name, source: leads.source, createdAt: leads.createdAt }
  const sortColumn = query?.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
  const ordering = sortColumn ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(leads.createdAt)
  const [rows, totalRows] = await Promise.all([
    tx
      .select()
      .from(leads)
      .leftJoin(member, eq(leads.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id))
      .where(where)
      .orderBy(ordering, desc(leads.id))
      .limit(limit)
      .offset(offset),
    tx.select({ count: sql<number>`count(*)::int` }).from(leads)
      .leftJoin(member, eq(leads.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id)).where(where),
  ])
  return { rows: rows.map((row) => row.leads), total: countOf(totalRows) }
}

export async function leadsFilterSources(tx: Tx, ctx: ServerContext): Promise<string[]> {
  const visible = await visibleMemberIds(tx, ctx)
  const rows = await tx.selectDistinct({ value: leads.source }).from(leads)
    .where(and(isNull(leads.deletedAt), ownerScope(leads.ownerMemberId, visible), sql`${leads.source} is not null`))
    .orderBy(asc(leads.source))
  return rows.flatMap((row) => row.value ? [row.value] : [])
}

export type LeadDetail = {
  lead: LeadRow
  stageName: string | null
  funnelName: string | null
  accountName: string | null
  personName: string | null
}

export async function leadsGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<LeadDetail | null> {
  const visible = await visibleMemberIds(tx, ctx)
  const [lead] = await tx
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)
  if (!lead) return null
  if (!ownsOrManages(visible, lead.ownerMemberId)) return null

  let stageName: string | null = null
  if (lead.currentStageId) {
    const [stage] = await tx
      .select({ name: pipelineStages.name })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, lead.currentStageId))
      .limit(1)
    stageName = stage?.name ?? null
  }

  let funnelName: string | null = null
  if (lead.pipelineId) {
    const [funnel] = await tx
      .select({ name: pipelines.name })
      .from(pipelines)
      .where(eq(pipelines.id, lead.pipelineId))
      .limit(1)
    funnelName = funnel?.name ?? null
  }

  let accountName: string | null = null
  if (lead.convertedAccountId) {
    const [acct] = await tx
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, lead.convertedAccountId))
      .limit(1)
    accountName = acct?.name ?? null
  }

  let personName: string | null = null
  if (lead.convertedPersonId) {
    const [p] = await tx
      .select({ firstName: persons.firstName, lastName: persons.lastName })
      .from(persons)
      .where(eq(persons.id, lead.convertedPersonId))
      .limit(1)
    if (p) personName = [p.firstName, p.lastName].filter(Boolean).join(" ")
  }

  return { lead, stageName, funnelName, accountName, personName }
}

// ---------------------------------------------------------------------------
// accounts (apps/web/app/(app)/accounts/actions.ts)
// ---------------------------------------------------------------------------

export type AccountRow = typeof accounts.$inferSelect

export type AccountListItem = AccountRow & {
  parentAccountName: string | null
  ownerName: string | null
}

export async function accountsList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query }: PagingOpts & { query?: RecordListQuery }
): Promise<ReadResult<AccountListItem>> {
  const visible = await visibleMemberIds(tx, ctx)
  const parent = alias(accounts, "account_list_parent")
  const search = query?.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
  const where = and(
    isNull(accounts.deletedAt), ownerScope(accounts.ownerMemberId, visible),
    search ? or(ilike(accounts.name, search), ilike(accounts.code, search), ilike(accounts.registrationNumber, search), ilike(accounts.industry, search), ilike(user.name, search)) : undefined,
    query?.selections.accountType?.length ? inArray(accounts.accountType, query.selections.accountType) : undefined,
    query?.selections.industry?.length ? inArray(accounts.industry, query.selections.industry) : undefined,
    query?.selections.ownerName?.length ? inArray(user.name, query.selections.ownerName) : undefined
  )
  const sortColumns = { name: accounts.name, code: accounts.code, accountType: accounts.accountType, industry: accounts.industry, ownerName: user.name, createdAt: accounts.createdAt }
  const sortColumn = query?.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
  const ordering = sortColumn ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn) : asc(accounts.name)
  const [rows, totalRows] = await Promise.all([
    tx
      .select({ account: accounts, ownerName: user.name, parentName: parent.name })
      .from(accounts)
      .leftJoin(member, eq(accounts.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id))
      .leftJoin(parent, and(eq(accounts.parentAccountId, parent.id), isNull(parent.deletedAt)))
      .where(where)
      .orderBy(ordering, asc(accounts.id))
      .limit(limit)
      .offset(offset),
    tx.select({ count: sql<number>`count(*)::int` }).from(accounts)
      .leftJoin(member, eq(accounts.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id)).where(where),
  ])
  const mapped: AccountListItem[] = rows.map((r) => ({
    ...r.account,
    parentAccountName: r.parentName,
    ownerName: r.ownerName ?? null,
  }))
  return { rows: mapped, total: countOf(totalRows) }
}

export async function accountsFilterOptions(tx: Tx, ctx: ServerContext) {
  const visible = await visibleMemberIds(tx, ctx)
  const [row] = await tx.select({
    types: sql<string[]>`coalesce(jsonb_agg(distinct ${accounts.accountType}) filter (where ${accounts.accountType} is not null), '[]'::jsonb)`,
    industries: sql<string[]>`coalesce(jsonb_agg(distinct ${accounts.industry}) filter (where ${accounts.industry} is not null), '[]'::jsonb)`,
    owners: sql<string[]>`coalesce(jsonb_agg(distinct ${user.name}) filter (where ${user.name} is not null), '[]'::jsonb)`,
  }).from(accounts)
    .leftJoin(member, eq(accounts.ownerMemberId, member.id))
    .leftJoin(user, eq(member.userId, user.id))
    .where(and(isNull(accounts.deletedAt), ownerScope(accounts.ownerMemberId, visible)))
  return {
    types: (row?.types ?? []).sort(),
    industries: (row?.industries ?? []).sort(),
    owners: (row?.owners ?? []).sort(),
  }
}

export type AccountFunnelItem = {
  funnelId: string
  name: string
  status: string
  amount: string | null
  currency: string
  pipelineId: string
  stageId: string
  stageName: string
  stageCode: string
  stageKind: string
}

export type AccountDetail = {
  account: AccountRow
  parent: AccountRow | null
  endUserAccount: { id: string; name: string } | null
  children: AccountRow[]
  contacts: (typeof persons.$inferSelect)[]
  pipelines: AccountFunnelItem[]
  ownerName: string | null
}

export async function accountsGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<AccountDetail | null> {
  const visible = await visibleMemberIds(tx, ctx)
  const [account] = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), isNull(accounts.deletedAt)))
    .limit(1)
  if (!account) return null
  if (!ownsOrManages(visible, account.ownerMemberId)) return null

  const parent = account.parentAccountId
    ? ((
        await tx
          .select()
          .from(accounts)
          .where(
            and(eq(accounts.id, account.parentAccountId), isNull(accounts.deletedAt))
          )
          .limit(1)
      )[0] ?? null)
    : null

  // For resellers, resolve the linked end-user client account (name + id).
  const endUserAccount = account.endUserAccountId
    ? ((
        await tx
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(
            and(eq(accounts.id, account.endUserAccountId), isNull(accounts.deletedAt))
          )
          .limit(1)
      )[0] ?? null)
    : null

  const children = await tx
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.parentAccountId, id),
        isNull(accounts.deletedAt),
        ownerScope(accounts.ownerMemberId, visible)
      )
    )
    .orderBy(asc(accounts.name))

  const contacts = await tx
    .select()
    .from(persons)
    .where(and(eq(persons.accountId, id), isNull(persons.deletedAt)))
    .orderBy(asc(persons.firstName))

  const pipelinesForAccount = await tx
    .select({
      funnelId: funnels.id,
      name: funnels.name,
      status: funnels.status,
      amount: funnels.estimatedAmount,
      currency: funnels.currency,
      pipelineId: funnels.pipelineId,
      stageId: pipelineStages.id,
      stageName: pipelineStages.name,
      stageCode: pipelineStages.code,
      stageKind: pipelineStages.kind,
    })
    .from(funnels)
    .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
    .where(
      and(
        eq(funnels.accountId, id),
        isNull(funnels.deletedAt),
        ownerScope(funnels.ownerMemberId, visible)
      )
    )
    .orderBy(asc(pipelineStages.sortOrder), asc(funnels.name))

  // Resolve the account owner (member -> user name).
  const ownerName = account.ownerMemberId
    ? ((
        await tx
          .select({ name: user.name })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(eq(member.id, account.ownerMemberId))
          .limit(1)
      )[0]?.name ?? null)
    : null

  return {
    account,
    parent,
    endUserAccount,
    children,
    contacts,
    pipelines: pipelinesForAccount as AccountFunnelItem[],
    ownerName,
  }
}

// ---------------------------------------------------------------------------
// persons (apps/web/app/(app)/persons/actions.ts)
// ---------------------------------------------------------------------------

export type PersonRow = typeof persons.$inferSelect
export type PersonListItem = PersonRow & { accountName: string | null }

export async function personsList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query }: PagingOpts & { query?: RecordListQuery }
): Promise<ReadResult<PersonListItem>> {
  const visible = await visibleMemberIds(tx, ctx)
  const search = query?.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
  const primaryValues = query?.selections.primary ?? []
  const where = and(
    isNull(persons.deletedAt),
    isNull(accounts.deletedAt),
    ownerScope(accounts.ownerMemberId, visible),
    search ? or(ilike(persons.firstName, search), ilike(persons.lastName, search), ilike(persons.email, search), ilike(persons.phone, search), ilike(persons.title, search), ilike(persons.department, search), ilike(accounts.name, search)) : undefined,
    query?.selections.accountName?.length ? inArray(accounts.name, query.selections.accountName) : undefined,
    primaryValues.length === 1 && primaryValues[0] === "Primary" ? eq(persons.isPrimary, true) : undefined,
    primaryValues.length === 1 && primaryValues[0] === "Other" ? eq(persons.isPrimary, false) : undefined
  )
  const sortColumns = { name: persons.firstName, accountName: accounts.name, title: persons.title, email: persons.email, primary: persons.isPrimary }
  const sortColumn = query?.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
  const ordering = sortColumn ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn) : asc(persons.firstName)
  const [rows, totalRows] = await Promise.all([
    tx
      .select({ person: persons, accountName: accounts.name })
      .from(persons)
      .innerJoin(accounts, eq(persons.accountId, accounts.id))
      .where(where)
      .orderBy(ordering, asc(persons.lastName), asc(persons.id))
      .limit(limit)
      .offset(offset),
    tx
      .select({ count: sql<number>`count(*)::int` })
      .from(persons)
      .innerJoin(accounts, eq(persons.accountId, accounts.id))
      .where(where),
  ])
  return {
    rows: rows.map((r) => ({ ...r.person, accountName: r.accountName })),
    total: countOf(totalRows),
  }
}

export type PersonOpportunity = {
  id: string
  name: string
  amount: string | null
  currency: string
  status: string
  stageName: string | null
  stageKind: string | null
  stageProbability: string | null
}

export type PersonProject = {
  id: string
  name: string
  projectCode: string | null
  status: string
}

export type PersonDetail = {
  person: PersonRow
  accountName: string | null
  funnels: PersonOpportunity[]
  projects: PersonProject[]
}

export async function personsGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<PersonDetail | null> {
  const projectsEnabled = (await getEntitledModuleMap()).projects
  const visible = await visibleMemberIds(tx, ctx)
  const [row] = await tx
    .select({
      person: persons,
      accountName: accounts.name,
      accountOwner: accounts.ownerMemberId,
    })
    .from(persons)
    .innerJoin(accounts, eq(persons.accountId, accounts.id))
    .where(
      and(eq(persons.id, id), isNull(persons.deletedAt), isNull(accounts.deletedAt))
    )
    .limit(1)
  if (!row) return null
  if (!ownsOrManages(visible, row.accountOwner)) return null

  const opps = await tx
    .select({
      id: funnels.id,
      name: funnels.name,
      amount: funnels.estimatedAmount,
      currency: funnels.currency,
      status: funnels.status,
      stageName: pipelineStages.name,
      stageKind: pipelineStages.kind,
      stageProbability: pipelineStages.probability,
    })
    .from(funnels)
    .leftJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
    .where(and(eq(funnels.primaryPersonId, id), isNull(funnels.deletedAt)))
    .orderBy(desc(funnels.updatedAt))

  // Projects that belong to this contact's pipelines (the deals they're on).
  const oppIds = opps.map((o) => o.id)
  const projs = projectsEnabled && oppIds.length
    ? await tx
        .select({
          id: projects.id,
          name: projects.name,
          projectCode: projects.projectCode,
          status: projects.status,
        })
        .from(projects)
        .where(and(inArray(projects.funnelId, oppIds), isNull(projects.deletedAt)))
        .orderBy(desc(projects.updatedAt))
    : []

  return {
    person: row.person,
    accountName: row.accountName,
    funnels: opps,
    projects: projs,
  }
}

// ---------------------------------------------------------------------------
// opportunities — Opportunity containers (apps/web/app/(app)/opportunities/actions.ts)
// ---------------------------------------------------------------------------

export type ContactRef = { id: string; name: string; designation: string | null }

export type OpportunityContainerRow = {
  id: string
  code: string
  name: string
  accountId: string
  accountName: string
  accountCode: string | null
  accountOwnerMemberId: string | null
  accountOwnerName: string | null
  totalEstimatedFunnelAmount: string | null
  estimatedTotalsByCurrency: Array<{ currency: string; total: string }>
  funnelCount: number
  currency: string
  createdAt: Date
}

export async function opportunitiesList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query }: PagingOpts & { query?: RecordListQuery }
): Promise<ReadResult<OpportunityContainerRow>> {
  const visible = await visibleMemberIds(tx, ctx)
  const accountOwnerMember = alias(member, "opportunity_account_owner_member")
  const accountOwnerUser = alias(user, "opportunity_account_owner_user")
  const where = and(
    isNull(opportunities.deletedAt),
    ownerScope(opportunities.ownerMemberId, visible),
    query?.search ? or(
      ilike(opportunities.name, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`),
      ilike(opportunities.code, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`),
      ilike(accounts.name, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`),
      ilike(accounts.code, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`)
    ) : undefined,
    query?.selections.accountId?.length ? inArray(opportunities.accountId, query.selections.accountId) : undefined,
    query?.selections.accountOwnerMemberId?.length ? inArray(accounts.ownerMemberId, query.selections.accountOwnerMemberId) : undefined
  )
  const funnelCount = sql<number>`(select count(*) from ${funnels} where ${funnels.opportunityId} = ${opportunities.id} and ${funnels.deletedAt} is null)`
  const sortColumns = {
    name: opportunities.name,
    accountId: accounts.name,
    funnelCount,
    accountOwnerMemberId: accountOwnerUser.name,
  }
  const sortColumn = query?.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
  const ordering = sortColumn ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(opportunities.createdAt)
  const [rows, totalRows] = await Promise.all([
    tx
      .select({
        id: opportunities.id,
        code: opportunities.code,
        name: opportunities.name,
        accountId: opportunities.accountId,
        accountName: accounts.name,
        accountCode: accounts.code,
        accountOwnerMemberId: accounts.ownerMemberId,
        accountOwnerName: accountOwnerUser.name,
        totalEstimatedFunnelAmount: opportunities.totalEstimatedFunnelAmount,
        estimatedTotalsByCurrency: opportunities.estimatedTotalsByCurrency,
        currency: opportunities.currency,
        createdAt: opportunities.createdAt,
      })
      .from(opportunities)
      .innerJoin(accounts, eq(opportunities.accountId, accounts.id))
      .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
      .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
      .where(where)
      .orderBy(ordering, desc(opportunities.id))
      .limit(limit)
      .offset(offset),
    tx
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunities)
      .innerJoin(accounts, eq(opportunities.accountId, accounts.id))
      .where(where),
  ])

  if (rows.length === 0) return { rows: [], total: countOf(totalRows) }
  const counts = await tx
    .select({
      opportunityId: funnels.opportunityId,
      n: sql<number>`count(*)::int`,
    })
    .from(funnels)
    .where(
      and(isNull(funnels.deletedAt), inArray(funnels.opportunityId, rows.map((r) => r.id)))
    )
    .groupBy(funnels.opportunityId)
  const countBy = new Map(counts.map((c) => [c.opportunityId, c.n]))
  return {
    rows: rows.map((r) => ({ ...r, funnelCount: countBy.get(r.id) ?? 0 })),
    total: countOf(totalRows),
  }
}

export async function opportunitiesFilterOptions(tx: Tx, ctx: ServerContext) {
  const visible = await visibleMemberIds(tx, ctx)
  const accountOwnerMember = alias(member, "opportunity_filter_owner_member")
  const accountOwnerUser = alias(user, "opportunity_filter_owner_user")
  const [row] = await tx.select({
    accounts: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${accounts.id}, 'label', concat_ws(' — ', nullif(${accounts.code}, ''), ${accounts.name}))), '[]'::jsonb)`,
    owners: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${accounts.ownerMemberId}, 'label', coalesce(${accountOwnerUser.name}, 'Unknown'))) filter (where ${accounts.ownerMemberId} is not null), '[]'::jsonb)`,
  }).from(opportunities)
    .innerJoin(accounts, eq(opportunities.accountId, accounts.id))
    .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
    .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
    .where(and(isNull(opportunities.deletedAt), ownerScope(opportunities.ownerMemberId, visible)))
  const sort = (options: Array<{ value: string; label: string }>) => options.sort((a, b) => a.label.localeCompare(b.label))
  return { accounts: sort(row?.accounts ?? []), owners: sort(row?.owners ?? []) }
}

export type OpportunityContainerDetail = {
  opportunity: typeof opportunities.$inferSelect
  accountId: string
  accountName: string
  accountCurrency: string
  ownerName: string | null
  ownerContact: ContactRef | null
  powerSponsorContact: ContactRef | null
  funnels: {
    id: string
    name: string
    stageName: string | null
    stageKind: string | null
    status: string
    estimatedAmount: string | null
    currency: string
  }[]
  quotations: {
    id: string
    quoteNumber: string
    status: string
    total: string | null
    currency: string
    funnelId: string
    funnelName: string
  }[]
  products: {
    id: string
    description: string | null
    quantity: string
    unitPrice: string
    productCategory: string | null
    funnelId: string
    funnelName: string
  }[]
}

export async function opportunitiesGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<OpportunityContainerDetail | null> {
  const visible = await visibleMemberIds(tx, ctx)
  const [opp] = await tx
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt)))
    .limit(1)
  if (!opp) return null
  if (!ownsOrManages(visible, opp.ownerMemberId)) return null

  const [acct] = await tx
    .select({ name: accounts.name, currency: accounts.currency })
    .from(accounts)
    .where(eq(accounts.id, opp.accountId))
    .limit(1)
  const [owner] = await tx
    .select({ name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.id, opp.ownerMemberId))
    .limit(1)

  // Owner/Power Sponsor Contact — resolved with "Designation" (a Salesforce
  // formula field derived live from persons.title, never stored).
  async function resolveContact(personId: string | null): Promise<ContactRef | null> {
    if (!personId) return null
    const [p] = await tx
      .select({
        firstName: persons.firstName,
        lastName: persons.lastName,
        title: persons.title,
      })
      .from(persons)
      .where(eq(persons.id, personId))
      .limit(1)
    if (!p) return null
    return {
      id: personId,
      name: [p.firstName, p.lastName].filter(Boolean).join(" "),
      designation: p.title,
    }
  }
  const [ownerContact, powerSponsorContact] = await Promise.all([
    resolveContact(opp.ownerContactId),
    resolveContact(opp.powerSponsorContactId),
  ])

  const children = await tx
    .select({
      id: funnels.id,
      name: funnels.name,
      status: funnels.status,
      estimatedAmount: funnels.estimatedAmount,
      currency: funnels.currency,
      stageName: pipelineStages.name,
      stageKind: pipelineStages.kind,
    })
    .from(funnels)
    .leftJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
    .where(and(eq(funnels.opportunityId, id), isNull(funnels.deletedAt)))
    .orderBy(desc(funnels.createdAt))

  const funnelIds = children.map((c) => c.id)
  const funnelName = new Map(children.map((c) => [c.id, c.name]))

  // Quotations + products roll up from ALL funnels under this opportunity.
  const quotes = funnelIds.length
    ? await tx
        .select({
          id: quotations.id,
          quoteNumber: quotations.quoteNumber,
          status: quotations.status,
          total: quotations.total,
          currency: quotations.currency,
          funnelId: quotations.funnelId,
        })
        .from(quotations)
        .where(and(inArray(quotations.funnelId, funnelIds), isNull(quotations.deletedAt)))
        .orderBy(desc(quotations.createdAt))
    : []

  const prods = funnelIds.length
    ? await tx
        .select({
          id: opportunityProducts.id,
          description: opportunityProducts.description,
          quantity: opportunityProducts.quantity,
          unitPrice: opportunityProducts.unitPrice,
          productCategory: opportunityProducts.productCategory,
          funnelId: opportunityProducts.funnelId,
        })
        .from(opportunityProducts)
        .where(inArray(opportunityProducts.funnelId, funnelIds))
        .orderBy(desc(opportunityProducts.createdAt))
    : []

  return {
    opportunity: opp,
    accountId: opp.accountId,
    accountName: acct?.name ?? "—",
    accountCurrency: acct?.currency ?? "MYR",
    ownerName: owner?.name ?? null,
    ownerContact,
    powerSponsorContact,
    funnels: children,
    quotations: quotes.map((q) => ({
      ...q,
      funnelName: funnelName.get(q.funnelId) ?? "—",
    })),
    products: prods.map((p) => ({
      ...p,
      funnelName: funnelName.get(p.funnelId) ?? "—",
    })),
  }
}

// ---------------------------------------------------------------------------
// funnels — funnel/staged-deal rows (apps/web/app/(app)/funnel/actions.ts)
// ---------------------------------------------------------------------------

export type PartyInput = {
  partnerEntityId: string
  shareType: "percent" | "amount"
  shareValue: string
  currency?: string | null
  manualFxRate?: string | null
}

export type PartyRow = PartyInput & { partnerName: string }

/**
 * Live-resolved party rows for a set of funnels, grouped by funnelId. Entity
 * names resolve LIVE (`organization` is deliberately RLS-excluded, so this
 * sibling-entity join is allowed) so a rename in Settings propagates to every
 * deal that references it. Shared with funnel/actions.ts's mutation actions
 * (createOpportunity/updateOpportunity), which import it from here.
 */
export async function loadPartiesByOpportunity(
  tx: Tx,
  opportunityIds: string[]
): Promise<Map<string, PartyRow[]>> {
  const byOpp = new Map<string, PartyRow[]>()
  if (opportunityIds.length === 0) return byOpp
  const rows = await tx
    .select({
      funnelId: intercompanyDealParties.funnelId,
      partnerEntityId: intercompanyDealParties.partnerEntityId,
      partnerName: organization.name,
      shareType: intercompanyDealParties.shareType,
      shareValue: intercompanyDealParties.shareValue,
      currency: intercompanyDealParties.currency,
      manualFxRate: intercompanyDealParties.manualFxRate,
    })
    .from(intercompanyDealParties)
    .innerJoin(organization, eq(intercompanyDealParties.partnerEntityId, organization.id))
    .where(inArray(intercompanyDealParties.funnelId, opportunityIds))
    .orderBy(asc(intercompanyDealParties.sortOrder))
  for (const r of rows) {
    const list = byOpp.get(r.funnelId) ?? []
    list.push({
      partnerEntityId: r.partnerEntityId,
      partnerName: r.partnerName,
      shareType: r.shareType,
      shareValue: r.shareValue,
      currency: r.currency,
      manualFxRate: r.manualFxRate,
    })
    byOpp.set(r.funnelId, list)
  }
  return byOpp
}

export type OpportunityListRow = {
  id: string
  opportunityId: string
  name: string
  accountId: string
  accountName: string
  accountOwnerMemberId: string | null
  accountOwnerName: string | null
  opportunityName: string
  opportunityCode: string | null
  amount: string | null
  estimatedAmount: string | null
  recognizedPercent: string | null
  description: string | null
  projectYear: number | null
  isIntercompany: boolean
  parties: PartyRow[]
  currency: string
  status: string
  expectedCloseDate: string | null
  ownerMemberId: string
  ownerName: string | null
  stageId: string
  stageName: string
  stageKind: string
  stageProbability: string
  stageSortOrder: number
  pipelineId: string
  pipelineIsDefault: boolean
  primaryQuotationId: string | null
  projectNatureCode: string | null
  projectNatures: string[] | null
  pain: string | null
  power: string | null
  vision: string | null
  value: string | null
  control: string | null
  customFields: Record<string, string> | null
}

export async function funnelsList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query, stageId }: PagingOpts & { query?: RecordListQuery; stageId?: string }
): Promise<ReadResult<OpportunityListRow> & { valueTotal: string }> {
  const financeEnabled = (await getEntitledModuleMap()).finance
  const accountOwnerMember = alias(member, "funnel_account_owner_member")
  const accountOwnerUser = alias(user, "funnel_account_owner_user")
  const visible = await visibleMemberIds(tx, ctx)
  const search = query?.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
  const validStatuses = ["open", "won", "lost", "on_hold"] as const
  const statuses = query?.selections.status?.filter((value): value is (typeof validStatuses)[number] => validStatuses.includes(value as (typeof validStatuses)[number]))
  const where = and(
    isNull(funnels.deletedAt), ownerScope(funnels.ownerMemberId, visible),
    isNull(opportunities.deletedAt),
    search ? ilike(funnels.name, search) : undefined,
    query?.selections.accountId?.length ? inArray(funnels.accountId, query.selections.accountId) : undefined,
    query?.selections.opportunityId?.length ? inArray(funnels.opportunityId, query.selections.opportunityId) : undefined,
    query?.selections.id?.length ? inArray(funnels.id, query.selections.id) : undefined,
    query?.selections.accountOwnerMemberId?.length ? inArray(accounts.ownerMemberId, query.selections.accountOwnerMemberId) : undefined,
    query?.selections.ownerMemberId?.length ? inArray(funnels.ownerMemberId, query.selections.ownerMemberId) : undefined,
    query?.selections.stageId?.length ? inArray(funnels.currentStageId, query.selections.stageId) : undefined,
    expectedCloseYearFilter(funnels.expectedCloseDate, query?.selections.expectedCloseDate),
    statuses?.length ? inArray(funnels.status, statuses) : undefined,
    stageId ? eq(funnels.currentStageId, stageId) : undefined
  )
  const sortColumns = { id: funnels.name, accountId: accounts.name, amount: sql`coalesce(${funnels.estimatedAmount}, ${funnels.amount}, 0)`, expectedCloseDate: funnels.expectedCloseDate, ownerMemberId: user.name, status: funnels.status }
  const sortColumn = query?.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
  const ordering = sortColumn ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(funnels.createdAt)
  const [rows, totalRows] = await Promise.all([
    tx
      .select({
        id: funnels.id,
        opportunityId: funnels.opportunityId,
        name: funnels.name,
        accountId: funnels.accountId,
        accountName: accounts.name,
        accountOwnerMemberId: accounts.ownerMemberId,
        accountOwnerName: accountOwnerUser.name,
        opportunityName: opportunities.name,
        opportunityCode: opportunities.code,
        amount: funnels.amount,
        estimatedAmount: funnels.estimatedAmount,
        recognizedPercent: funnels.recognizedPercent,
        description: funnels.description,
        projectYear: funnels.projectYear,
        isIntercompany: funnels.isIntercompany,
        currency: funnels.currency,
        status: funnels.status,
        expectedCloseDate: funnels.expectedCloseDate,
        ownerMemberId: funnels.ownerMemberId,
        ownerName: user.name,
        stageId: pipelineStages.id,
        stageName: pipelineStages.name,
        stageKind: pipelineStages.kind,
        stageProbability: pipelineStages.probability,
        stageSortOrder: pipelineStages.sortOrder,
        pipelineId: funnels.pipelineId,
        pipelineIsDefault: pipelines.isDefault,
        primaryQuotationId: funnels.primaryQuotationId,
        projectNatureCode: funnels.projectNatureCode,
        projectNatures: funnels.projectNatures,
        pain: opportunities.pain,
        power: opportunities.power,
        vision: opportunities.vision,
        value: opportunities.value,
        control: opportunities.control,
        customFields: funnels.customFields,
      })
      .from(funnels)
      .innerJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
      .innerJoin(accounts, eq(funnels.accountId, accounts.id))
      .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
      .innerJoin(pipelines, eq(funnels.pipelineId, pipelines.id))
      .leftJoin(member, eq(funnels.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id))
      .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
      .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
      .where(where)
      .orderBy(ordering, desc(funnels.id))
      .limit(limit)
      .offset(offset),
    tx
      .select({ count: sql<number>`count(*)::int`, valueTotal: sql<string>`coalesce(sum(coalesce(${funnels.estimatedAmount}, ${funnels.amount}, 0)), 0)::text` })
      .from(funnels)
      .innerJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
      .innerJoin(accounts, eq(funnels.accountId, accounts.id))
      .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
      .innerJoin(pipelines, eq(funnels.pipelineId, pipelines.id))
      .leftJoin(member, eq(funnels.ownerMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id))
      .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
      .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
      .where(where),
  ])

  const partiesByOpp = financeEnabled
    ? await loadPartiesByOpportunity(
        tx,
        rows.map((r) => r.id)
      )
    : new Map<string, PartyRow[]>()
  return {
    rows: rows.map((r) => ({ ...r, parties: partiesByOpp.get(r.id) ?? [] })),
    total: countOf(totalRows),
    valueTotal: totalRows[0]?.valueTotal ?? "0",
  }
}

export async function funnelsFilterOptions(tx: Tx, ctx: ServerContext) {
  const visible = await visibleMemberIds(tx, ctx)
  const accountOwnerMember = alias(member, "funnel_filter_account_owner_member")
  const accountOwnerUser = alias(user, "funnel_filter_account_owner_user")
  const [row] = await tx.select({
    expectedCloseYears: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', extract(year from ${funnels.expectedCloseDate})::int::text, 'label', extract(year from ${funnels.expectedCloseDate})::int::text)) filter (where ${funnels.expectedCloseDate} is not null), '[]'::jsonb)`,
    accounts: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${accounts.id}, 'label', ${accounts.name})), '[]'::jsonb)`,
    opportunities: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${opportunities.id}, 'label', concat_ws(' — ', nullif(${opportunities.code}, ''), ${opportunities.name}))), '[]'::jsonb)`,
    funnels: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${funnels.id}, 'label', ${funnels.name})), '[]'::jsonb)`,
    accountOwners: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${accounts.ownerMemberId}, 'label', coalesce(${accountOwnerUser.name}, 'Unknown'))) filter (where ${accounts.ownerMemberId} is not null), '[]'::jsonb)`,
    owners: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${funnels.ownerMemberId}, 'label', coalesce(${user.name}, 'Unknown'))) filter (where ${funnels.ownerMemberId} is not null), '[]'::jsonb)`,
    stages: sql<Array<{ value: string; label: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('value', ${pipelineStages.id}, 'label', ${pipelineStages.name})), '[]'::jsonb)`,
  }).from(funnels)
    .innerJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
    .innerJoin(accounts, eq(funnels.accountId, accounts.id))
    .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
    .leftJoin(member, eq(funnels.ownerMemberId, member.id))
    .leftJoin(user, eq(member.userId, user.id))
    .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
    .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
    .where(and(isNull(funnels.deletedAt), isNull(opportunities.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
  const sort = (options: Array<{ value: string; label: string }>) => options.sort((a, b) => a.label.localeCompare(b.label))
  return {
    expectedCloseYears: (row?.expectedCloseYears ?? []).sort((a, b) => Number(b.value) - Number(a.value)),
    accounts: sort(row?.accounts ?? []), opportunities: sort(row?.opportunities ?? []),
    funnels: sort(row?.funnels ?? []), accountOwners: sort(row?.accountOwners ?? []),
    owners: sort(row?.owners ?? []), stages: sort(row?.stages ?? []),
  }
}

export type OpportunityDetail = {
  parties: PartyRow[]
  partnerResponses: {
    partnerEntityId: string
    response: "accepted" | "declined"
    reason: string | null
    respondedAt: Date
  }[]
  opportunity: typeof funnels.$inferSelect
  accountName: string
  accountCurrency: string
  container: typeof opportunities.$inferSelect | null
  personName: string | null
  ownerName: string | null
  stage: typeof pipelineStages.$inferSelect
  funnelStagesList: (typeof pipelineStages.$inferSelect)[]
  quoteNumber: string | null
  amountFromQuote: boolean
  pendingApproval: { id: string; targetStageName: string } | null
  quotations: {
    id: string
    quoteNumber: string
    status: QuotationStatus
    netValue: string
    total: string
    currency: string
    isPrimary: boolean
    deletedAt: Date | null
  }[]
  history: {
    id: string
    fromStageName: string | null
    toStageName: string
    source: string
    probabilityAtChange: string | null
    valueAtChange: string | null
    changedAt: Date
    changedByName: string | null
  }[]
}

export async function funnelsGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<OpportunityDetail | null> {
  const financeEnabled = (await getEntitledModuleMap()).finance
  const visible = await visibleMemberIds(tx, ctx)
  const [opp] = await tx
    .select()
    .from(funnels)
    .where(and(eq(funnels.id, id), isNull(funnels.deletedAt)))
    .limit(1)
  if (!opp) return null
  if (!ownsOrManages(visible, opp.ownerMemberId)) return null

  const [acct] = await tx
    .select({ name: accounts.name, currency: accounts.currency })
    .from(accounts)
    .where(eq(accounts.id, opp.accountId))
    .limit(1)

  // Parent Opportunity container (Salesforce-style — funnel belongs to one).
  const [container] = await tx
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, opp.opportunityId), isNull(opportunities.deletedAt)))
    .limit(1)

  // The handling partners, live-resolved (see loadPartiesByOpportunity).
  const parties = financeEnabled
    ? (await loadPartiesByOpportunity(tx, [id])).get(id) ?? []
    : []

  // Each party's accept/decline on their slice of the assignment (written by
  // the partner tenant; readable here via the origin-side RLS policy on
  // responses). One intercompanyDeals mirror row per party.
  let partnerResponses: OpportunityDetail["partnerResponses"] = []
  if (financeEnabled && opp.isIntercompany) {
    const rows = await tx
      .select({
        partnerEntityId: intercompanyDeals.partnerTenantId,
        response: intercompanyDealResponses.response,
        reason: intercompanyDealResponses.reason,
        respondedAt: intercompanyDealResponses.respondedAt,
      })
      .from(intercompanyDeals)
      .innerJoin(
        intercompanyDealResponses,
        eq(intercompanyDealResponses.dealId, intercompanyDeals.id)
      )
      .where(eq(intercompanyDeals.funnelId, id))
    partnerResponses = rows
  }

  let personName: string | null = null
  if (opp.primaryPersonId) {
    const [p] = await tx
      .select({ firstName: persons.firstName, lastName: persons.lastName })
      .from(persons)
      .where(eq(persons.id, opp.primaryPersonId))
      .limit(1)
    if (p) personName = [p.firstName, p.lastName].filter(Boolean).join(" ")
  }

  const [owner] = await tx
    .select({ name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.id, opp.ownerMemberId))
    .limit(1)

  const [stage] = await tx
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, opp.currentStageId))
    .limit(1)

  // Resolve the primary quotation's number so the summary can show that the
  // net deal value derives "from quotation <quoteNumber>".
  let quoteNumber: string | null = null
  if (opp.primaryQuotationId) {
    const [pq] = await tx
      .select({ quoteNumber: quotations.quoteNumber })
      .from(quotations)
      .where(eq(quotations.id, opp.primaryQuotationId))
      .limit(1)
    quoteNumber = pq?.quoteNumber ?? null
  }
  const amountFromQuote = quoteNumber !== null

  const funnelStagesList = await tx
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineId, opp.pipelineId))
    .orderBy(asc(pipelineStages.sortOrder))

  const quotes = await tx
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      status: quotations.status,
      total: quotations.total,
      netValue: sql<string>`${quotations.subtotal} - ${quotations.discountTotal}`,
      currency: quotations.currency,
      isPrimary: quotations.isPrimary,
      deletedAt: quotations.deletedAt,
    })
    .from(quotations)
    .where(eq(quotations.funnelId, id))
    .orderBy(desc(quotations.version))

  const toStage = alias(pipelineStages, "to_stage")
  const historyRows = await tx
    .select({
      id: funnelStageHistory.id,
      toStageName: toStage.name,
      source: funnelStageHistory.source,
      probabilityAtChange: funnelStageHistory.probabilityAtChange,
      valueAtChange: funnelStageHistory.valueAtChange,
      changedAt: funnelStageHistory.changedAt,
      fromStageId: funnelStageHistory.fromStageId,
      changedByName: user.name,
    })
    .from(funnelStageHistory)
    .innerJoin(toStage, eq(funnelStageHistory.toStageId, toStage.id))
    .leftJoin(member, eq(funnelStageHistory.changedByMemberId, member.id))
    .leftJoin(user, eq(member.userId, user.id))
    .where(eq(funnelStageHistory.funnelId, id))
    .orderBy(desc(funnelStageHistory.changedAt))

  // Resolve fromStage names with a single lookup map.
  const stageNameById = new Map(funnelStagesList.map((s) => [s.id, s.name]))

  // A pending approval freezes the funnel CTA on the detail page so the
  // requester sees the in-flight state instead of a still-active Advance.
  const [pending] = await tx
    .select({
      id: stageApprovalRequests.id,
      targetStageId: stageApprovalRequests.targetStageId,
    })
    .from(stageApprovalRequests)
    .where(
      and(
        eq(stageApprovalRequests.funnelId, id),
        eq(stageApprovalRequests.status, "pending")
      )
    )
    .limit(1)
  const pendingApproval = pending
    ? {
        id: pending.id,
        targetStageName: stageNameById.get(pending.targetStageId) ?? "—",
      }
    : null

  const history = historyRows.map((h) => ({
    id: h.id,
    fromStageName: h.fromStageId ? (stageNameById.get(h.fromStageId) ?? null) : null,
    toStageName: h.toStageName,
    source: h.source,
    probabilityAtChange: h.probabilityAtChange,
    valueAtChange: h.valueAtChange,
    changedAt: h.changedAt,
    changedByName: h.changedByName,
  }))

  return {
    opportunity: opp,
    accountName: acct?.name ?? "—",
    accountCurrency: acct?.currency ?? "MYR",
    container: container ?? null,
    parties,
    partnerResponses,
    personName,
    ownerName: owner?.name ?? null,
    stage,
    funnelStagesList,
    quoteNumber,
    amountFromQuote,
    pendingApproval,
    quotations: quotes,
    history,
  }
}

// ---------------------------------------------------------------------------
// quotations (apps/web/app/(app)/quotations/actions.ts)
// ---------------------------------------------------------------------------

export type QuotationRow = typeof quotations.$inferSelect
export type QuotationLineRow = typeof quotationLineItems.$inferSelect

export type QuotationListItem = QuotationRow & {
  accountId: string | null
  accountName: string | null
  accountCode: string | null
  accountOwnerMemberId: string | null
  accountOwnerName: string | null
  funnelName: string | null
  opportunityId: string | null
  opportunityCode: string | null
  opportunityName: string | null
  lineItemCount: number
}

export type QuotationListQuery = {
  search?: string
  accountIds?: string[]
  accountOwnerIds?: string[]
  opportunityIds?: string[]
  funnelIds?: string[]
  statuses?: QuotationStatus[]
  sort?: { id: string; desc: boolean }
}

export async function quotationsList(
  tx: Tx,
  ctx: ServerContext,
  { limit, offset, query }: PagingOpts & { query?: QuotationListQuery }
): Promise<ReadResult<QuotationListItem>> {
  const visible = await visibleMemberIds(tx, ctx)
  const accountOwnerMember = alias(member, "quotation_account_owner_member")
  const accountOwnerUser = alias(user, "quotation_account_owner_user")
  const term = query?.search?.trim()
  const pattern = term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : null
  const where = and(
    isNull(quotations.deletedAt),
    ownerScope(funnels.ownerMemberId, visible),
    pattern ? or(
      ilike(quotations.quoteNumber, pattern),
      ilike(accounts.name, pattern),
      ilike(accounts.code, pattern),
      ilike(accountOwnerUser.name, pattern),
      ilike(funnels.name, pattern),
      ilike(opportunities.name, pattern),
      ilike(opportunities.code, pattern)
    ) : undefined,
    query?.accountIds?.length ? inArray(funnels.accountId, query.accountIds) : undefined,
    query?.accountOwnerIds?.length ? inArray(accounts.ownerMemberId, query.accountOwnerIds) : undefined,
    query?.opportunityIds?.length ? inArray(opportunities.id, query.opportunityIds) : undefined,
    query?.funnelIds?.length ? inArray(funnels.id, query.funnelIds) : undefined,
    query?.statuses?.length ? inArray(quotations.status, query.statuses) : undefined
  )
  const lineItemCount = sql<number>`(
    select count(*) from ${quotationLineItems}
    where ${quotationLineItems.quotationId} = ${quotations.id}
  )`.mapWith(Number)
  const sortColumns = {
    quoteNumber: quotations.quoteNumber,
    accountId: accounts.name,
    accountOwnerMemberId: accountOwnerUser.name,
    opportunityId: opportunities.name,
    funnelId: funnels.name,
    lineItemCount,
    subtotal: quotations.subtotal,
    taxTotal: quotations.taxTotal,
    total: quotations.total,
    status: quotations.status,
    validUntil: quotations.validUntil,
  }
  const sortColumn = query?.sort?.id
    ? sortColumns[query.sort.id as keyof typeof sortColumns]
    : undefined
  const order = sortColumn
    ? query?.sort?.desc ? desc(sortColumn) : asc(sortColumn)
    : desc(quotations.createdAt)
  const [rows, totalRows] = await Promise.all([
    tx
      .select({
        q: quotations,
        accountId: funnels.accountId,
        accountName: accounts.name,
        accountCode: accounts.code,
        accountOwnerMemberId: accounts.ownerMemberId,
        accountOwnerName: accountOwnerUser.name,
        funnelName: funnels.name,
        opportunityId: opportunities.id,
        opportunityCode: opportunities.code,
        opportunityName: opportunities.name,
        lineItemCount,
      })
      .from(quotations)
      .leftJoin(funnels, eq(quotations.funnelId, funnels.id))
      .leftJoin(accounts, eq(funnels.accountId, accounts.id))
      .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
      .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
      .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
      .where(where)
      .orderBy(order, desc(quotations.id))
      .limit(limit)
      .offset(offset),
    tx
      .select({ count: sql<number>`count(*)::int` })
      .from(quotations)
      .leftJoin(funnels, eq(quotations.funnelId, funnels.id))
      .leftJoin(accounts, eq(funnels.accountId, accounts.id))
      .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
      .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
      .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
      .where(where),
  ])
  return {
    rows: rows.map((r) => ({
      ...r.q,
      accountId: r.accountId,
      accountName: r.accountName,
      accountCode: r.accountCode,
      accountOwnerMemberId: r.accountOwnerMemberId,
      accountOwnerName: r.accountOwnerName,
      funnelName: r.funnelName,
      opportunityId: r.opportunityId,
      opportunityCode: r.opportunityCode,
      opportunityName: r.opportunityName,
      lineItemCount: r.lineItemCount,
    })),
    total: countOf(totalRows),
  }
}

export type QuotationFilterOptions = {
  accounts: Array<{ value: string; label: string }>
  accountOwners: Array<{ value: string; label: string }>
  opportunities: Array<{ value: string; label: string }>
  funnels: Array<{ value: string; label: string }>
}

/** Compact distinct filter choices across every visible quotation. */
export async function quotationsFilterOptions(
  tx: Tx,
  ctx: ServerContext
): Promise<QuotationFilterOptions> {
  const visible = await visibleMemberIds(tx, ctx)
  const accountOwnerMember = alias(member, "quotation_filter_owner_member")
  const accountOwnerUser = alias(user, "quotation_filter_owner_user")
  const [result] = await tx
    .select({
      accounts: sql<QuotationFilterOptions["accounts"]>`coalesce(
        jsonb_agg(distinct jsonb_build_object('value', ${accounts.id}, 'label',
          concat_ws(' — ', nullif(${accounts.code}, ''), ${accounts.name})))
        filter (where ${accounts.id} is not null), '[]'::jsonb)`,
      accountOwners: sql<QuotationFilterOptions["accountOwners"]>`coalesce(
        jsonb_agg(distinct jsonb_build_object('value', ${accounts.ownerMemberId}, 'label',
          coalesce(${accountOwnerUser.name}, 'Unknown')))
        filter (where ${accounts.ownerMemberId} is not null), '[]'::jsonb)`,
      opportunities: sql<QuotationFilterOptions["opportunities"]>`coalesce(
        jsonb_agg(distinct jsonb_build_object('value', ${opportunities.id}, 'label',
          concat_ws(' — ', nullif(${opportunities.code}, ''), ${opportunities.name})))
        filter (where ${opportunities.id} is not null), '[]'::jsonb)`,
      funnels: sql<QuotationFilterOptions["funnels"]>`coalesce(
        jsonb_agg(distinct jsonb_build_object('value', ${funnels.id}, 'label',
          ${funnels.name}))
        filter (where ${funnels.id} is not null), '[]'::jsonb)`,
    })
    .from(quotations)
    .leftJoin(funnels, eq(quotations.funnelId, funnels.id))
    .leftJoin(accounts, eq(funnels.accountId, accounts.id))
    .leftJoin(accountOwnerMember, eq(accounts.ownerMemberId, accountOwnerMember.id))
    .leftJoin(accountOwnerUser, eq(accountOwnerMember.userId, accountOwnerUser.id))
    .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
    .where(and(isNull(quotations.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
  const sort = (options: QuotationFilterOptions["accounts"]) =>
    options.sort((a, b) => a.label.localeCompare(b.label))
  return {
    accounts: sort(result?.accounts ?? []),
    accountOwners: sort(result?.accountOwners ?? []),
    opportunities: sort(result?.opportunities ?? []),
    funnels: sort(result?.funnels ?? []),
  }
}

export type QuotationDetail = {
  quotation: QuotationRow
  lines: QuotationLineRow[]
  opportunityName: string | null
  container: { id: string; name: string } | null
  accountId: string | null
  accountName: string | null
}

export async function quotationsGet(
  tx: Tx,
  ctx: ServerContext,
  id: string
): Promise<QuotationDetail | null> {
  const visible = await visibleMemberIds(tx, ctx)
  const [row] = await tx
    .select({
      q: quotations,
      opportunityName: funnels.name,
      oppOwner: funnels.ownerMemberId,
      accountId: funnels.accountId,
      accountName: accounts.name,
      containerId: opportunities.id,
      containerName: opportunities.name,
    })
    .from(quotations)
    .leftJoin(funnels, eq(quotations.funnelId, funnels.id))
    .leftJoin(accounts, eq(funnels.accountId, accounts.id))
    .leftJoin(opportunities, eq(funnels.opportunityId, opportunities.id))
    .where(and(eq(quotations.id, id), isNull(quotations.deletedAt)))
    .limit(1)
  if (!row) return null
  if (!ownsOrManages(visible, row.oppOwner)) return null
  const lines = await tx
    .select()
    .from(quotationLineItems)
    .where(eq(quotationLineItems.quotationId, id))
    .orderBy(asc(quotationLineItems.sortOrder))
  return {
    quotation: row.q,
    lines,
    opportunityName: row.opportunityName,
    container:
      row.containerId && row.containerName
        ? { id: row.containerId, name: row.containerName }
        : null,
    accountId: row.accountId ?? null,
    accountName: row.accountName ?? null,
  }
}

// ---------------------------------------------------------------------------
// Resource registry — consumed by the UI server actions above AND (Task 4)
// the REST API v1 route handlers, so both paths share one implementation.
// ---------------------------------------------------------------------------

export type ApiResource = {
  permission: PermissionKey
  /** Signed runtime entitlement owner. Omit for core resources. */
  module?: import("@/lib/module-registry").ModuleId
  list(tx: Tx, ctx: ServerContext, opts: PagingOpts): Promise<{ rows: unknown[]; total: number }>
  get(tx: Tx, ctx: ServerContext, id: string): Promise<unknown | null>
}

export const API_RESOURCES: Record<string, ApiResource> = {
  leads: { permission: PERMISSIONS.LEAD_VIEW, list: leadsList, get: leadsGet },
  accounts: { permission: PERMISSIONS.ACCOUNT_VIEW, list: accountsList, get: accountsGet },
  persons: { permission: PERMISSIONS.PERSON_VIEW, list: personsList, get: personsGet },
  opportunities: {
    permission: PERMISSIONS.OPPORTUNITY_VIEW,
    list: opportunitiesList,
    get: opportunitiesGet,
  },
  funnels: { permission: PERMISSIONS.OPPORTUNITY_VIEW, list: funnelsList, get: funnelsGet },
  quotations: {
    permission: PERMISSIONS.QUOTATION_VIEW,
    list: quotationsList,
    get: quotationsGet,
  },
}
