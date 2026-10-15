"use server"

import { approvalQueueSql } from "@/server/services/approval-queue-query"
import type { ApprovalQueueRead, ApprovalQueueMeta } from "@/lib/approval-queue"
import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { runInTenant } from "@/db"
import { requireContext } from "@/lib/server-context"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { visibleMemberIds } from "@/lib/access-scope"
import { managerApproverQuery } from "@/server/services/approval-routing"
import { decideLeadConversion } from "@/server/services/conversion"
import { runAction } from "@/lib/action-result"
import { APPROVAL_PAGE_SIZE, normalizeApprovalPage } from "@/lib/approval-pagination"

import type { LeadConversionInput } from "@/lib/lead-conversion-approval"

export type LeadConversionApprovalRow = ApprovalQueueMeta & {
  inputSnapshot: LeadConversionInput; email: string | null; phone: string | null
  id: string; leadId: string; leadName: string; companyName: string | null
  status: string; requesterName: string | null; approverName: string | null
  requestedAt: string | null; decidedAt: string | null; rejectionReason: string | null
  canCancel: boolean; accountName: string | null; opportunityName: string | null
}
export type LeadConversionApprovalPage = { rows: LeadConversionApprovalRow[]; pageIndex: number; hasNextPage: boolean; total?: number }

export async function listLeadConversionApprovals(tab: "incoming" | "mine", page: unknown = 0, leadId?: string, queue?: ApprovalQueueRead): Promise<LeadConversionApprovalPage> {
  const ctx = await requireContext()
  const pageIndex = normalizeApprovalPage(page)
  const empty = { rows: [], pageIndex, hasNextPage: false }
  if (!ctx.can(PERMISSIONS.LEAD_VIEW) || (!ctx.memberId && !ctx.isSuperadmin) || (tab === "incoming" && !ctx.can(PERMISSIONS.LEAD_CONVERT_APPROVE))) return empty
  return runInTenant(ctx.tenantId, async tx => {
    const visible = await visibleMemberIds(tx, ctx)
    if (visible?.length === 0) return empty
    const scope = visible === null ? sql`true` : sql`l.owner_member_id IN (${sql.join(visible.map(id => sql`${id}`), sql`, `)})`
    const filter = tab === "incoming"
      ? sql`r.status = 'pending' AND ${ctx.isSuperadmin ? sql`true` : sql`current_approver."memberId" = ${ctx.memberId} AND r.requester_member_id <> ${ctx.memberId}`}`
      : sql`r.requester_member_id = ${ctx.memberId}`
    const source = sql`
      SELECT floor(extract(epoch from r.requested_at)*1000000)::bigint::text AS "queueSortKey",
        concat_ws(' ',r.lead_snapshot->>'name',r.lead_snapshot->>'companyName',a.name,requester.name) AS "queueSearch", r.input_snapshot AS "inputSnapshot", r.lead_snapshot->>'email' AS email, r.lead_snapshot->>'phone' AS phone, r.id, l.id AS "leadId", r.lead_snapshot->>'name' AS "leadName", r.lead_snapshot->>'companyName' AS "companyName",
        r.status, requester.name AS "requesterName", approver.name AS "approverName",
        r.requested_at AS "requestedAt", r.decided_at AS "decidedAt", r.decision_note AS "rejectionReason",
        (r.requester_member_id = ${ctx.memberId} AND r.status = 'pending') AS "canCancel",
        coalesce(a.name, r.lead_snapshot->>'companyName', r.lead_snapshot->>'name') AS "accountName",
        r.input_snapshot->>'opportunityName' AS "opportunityName"
      FROM lead_conversion_approval_requests r JOIN leads l ON l.id = r.lead_id AND l.tenant_id = r.tenant_id
      LEFT JOIN accounts a ON a.id::text = r.input_snapshot->>'existingAccountId' AND a.tenant_id = r.tenant_id
      LEFT JOIN member requester_member ON requester_member.id = r.requester_member_id AND requester_member.organization_id = r.tenant_id
      LEFT JOIN "user" requester ON requester.id = requester_member.user_id
      LEFT JOIN LATERAL (${managerApproverQuery(sql`r.requester_member_id`, PERMISSIONS.LEAD_CONVERT_APPROVE)}) current_approver ON true
      LEFT JOIN member approver_member ON approver_member.id = CASE WHEN r.status = 'pending' THEN current_approver."memberId" ELSE coalesce(r.decided_by_member_id, r.approver_member_id) END AND approver_member.organization_id = r.tenant_id
      LEFT JOIN "user" approver ON approver.id = approver_member.user_id
      WHERE r.tenant_id = ${ctx.tenantId} AND l.deleted_at IS NULL AND ${scope} AND ${filter} AND ${leadId ? sql`l.id = ${leadId}` : sql`true`}
    `
    const rows = await tx.execute<LeadConversionApprovalRow & {queueTotal?:number;queueSearch?:string}>(queue
      ? approvalQueueSql(source,'lead',queue)
      : sql`${source} ORDER BY r.requested_at DESC,r.id DESC LIMIT ${APPROVAL_PAGE_SIZE+1} OFFSET ${pageIndex*APPROVAL_PAGE_SIZE}`)
    const records=rows.filter(row=>row.id)
    return { rows: (queue ? records : records.slice(0, APPROVAL_PAGE_SIZE)).map(row => { const clean={...row};delete clean.queueSearch;delete clean.queueTotal;return ({ ...clean,
      requestedAt: row.requestedAt ? new Date(row.requestedAt).toISOString() : null,
      decidedAt: row.decidedAt ? new Date(row.decidedAt).toISOString() : null,
    })}), pageIndex, hasNextPage: records.length > APPROVAL_PAGE_SIZE, total:queue ? Number(rows[0]?.queueTotal ?? 0) : undefined }
  })
}

export async function decideLeadConversionAction(id: string, decision: "approved" | "rejected" | "cancelled", reason?: string) {
  return runAction(async () => {
    // runAction enforces commercial writes; withTenant authorizes the actor.
    const ctx = await withTenant(decision === "cancelled" ? PERMISSIONS.LEAD_VIEW : PERMISSIONS.LEAD_CONVERT_APPROVE, async (_tx, context) => context)
    const result = await decideLeadConversion(ctx, id, decision, reason)
    revalidatePath("/approvals")
    revalidatePath("/leads")
    revalidatePath(`/leads/${result.leadId}`)
    return result
  })
}
