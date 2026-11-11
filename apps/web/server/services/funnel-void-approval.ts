import "server-only"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { canManageAllRecords, ownsOrManages, visibleMemberIds } from "@/lib/access-scope"
import { funnels, funnelVoidRequests, pipelineStages } from "@/db/schema"
import { voidDuplicateFunnelSchema, validateVoidDecision, type VoidDuplicateFunnelInput } from "@/lib/funnel-void"
import { voidDuplicateWonFunnel } from "./void-duplicate-funnel"
import { writeAudit } from "@/server/audit"
import { logActivity } from "./activity"

/** Shared Sales Admin pool, explicitly distinct from reporting-manager routing. */
async function activeMembersWithPermissions(tx: Tx, ctx: ServerContext) {
  const rows = await tx.execute<{id:string;keys:string[]}>(sql`select m.id,array_agg(distinct p.key) as keys from member m
    join membership_profiles mp on mp.member_id=m.id and mp.tenant_id=m.organization_id
    join member_roles mr on mr.member_id=m.id and mr.tenant_id=m.organization_id
    join roles r on r.id=mr.role_id and r.tenant_id=m.organization_id
    join role_permissions rp on rp.role_id=r.id and rp.tenant_id=m.organization_id
    join permissions p on p.id=rp.permission_id
    where m.organization_id=${ctx.tenantId} and mp.status='active' group by m.id`)
  return rows.map(row => {
    const permissions = new Set(row.keys)
    return {...ctx, memberId:row.id, isSuperadmin:false, permissions, can:(key:string)=>permissions.has(key)} as ServerContext
  })
}

export async function requestFunnelVoid(tx: Tx, ctx: ServerContext, input: VoidDuplicateFunnelInput) {
  if (!ctx.memberId || !ctx.can(PERMISSIONS.OPPORTUNITY_UPDATE)) throw new Error("FORBIDDEN")
  const value = voidDuplicateFunnelSchema.parse(input)
  const visible = await visibleMemberIds(tx, ctx)
  const rows = await tx.select({ id: funnels.id, ownerMemberId: funnels.ownerMemberId, accountId: funnels.accountId, currency: funnels.currency, status: funnels.status, kind: pipelineStages.kind }).from(funnels)
    .innerJoin(pipelineStages, and(eq(pipelineStages.id, funnels.currentStageId), eq(pipelineStages.tenantId, funnels.tenantId)))
    .where(and(eq(funnels.tenantId, ctx.tenantId), inArray(funnels.id, [value.funnelId, value.retainedFunnelId]), isNull(funnels.deletedAt)))
    .orderBy(asc(funnels.id)).for("update", { of: funnels })
  const source = rows.find(r => r.id === value.funnelId), retained = rows.find(r => r.id === value.retainedFunnelId)
  if (!source || !retained || (!canManageAllRecords(ctx) && rows.some(r => !ownsOrManages(visible, r.ownerMemberId)))) throw new Error("Funnel not available within your access")
  if (source.ownerMemberId !== ctx.memberId && !canManageAllRecords(ctx)) throw new Error("Only the funnel owner or an administrator can request a void")
  if (rows.some(r => r.status !== "won" || r.kind !== "WON")) throw new Error("Both funnels must be Closed Won")
  if (source.accountId !== retained.accountId || source.currency !== retained.currency) throw new Error("Choose a funnel with the same customer and currency")
  const reviewers = await activeMembersWithPermissions(tx,ctx)
  let eligible = false
  for (const reviewer of reviewers) {
    if (reviewer.memberId === ctx.memberId || !reviewer.can(PERMISSIONS.FUNNEL_VOID_APPROVE) || !reviewer.can(PERMISSIONS.OPPORTUNITY_VIEW)) continue
    const reviewerScope = await visibleMemberIds(tx,reviewer)
    if (canManageAllRecords(reviewer) || rows.every(row=>ownsOrManages(reviewerScope,row.ownerMemberId))) { eligible=true; break }
  }
  if (!eligible) throw new Error("No other active Sales Admin has approval permission and access to both funnels. Ask an administrator to configure a reviewer.")
  const [pending] = await tx.select().from(funnelVoidRequests).where(and(eq(funnelVoidRequests.tenantId, ctx.tenantId), eq(funnelVoidRequests.funnelId, value.funnelId), eq(funnelVoidRequests.status, "pending")))
  if (pending) throw new Error("A void request is already awaiting Sales Admin review")
  const [request] = await tx.insert(funnelVoidRequests).values({ tenantId: ctx.tenantId, ...value, requesterMemberId: ctx.memberId, ownerMemberId: source.ownerMemberId! }).returning()
  await writeAudit(tx, ctx, { action: "funnel.void_requested", entityType: "opportunity", entityId: value.funnelId, after: { requestId: request.id, ...value } })
  await logActivity(tx, ctx, { entityType: "opportunity", entityId: value.funnelId, type: "system", subject: "Void requested", body: `Awaiting Sales Admin review. Reason: ${value.reason}` })
  return request.id
}

