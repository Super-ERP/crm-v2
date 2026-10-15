import "server-only"
import { sql, type SQL } from "drizzle-orm"
import type { Tx, ServerContext } from "@/lib/actions"
import { projects, funnels } from "@/db/schema"
import { accountReadScope, ownerScope, ownsOrManages, visibleMemberIds } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"
import { normalizeApprovalPage } from "@/lib/approval-pagination"
import { activeProjectCodeFunnel } from "./project-code-visibility"

const PAGE_SIZE = 25
export type CodeSummary = { code: string; funnelCount: number; primaryCount: number; crossDealCount: number; crmCount: number }
export type CodeDirectory = { rows: CodeSummary[]; pageIndex: number; hasNextPage: boolean }
type RelatedRecord = { id: string; name: string; role?: string }
type CodeFunnel = {
  id: string; name: string; accountId: string; stageName: string; status: string
  opportunityId: string; opportunityName: string; opportunityOwner: string | null
  primary: boolean; crossDeal: boolean; crm: boolean
}
export type CodeDetail = {
  code: string; pageIndex: number; hasNextPage: boolean
  funnels: Array<Omit<CodeFunnel, "opportunityName" | "opportunityOwner"> & { opportunity: RelatedRecord | null }>
  quotations: RelatedRecord[]; accounts: RelatedRecord[]; contacts: RelatedRecord[]; projects: RelatedRecord[]
}

function codeSource(ctx: ServerContext, visible: string[] | null): SQL {
  return sql`SELECT funnels.*, o.name AS opportunity_name, o.owner_member_id AS opportunity_owner,
      o.project_code AS crm_code, o.primary_person_id AS opportunity_person_id,
      o.owner_contact_id, o.power_sponsor_contact_id, s.name AS stage_name
    FROM funnels
    JOIN opportunities o ON o.id = funnels.opportunity_id AND o.tenant_id = funnels.tenant_id AND o.deleted_at IS NULL
    JOIN pipeline_stages s ON s.id = funnels.current_stage_id AND s.tenant_id = funnels.tenant_id
    WHERE funnels.tenant_id = ${ctx.tenantId} AND ${ownerScope(funnels.ownerMemberId, visible) ?? sql`true`}
      AND ${activeProjectCodeFunnel()}`
}

