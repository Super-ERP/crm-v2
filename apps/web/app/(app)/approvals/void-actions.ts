"use server"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { runInTenant } from "@/db"
import { requireContext } from "@/lib/server-context"
import { withTenant } from "@/lib/actions"
import { runAction } from "@/lib/action-result"
import { PERMISSIONS } from "@/lib/permissions"
import { canManageAllRecords, ownerScope, visibleMemberIds } from "@/lib/access-scope"
import { funnels, funnelVoidRequests } from "@/db/schema"
import { approvalQueueSql } from "@/server/services/approval-queue-query"
import { decideFunnelVoid } from "@/server/services/funnel-void-approval"
import type { ApprovalQueueRead } from "@/lib/approval-queue"

export type FunnelVoidApprovalRow = {
 id: string; funnelId: string; retainedFunnelId: string; opportunityName: string; retainedName: string;
 requesterMemberId: string; requesterName: string | null; reason: string; status: "pending" | "approved" | "rejected" | "cancelled";
 requestedAt: string; decidedAt: string | null; decisionNote: string | null; deciderName: string | null; queueSortKey?: string;
}
export async function listFunnelVoidApprovals(tab: "incoming" | "mine", queue: ApprovalQueueRead) {
 const ctx=await requireContext()
 if(!ctx.can(PERMISSIONS.OPPORTUNITY_VIEW)||!ctx.memberId||(tab === "incoming" && !ctx.can(PERMISSIONS.FUNNEL_VOID_APPROVE))) return {rows:[] as FunnelVoidApprovalRow[],total:0}
 const memberId=ctx.memberId
 return runInTenant(ctx.tenantId, async tx => {
  const visible = await visibleMemberIds(tx,ctx)
  const scope = canManageAllRecords(ctx) ? sql`true` : and(ownerScope(funnels.ownerMemberId,visible), sql`exists(select 1 from funnels retained where retained.id=${funnelVoidRequests.retainedFunnelId} and retained.tenant_id=${ctx.tenantId} and ${visible === null ? sql`true` : visible.length ? sql`retained.owner_member_id in (${sql.join(visible.map(id=>sql`${id}`),sql`,`)})` : sql`false`})`)
  const source = sql`select ${funnelVoidRequests.id} as id, ${funnelVoidRequests.funnelId} as "funnelId", ${funnelVoidRequests.retainedFunnelId} as "retainedFunnelId",
   ${funnels.name} as "opportunityName", retained.name as "retainedName", ${funnelVoidRequests.requesterMemberId} as "requesterMemberId", u.name as "requesterName",
   ${funnelVoidRequests.reason} as reason, ${funnelVoidRequests.status} as status, ${funnelVoidRequests.requestedAt} as "requestedAt", ${funnelVoidRequests.decidedAt} as "decidedAt", ${funnelVoidRequests.decisionNote} as "decisionNote", decider.name as "deciderName",
   floor(extract(epoch from ${funnelVoidRequests.requestedAt})*1000000)::bigint::text as "queueSortKey",
   concat_ws(' ',${funnels.name},retained.name,u.name,${funnelVoidRequests.reason}) as "queueSearch"
   from ${funnelVoidRequests} join ${funnels} on ${funnels.id}=${funnelVoidRequests.funnelId} and ${funnels.tenantId}=${ctx.tenantId}
   join funnels retained on retained.id=${funnelVoidRequests.retainedFunnelId} and retained.tenant_id=${ctx.tenantId}
   join member m on m.id=${funnelVoidRequests.requesterMemberId} and m.organization_id=${ctx.tenantId} join "user" u on u.id=m.user_id
   left join member dm on dm.id=${funnelVoidRequests.decidedByMemberId} and dm.organization_id=${ctx.tenantId} left join "user" decider on decider.id=dm.user_id
   where ${funnelVoidRequests.tenantId}=${ctx.tenantId} and ${tab==='mine'?eq(funnelVoidRequests.requesterMemberId,memberId):and(eq(funnelVoidRequests.status,'pending'),sql`${funnelVoidRequests.requesterMemberId}<>${ctx.memberId}`,scope)}`
  const raw = await tx.execute<FunnelVoidApprovalRow & {queueTotal?:number}>(approvalQueueSql(source,'void',queue))
  return {rows:raw.filter(r=>r.id),total:Number(raw[0]?.queueTotal??0)}
 })
}
export async function decideVoidRequest(input: {requestId:string;approve:boolean;note:string}) {
 return runAction(async()=>{
  const value=z.object({requestId:z.string().uuid(),approve:z.boolean(),note:z.string().max(1000)}).parse(input)
  const result=await withTenant(PERMISSIONS.FUNNEL_VOID_APPROVE,(tx,ctx)=>decideFunnelVoid(tx,ctx,value.requestId,value.approve,value.note),{deadlockRetries:2})
  for(const path of ['/approvals','/funnel','/opportunities','/accounts','/quotations','/payment-milestones','/project-codes','/dashboard','/reports','/audit',`/funnel/${result.funnelId}`,`/funnel/${result.retainedFunnelId}`])revalidatePath(path)
  return result
 })
}