export async function decideFunnelVoid(tx: Tx, ctx: ServerContext, requestId: string, approve: boolean, note: string) {
  if (!ctx.memberId || !ctx.can(PERMISSIONS.FUNNEL_VOID_APPROVE)) throw new Error("FORBIDDEN: Sales Admin approval permission required")
  const [request] = await tx.select().from(funnelVoidRequests).where(and(eq(funnelVoidRequests.id, requestId), eq(funnelVoidRequests.tenantId, ctx.tenantId))).for("update")
  if (!request) throw new Error("Request not available")
  const decisionNote = validateVoidDecision(request, ctx.memberId, approve, note)
  // Both records must remain inside the reviewer's scope, including for rejection.
  const visible = await visibleMemberIds(tx, ctx)
  const records = await tx.select({ id: funnels.id, ownerMemberId: funnels.ownerMemberId }).from(funnels).where(and(eq(funnels.tenantId, ctx.tenantId), inArray(funnels.id, [request.funnelId, request.retainedFunnelId]))).orderBy(asc(funnels.id)).for("update")
  if (records.length !== 2 || (!canManageAllRecords(ctx) && records.some(r => !ownsOrManages(visible, r.ownerMemberId)))) throw new Error("FORBIDDEN: funnels outside your record access")
  if (approve) {
    const [source] = await tx.select({ ownerMemberId: funnels.ownerMemberId }).from(funnels).where(and(eq(funnels.id, request.funnelId), eq(funnels.tenantId, ctx.tenantId))).for("update")
    if (source.ownerMemberId !== request.ownerMemberId) throw new Error("Funnel owner changed. Reject this request and ask the new owner to submit again.")
    const requester = (await activeMembersWithPermissions(tx,ctx)).find(member=>member.memberId===request.requesterMemberId)
    if (!requester?.can(PERMISSIONS.OPPORTUNITY_UPDATE)) throw new Error("Requester is no longer active or allowed to edit funnels. Reject this request.")
    const requesterScope = await visibleMemberIds(tx,requester)
    if ((request.requesterMemberId !== request.ownerMemberId && !canManageAllRecords(requester)) ||
      (!canManageAllRecords(requester) && records.some(record=>!ownsOrManages(requesterScope,record.ownerMemberId)))) {
      throw new Error("Requester no longer has access to both funnels. Reject this request.")
    }
    // All current stage, relationship and financial blockers are rechecked here.
    await voidDuplicateWonFunnel(tx, ctx, request)
  }
  await tx.update(funnelVoidRequests).set({ status: approve ? "approved" : "rejected", decidedAt: new Date(), decidedByMemberId: ctx.memberId, decisionNote }).where(eq(funnelVoidRequests.id, request.id))
  await writeAudit(tx, ctx, { action: approve ? "funnel.void_approved" : "funnel.void_rejected", entityType: "opportunity", entityId: request.funnelId, after: { requestId, requesterMemberId: request.requesterMemberId, decisionNote } })
  if (!approve) await logActivity(tx, ctx, { entityType: "opportunity", entityId: request.funnelId, type: "system", subject: "Void request rejected", body: decisionNote })
  return { funnelId: request.funnelId, retainedFunnelId: request.retainedFunnelId }
}
