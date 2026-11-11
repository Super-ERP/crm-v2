"use server"

import { and, asc, eq, isNull, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { withTenant } from "@/lib/actions"
import { runAction, type ActionResult } from "@/lib/action-result"
import { PERMISSIONS } from "@/lib/permissions"
import { canManageAllRecords, ownsOrManages, ownerScope, visibleMemberIds } from "@/lib/access-scope"
import { funnels, pipelineStages } from "@/db/schema"
import type { VoidDuplicateFunnelInput } from "@/lib/funnel-void"
import { requestFunnelVoid } from "@/server/services/funnel-void-approval"

export async function listDuplicateWonTargets(funnelId: string) {
  return withTenant(PERMISSIONS.OPPORTUNITY_UPDATE, async (tx, ctx) => {
    const visible = await visibleMemberIds(tx, ctx)
    const [source] = await tx.select().from(funnels).where(and(eq(funnels.id, funnelId), eq(funnels.tenantId, ctx.tenantId), isNull(funnels.deletedAt))).limit(1)
    if (!source || (!canManageAllRecords(ctx) && !ownsOrManages(visible, source.ownerMemberId))) throw new Error("Funnel not available")
    return tx.select({ id: funnels.id, name: funnels.name, projectCode: funnels.projectCode }).from(funnels)
      .innerJoin(pipelineStages, and(eq(pipelineStages.id, funnels.currentStageId), eq(pipelineStages.tenantId, funnels.tenantId)))
      .where(and(eq(funnels.tenantId, ctx.tenantId), ne(funnels.id, funnelId), eq(funnels.accountId, source.accountId), eq(funnels.currency, source.currency), eq(funnels.status, "won"), eq(pipelineStages.kind, "WON"), isNull(funnels.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
      .orderBy(asc(funnels.name), asc(funnels.id))
  })
}

export async function voidDuplicateFunnel(input: VoidDuplicateFunnelInput): Promise<ActionResult<{ requestId: string }>> {
  return runAction(async () => {
    const requestId = await withTenant(PERMISSIONS.OPPORTUNITY_UPDATE, (tx, ctx) => requestFunnelVoid(tx, ctx, input), { deadlockRetries: 2 })
    revalidatePath(`/funnel/${input.funnelId}`)
    revalidatePath("/approvals")
    return { requestId }
  })
}