/** Core CRM directory; optional delivery entitlements never gate identifiers. */
export async function listProjectCodes(tx: Tx, ctx: ServerContext, input: { search?: string; page?: unknown }): Promise<CodeDirectory> {
  const pageIndex = normalizeApprovalPage(input.page)
  const empty = { rows: [], pageIndex, hasNextPage: false }
  if (!ctx.can(PERMISSIONS.OPPORTUNITY_VIEW)) return empty
  const visible = await visibleMemberIds(tx, ctx)
  if (visible?.length === 0) return empty
  const q = (input.search ?? "").trim().slice(0, 300)
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`
  const rows = await tx.execute<CodeSummary>(sql`WITH eligible AS (${codeSource(ctx, visible)})
    SELECT codes.code, count(DISTINCT f.id)::int AS "funnelCount",
      count(DISTINCT f.id) FILTER (WHERE codes.role = 'primary')::int AS "primaryCount",
      count(DISTINCT f.id) FILTER (WHERE codes.role = 'cross-deal')::int AS "crossDealCount",
      count(DISTINCT f.id) FILTER (WHERE codes.role = 'crm')::int AS "crmCount"
    FROM eligible f CROSS JOIN LATERAL (VALUES (f.project_code, 'primary'), (f.cross_deal_project_code, 'cross-deal'),
      (CASE WHEN ${visible === null ? sql`true` : sql`f.opportunity_owner IN (${sql.join(visible.map(id => sql`${id}`), sql`, `)})`} THEN f.crm_code END, 'crm')) codes(code, role)
    WHERE nullif(trim(codes.code), '') IS NOT NULL AND ${q ? sql`codes.code ILIKE ${like}` : sql`true`}
    GROUP BY codes.code ORDER BY codes.code LIMIT ${PAGE_SIZE + 1} OFFSET ${pageIndex * PAGE_SIZE}`)
  return { rows: rows.slice(0, PAGE_SIZE), pageIndex, hasNextPage: rows.length > PAGE_SIZE }
}

/** A code is a tenant-local grouping, never a grant of access to its records. */
export async function getProjectCode(tx: Tx, ctx: ServerContext, code: string, page: unknown, projectsEnabled: boolean): Promise<CodeDetail | null> {
  if (!ctx.can(PERMISSIONS.OPPORTUNITY_VIEW) || !code.trim() || code.length > 1000) return null
  const visible = await visibleMemberIds(tx, ctx)
  if (visible?.length === 0) return null
  const pageIndex = normalizeApprovalPage(page)
  const crmScope = visible === null ? sql`true` : sql`f.opportunity_owner IN (${sql.join(visible.map(id => sql`${id}`), sql`, `)})`
  const rows = await tx.execute<CodeFunnel>(sql`WITH eligible AS (${codeSource(ctx, visible)})
    SELECT f.id, f.name, f.account_id AS "accountId", f.stage_name AS "stageName", f.status,
      f.opportunity_id AS "opportunityId", f.opportunity_name AS "opportunityName", f.opportunity_owner AS "opportunityOwner",
      coalesce(f.project_code = ${code}, false) AS "primary", coalesce(f.cross_deal_project_code = ${code}, false) AS "crossDeal",
      coalesce(f.crm_code = ${code} AND ${crmScope}, false) AS "crm"
    FROM eligible f WHERE f.project_code = ${code} OR f.cross_deal_project_code = ${code} OR (f.crm_code = ${code} AND ${crmScope})
    ORDER BY f.name, f.id LIMIT ${PAGE_SIZE + 1} OFFSET ${pageIndex * PAGE_SIZE}`)
  if (!rows.length) return null
  const current = rows.slice(0, PAGE_SIZE)
  const ids = sql.join(current.map(row => sql`${row.id}::uuid`), sql`, `)
  // Only these already-authorized active funnels may contribute related data.
  const quoteSource = ctx.can(PERMISSIONS.QUOTATION_VIEW) ? sql`SELECT q.* FROM quotations q
    WHERE q.tenant_id = ${ctx.tenantId} AND q.funnel_id IN (${ids}) AND q.deleted_at IS NULL` : sql`SELECT * FROM quotations WHERE false`
  const quotations = ctx.can(PERMISSIONS.QUOTATION_VIEW) ? await tx.execute<RelatedRecord>(sql`
    SELECT q.id, q.quote_number AS name, 'Quotation' AS role FROM (${quoteSource}) q ORDER BY q.quote_number, q.id`) : []
  const relatedAccounts = ctx.can(PERMISSIONS.ACCOUNT_VIEW) ? await tx.execute<RelatedRecord>(sql`
    SELECT DISTINCT accounts.id, accounts.name,
      CASE WHEN accounts.id IN (SELECT account_id FROM funnels WHERE id IN (${ids})) THEN 'End user' ELSE 'Bill to' END AS role
    FROM accounts WHERE accounts.tenant_id = ${ctx.tenantId} AND accounts.deleted_at IS NULL
      AND ${accountReadScope(visible) ?? sql`true`} AND (accounts.id IN (SELECT account_id FROM funnels WHERE id IN (${ids}))
        OR accounts.id IN (SELECT bill_to_account_id FROM (${quoteSource}) q)) ORDER BY accounts.name, accounts.id`) : []
  const contacts = ctx.can(PERMISSIONS.PERSON_VIEW) ? await tx.execute<RelatedRecord>(sql`
    SELECT DISTINCT persons.id, concat_ws(' ', persons.first_name, persons.last_name) AS name, 'Contact' AS role
    FROM persons JOIN accounts ON accounts.id = persons.account_id AND accounts.tenant_id = persons.tenant_id
    WHERE persons.tenant_id = ${ctx.tenantId} AND persons.deleted_at IS NULL AND accounts.deleted_at IS NULL
      AND ${accountReadScope(visible) ?? sql`true`} AND persons.id IN (
        SELECT f.primary_person_id FROM funnels f WHERE f.id IN (${ids})
        UNION SELECT o.primary_person_id FROM opportunities o JOIN funnels f ON f.opportunity_id = o.id WHERE f.id IN (${ids})
        UNION SELECT o.owner_contact_id FROM opportunities o JOIN funnels f ON f.opportunity_id = o.id WHERE f.id IN (${ids})
        UNION SELECT o.power_sponsor_contact_id FROM opportunities o JOIN funnels f ON f.opportunity_id = o.id WHERE f.id IN (${ids})
        UNION SELECT attention_contact_id FROM (${quoteSource}) q
      ) ORDER BY name, persons.id`) : []
  const deliveryProjects = projectsEnabled && ctx.can(PERMISSIONS.PROJECT_VIEW) ? await tx.execute<RelatedRecord>(sql`
    SELECT projects.id, projects.name, projects.project_code AS role FROM projects
    WHERE projects.tenant_id = ${ctx.tenantId} AND projects.deleted_at IS NULL
      AND ${ownerScope(projects.ownerMemberId, visible) ?? sql`true`}
      AND (projects.funnel_id IN (${ids}) OR (projects.project_code = ${code}
        AND projects.account_id IN (SELECT account_id FROM funnels WHERE id IN (${ids}))))
    ORDER BY projects.name, projects.id`) : []
  return {
    code, pageIndex, hasNextPage: rows.length > PAGE_SIZE,
    funnels: current.map(({ opportunityName, opportunityOwner, ...row }) => ({ ...row,
      opportunity: ownsOrManages(visible, opportunityOwner) ? { id: row.opportunityId, name: opportunityName } : null })),
    quotations: [...quotations], accounts: [...relatedAccounts], contacts: [...contacts], projects: [...deliveryProjects],
  }
}
