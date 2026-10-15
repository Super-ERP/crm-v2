"use server"

import { sql } from "drizzle-orm"
import { runInTenant } from "@/db"
import { requireContext } from "@/lib/server-context"
import { visibleMemberIds, canAccessAttachable } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"
import { APPROVAL_PAGE_SIZE, normalizeApprovalPage } from "@/lib/approval-pagination"

export type RelatedProjectCodeRow = {
  funnelId: string; funnelName: string; opportunityId: string; opportunityName: string
  projectCode: string | null; crossDealProjectCode: string | null; crmProjectCode: string | null
}
export type RelatedProjectCodePage = { rows: RelatedProjectCodeRow[]; pageIndex: number; hasNextPage: boolean }

/** Sales identifiers are core CRM data; the optional delivery Project module is not required. */
export async function listRelatedProjectCodes(kind: "account" | "person", id: string, page: unknown = 0): Promise<RelatedProjectCodePage> {
  const ctx = await requireContext()
  const pageIndex = normalizeApprovalPage(page)
  const empty = { rows: [], pageIndex, hasNextPage: false }
  if (!["account", "person"].includes(kind)) return empty
  if (!ctx.can(PERMISSIONS.OPPORTUNITY_VIEW) || !ctx.can(kind === "account" ? PERMISSIONS.ACCOUNT_VIEW : PERMISSIONS.PERSON_VIEW)) return empty
  return runInTenant(ctx.tenantId, async tx => {
    if (!await canAccessAttachable(tx, ctx, kind, id, "view")) return empty
    const visible = await visibleMemberIds(tx, ctx)
    if (visible?.length === 0) return empty
    const scope = visible === null ? sql`true` : sql`f.owner_member_id IN (${sql.join(visible.map(value => sql`${value}`), sql`, `)})`
    const quoteRelationship = ctx.can(PERMISSIONS.QUOTATION_VIEW) ? sql`EXISTS (
      SELECT 1 FROM quotations q WHERE q.tenant_id = f.tenant_id AND q.funnel_id = f.id AND q.deleted_at IS NULL
      AND ${kind === "account" ? sql`q.bill_to_account_id = ${id}` : sql`q.attention_contact_id = ${id}`}
    )` : sql`false`
    const relation = kind === "account" ? sql`(f.account_id = ${id} OR ${quoteRelationship})`
      : sql`(f.primary_person_id = ${id} OR o.primary_person_id = ${id} OR o.owner_contact_id = ${id}
          OR o.power_sponsor_contact_id = ${id} OR ${quoteRelationship})`
    const rows = await tx.execute<RelatedProjectCodeRow>(sql`
      SELECT f.id AS "funnelId", f.name AS "funnelName", o.id AS "opportunityId", o.name AS "opportunityName",
        f.project_code AS "projectCode", f.cross_deal_project_code AS "crossDealProjectCode", o.project_code AS "crmProjectCode"
      FROM funnels f JOIN opportunities o ON o.id = f.opportunity_id AND o.tenant_id = f.tenant_id
      WHERE f.tenant_id = ${ctx.tenantId} AND f.deleted_at IS NULL AND o.deleted_at IS NULL AND ${scope} AND ${relation}
        AND (nullif(trim(f.project_code), '') IS NOT NULL OR nullif(trim(f.cross_deal_project_code), '') IS NOT NULL OR nullif(trim(o.project_code), '') IS NOT NULL)
      ORDER BY f.project_code NULLS LAST, f.name, f.id LIMIT ${APPROVAL_PAGE_SIZE + 1} OFFSET ${pageIndex * APPROVAL_PAGE_SIZE}
    `)
    return { rows: rows.slice(0, APPROVAL_PAGE_SIZE), pageIndex, hasNextPage: rows.length > APPROVAL_PAGE_SIZE }
  })
}
