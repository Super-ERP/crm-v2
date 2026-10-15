"use server"

import { approvalQueueSql } from "@/server/services/approval-queue-query"
import type { ApprovalQueueRead, ApprovalQueueMeta } from "@/lib/approval-queue"
import { sql } from "drizzle-orm"
import { runInTenant } from "@/db"
import { requireContext } from "@/lib/server-context"
import { visibleMemberIds } from "@/lib/access-scope"
import { managerApproverQuery } from "@/server/services/approval-routing"
import { PERMISSIONS } from "@/lib/permissions"
import { APPROVAL_PAGE_SIZE, normalizeApprovalPage } from "@/lib/approval-pagination"

export type QuotationApprovalRow = ApprovalQueueMeta & {
  id: string
  quoteNumber: string
  funnelName: string
  customerName: string
  billToName: string
  total: string
  currency: string
  status: string
  requesterName: string | null
  approverName: string | null
  requestedAt: string | null
  decidedAt: string | null
  rejectionReason: string | null
  canRecall: boolean
}
export type QuotationApprovalPage = { rows: QuotationApprovalRow[]; pageIndex: number; hasNextPage: boolean; total?: number }

/** Latest submission per quotation. Audit actors identify requesters independently of record ownership. */
export async function listQuotationApprovals(tab: "incoming" | "mine", page: unknown = 0, queue?: ApprovalQueueRead): Promise<QuotationApprovalPage> {
  const ctx = await requireContext()
  const pageIndex = normalizeApprovalPage(page)
  const empty = { rows: [], pageIndex, hasNextPage: false }
  if (!ctx.can(PERMISSIONS.QUOTATION_VIEW) || (!ctx.isSuperadmin && !ctx.memberId) ||
      (tab === "incoming" && !ctx.can(PERMISSIONS.QUOTATION_APPROVE))) return empty

  return runInTenant(ctx.tenantId, async tx => {
    const visible = await visibleMemberIds(tx, ctx)
    if (visible !== null && visible.length === 0) return empty
    const scope = visible === null ? sql`true` : sql`f.owner_member_id IN (${sql.join(visible.map(id => sql`${id}`), sql`, `)})`
    const filter = tab === "incoming"
      ? sql`q.status = 'pending_approval' AND ${ctx.isSuperadmin ? sql`true` : sql`current_approver."memberId" = ${ctx.memberId} AND coalesce(submission.actor_member_id, f.owner_member_id) <> ${ctx.memberId}`}`
      : sql`submission.actor_member_id = ${ctx.memberId}`
    const source = sql`
      SELECT floor(extract(epoch from coalesce(submission.created_at,q.updated_at))*1000000)::bigint::text AS "queueSortKey",
        concat_ws(' ',q.quote_number,f.name,customer.name,bill_to.name,requester.name) AS "queueSearch", q.id, q.quote_number AS "quoteNumber", f.name AS "funnelName",
        customer.name AS "customerName",
        coalesce(q.billing_snapshot->'account'->>'name', bill_to.name, customer.name) AS "billToName",
        q.total, q.currency, q.status, requester.name AS "requesterName",
        approver.name AS "approverName", submission.created_at AS "requestedAt",
        decision.created_at AS "decidedAt", q.rejection_reason AS "rejectionReason",
        (${ctx.can(PERMISSIONS.QUOTATION_UPDATE)} AND submission.actor_member_id = ${ctx.memberId}
          AND q.status = 'pending_approval') AS "canRecall"
      FROM quotations q
      INNER JOIN funnels f ON f.id = q.funnel_id AND f.tenant_id = q.tenant_id
      INNER JOIN accounts customer ON customer.id = f.account_id AND customer.tenant_id = q.tenant_id
      LEFT JOIN accounts bill_to ON bill_to.id = q.bill_to_account_id AND bill_to.tenant_id = q.tenant_id
      LEFT JOIN LATERAL (
        SELECT a.actor_member_id, a.actor_user_id, a.created_at, a.after
        FROM audit_log a WHERE a.tenant_id = q.tenant_id AND a.entity_type = 'quotation'
          AND a.entity_id = q.id::text AND a.action = 'quotation.submitted_for_approval' AND a.outcome = 'success'
        ORDER BY a.created_at DESC, a.id DESC LIMIT 1
      ) submission ON true
      LEFT JOIN LATERAL (${managerApproverQuery(sql`CASE WHEN submission.created_at IS NULL THEN f.owner_member_id ELSE submission.actor_member_id END`, PERMISSIONS.QUOTATION_APPROVE)}) current_approver ON true
      LEFT JOIN LATERAL (
        SELECT a.created_at FROM audit_log a
        WHERE a.tenant_id = q.tenant_id AND a.entity_type = 'quotation' AND a.entity_id = q.id::text
          AND a.action IN ('quotation.approved', 'quotation.approval_rejected', 'quotation.recalled')
          AND a.outcome = 'success' AND a.created_at >= submission.created_at
        ORDER BY a.created_at DESC, a.id DESC LIMIT 1
      ) decision ON true
      LEFT JOIN "user" requester ON requester.id = submission.actor_user_id
      LEFT JOIN member approver_member ON approver_member.id = CASE WHEN q.status = 'pending_approval' THEN current_approver."memberId"
        ELSE coalesce(q.approver_member_id, submission.after->>'approverMemberId') END
        AND approver_member.organization_id = q.tenant_id
      LEFT JOIN "user" approver ON approver.id = approver_member.user_id
      WHERE q.tenant_id = ${ctx.tenantId} AND q.deleted_at IS NULL AND f.deleted_at IS NULL
        AND customer.deleted_at IS NULL AND ${scope} AND ${filter}
    `
    const rows = await tx.execute<Omit<QuotationApprovalRow, "requestedAt" | "decidedAt"> & {requestedAt: Date|string|null; decidedAt: Date|string|null; queueTotal?:number; queueSearch?:string}>(queue
      ? approvalQueueSql(source,'quotation',queue)
      : sql`${source} ORDER BY coalesce(submission.created_at, q.updated_at) DESC, q.id DESC LIMIT ${APPROVAL_PAGE_SIZE+1} OFFSET ${pageIndex*APPROVAL_PAGE_SIZE}`)
    const records=rows.filter(row=>row.id)
    return {
      rows: (queue ? records : records.slice(0, APPROVAL_PAGE_SIZE)).map(row => { const clean={...row};delete clean.queueSearch;delete clean.queueTotal;return ({
        ...clean,
        requestedAt: row.requestedAt ? new Date(row.requestedAt).toISOString() : null,
        decidedAt: row.decidedAt ? new Date(row.decidedAt).toISOString() : null,
      })}),
      pageIndex,
      hasNextPage: records.length > APPROVAL_PAGE_SIZE,
      total: queue ? Number(rows[0]?.queueTotal ?? 0) : undefined,
    }
  })
}
