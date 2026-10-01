"use server"

import { and, desc, eq, inArray, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { revalidatePath } from "next/cache"
import { runInTenant } from "@/db"
import {
  stageApprovalRequests,
  funnels,
  pipelineStages,
  member,
  user,
} from "@/db/schema"
import { requireContext, assertCan } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { canAccessAttachable } from "@/lib/access-scope"
import { runAction, type ActionResult } from "@/lib/action-result"
import { APPROVAL_PAGE_SIZE, normalizeApprovalPage } from "@/lib/approval-pagination"
import { decideApproval, type DecisionOutcome } from "@/server/services/stage"

export type ApprovalRow = {
  id: string
  funnelId: string
  opportunityName: string
  requesterName: string | null
  approverName: string | null
  fromStageName: string | null
  targetStageName: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  decisionNote: string | null
  requestedAt: string
  decidedAt: string | null
}

export type ApprovalPage = { rows: ApprovalRow[]; pageIndex: number; hasNextPage: boolean }

const fromStage = alias(pipelineStages, "from_stage")
const targetStage = alias(pipelineStages, "target_stage")

/** Shared row shape builder — joins opportunity, stages, requester, approver. */
function buildApprovalQuery(tx: Parameters<Parameters<typeof runInTenant>[1]>[0], where: SQL | undefined) {
  return tx
    .select({
      id: stageApprovalRequests.id,
      funnelId: stageApprovalRequests.funnelId,
      opportunityName: funnels.name,
      requesterUserId: stageApprovalRequests.requesterMemberId,
      approverMemberId: stageApprovalRequests.approverMemberId,
      fromStageName: fromStage.name,
      targetStageName: targetStage.name,
      reason: stageApprovalRequests.reason,
      status: stageApprovalRequests.status,
      decisionNote: stageApprovalRequests.decisionNote,
      requestedAt: stageApprovalRequests.requestedAt,
      decidedAt: stageApprovalRequests.decidedAt,
    })
    .from(stageApprovalRequests)
    .innerJoin(
      funnels,
      eq(stageApprovalRequests.funnelId, funnels.id)
    )
    .leftJoin(fromStage, eq(stageApprovalRequests.fromStageId, fromStage.id))
    .innerJoin(
      targetStage,
      eq(stageApprovalRequests.targetStageId, targetStage.id)
    )
    .where(where)
    .orderBy(desc(stageApprovalRequests.requestedAt), desc(stageApprovalRequests.id))
}

/** Resolve member ids -> display names in one round trip. */
async function nameMap(
  tx: Parameters<Parameters<typeof runInTenant>[1]>[0],
  memberIds: (string | null)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(memberIds.filter((m): m is string => !!m))]
  if (ids.length === 0) return new Map()
  const rows = await tx
    .select({ memberId: member.id, name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(inArray(member.id, ids))
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.memberId, r.name)
  return map
}

/** Pending stage requests assigned to this manager; platform superadmins retain an operational override. */
export async function listIncomingApprovals(page: unknown = 0): Promise<ApprovalPage> {
  const pageIndex = normalizeApprovalPage(page)
  const ctx = await requireContext()
  return runInTenant(ctx.tenantId, async (tx) => {
    const conditions: SQL[] = [eq(stageApprovalRequests.status, "pending")]
    if (!ctx.isSuperadmin) {
      if (!ctx.memberId || !ctx.can(PERMISSIONS.STAGE_ADVANCE_APPROVE)) return { rows: [], pageIndex, hasNextPage: false }
      conditions.push(eq(stageApprovalRequests.approverMemberId, ctx.memberId))
    }
    const rows = await buildApprovalQuery(tx, and(...conditions)).limit(APPROVAL_PAGE_SIZE + 1).offset(pageIndex * APPROVAL_PAGE_SIZE)
    const names = await nameMap(tx, [...rows.map(r => r.requesterUserId), ...rows.map(r => r.approverMemberId)])
    return { rows: rows.slice(0, APPROVAL_PAGE_SIZE).map(r => shape(r, names)), pageIndex, hasNextPage: rows.length > APPROVAL_PAGE_SIZE }
  })
}

/** Requests I raised. */
export async function listMyApprovals(page: unknown = 0): Promise<ApprovalPage> {
  const pageIndex = normalizeApprovalPage(page)
  const ctx = await requireContext()
  return runInTenant(ctx.tenantId, async (tx) => {
    if (!ctx.memberId) return { rows: [], pageIndex, hasNextPage: false }
    const rows = await buildApprovalQuery(
      tx,
      eq(stageApprovalRequests.requesterMemberId, ctx.memberId)
    ).limit(APPROVAL_PAGE_SIZE + 1).offset(pageIndex * APPROVAL_PAGE_SIZE)
    const names = await nameMap(tx, [
      ...rows.map((r) => r.requesterUserId),
      ...rows.map((r) => r.approverMemberId),
    ])
    return { rows: rows.slice(0, APPROVAL_PAGE_SIZE).map(r => shape(r, names)), pageIndex, hasNextPage: rows.length > APPROVAL_PAGE_SIZE }
  })
}

/**
 * Full stage-approval history for one funnel, every status, newest first — for
 * the funnel detail's "Approval history" tab. Gated the same way as the
 * funnel detail's other record-scoped reads (attachments/activity): the
 * opportunity view permission, plus record-level ownership/management scope
 * via {@link canAccessAttachable}.
 */
export async function listFunnelApprovalHistory(
  funnelId: string
): Promise<ApprovalRow[]> {
  const ctx = await requireContext()
  assertCan(ctx, PERMISSIONS.OPPORTUNITY_VIEW)
  return runInTenant(ctx.tenantId, async (tx) => {
    if (!(await canAccessAttachable(tx, ctx, "opportunity", funnelId, "view")))
      return []
    const rows = await buildApprovalQuery(
      tx,
      eq(stageApprovalRequests.funnelId, funnelId)
    )
    const names = await nameMap(tx, [
      ...rows.map((r) => r.requesterUserId),
      ...rows.map((r) => r.approverMemberId),
    ])
    return rows.map((r) => shape(r, names))
  })
}

type RawRow = {
  id: string
  funnelId: string
  opportunityName: string
  requesterUserId: string
  approverMemberId: string | null
  fromStageName: string | null
  targetStageName: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  decisionNote: string | null
  requestedAt: Date
  decidedAt: Date | null
}

function shape(r: RawRow, names: Map<string, string>): ApprovalRow {
  return {
    id: r.id,
    funnelId: r.funnelId,
    opportunityName: r.opportunityName,
    requesterName: names.get(r.requesterUserId) ?? null,
    approverName: r.approverMemberId ? names.get(r.approverMemberId) ?? null : null,
    fromStageName: r.fromStageName,
    targetStageName: r.targetStageName,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    requestedAt: r.requestedAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  }
}

/**
 * Approve / reject / cancel a request via the core stage service. Returns the
 * resolved {@link DecisionOutcome} so the client can surface an honest message —
 * e.g. an approve that found the funnel already moved on resolves as `obsolete`
 * (request closed) rather than failing.
 */
export async function decideApprovalAction(input: {
  requestId: string
  decision: "approved" | "rejected" | "cancelled"
  note?: string
}): Promise<ActionResult<DecisionOutcome>> {
  return runAction(async () => {
    const ctx = await requireContext()
    const outcome = await decideApproval(ctx, input)
    revalidatePath("/approvals")
    // An approved/obsolete decision changes the funnel's stage, so refresh the
    // funnel views too.
    revalidatePath("/funnel")
    return outcome
  })
}
