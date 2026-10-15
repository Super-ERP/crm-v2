import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import type { Tx } from "@/db"
import { funnels, pipelineStages, quotations } from "@/db/schema"
import { quoteNet } from "@/server/services/value"
import { isPaymentMilestoneEligible } from "@/lib/payment-milestone-lifecycle"

/** Lock the funnel to serialize schedule creation/invoicing with stage changes. */
export async function milestoneContextForFunnel(
  tx: Tx,
  funnelId: string | null | undefined
) {
  if (!funnelId) throw new Error("Payment milestones require an accepted quotation and a funnel at 4a or Closed Won.")
  const [funnel] = await tx
    .select({
      stageCode: pipelineStages.code,
      stageKind: pipelineStages.kind,
      funnelStatus: funnels.status,
      quotationStatus: quotations.status,
      quotationId: quotations.id,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
    })
    .from(funnels)
    .innerJoin(pipelineStages, eq(funnels.currentStageId, pipelineStages.id))
    .leftJoin(quotations, and(eq(quotations.funnelId, funnels.id), eq(quotations.tenantId, funnels.tenantId), eq(quotations.status, "accepted"), isNull(quotations.deletedAt)))
    .where(and(eq(funnels.id, funnelId), isNull(funnels.deletedAt)))
    .limit(1)
    .for("update", { of: funnels })
  if (!funnel || !funnel.quotationId || !isPaymentMilestoneEligible(funnel)) {
    throw new Error("Payment milestones require an accepted quotation and a funnel at 4a or Closed Won.")
  }
  return {
    status: "pending_invoicing" as const,
    quotationId: funnel.quotationId,
    value: quoteNet({ subtotal: funnel.subtotal ?? "0", discountTotal: funnel.discountTotal ?? "0" }),
  }
}

export async function milestoneStatusForFunnel(tx: Tx, funnelId: string | null | undefined): Promise<"pending_invoicing"> {
  return (await milestoneContextForFunnel(tx, funnelId)).status
}
