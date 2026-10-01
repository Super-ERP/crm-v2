import "server-only"
import { eq } from "drizzle-orm"
import type { Tx } from "@/db"
import { funnels } from "@/db/schema"
import { initialPaymentMilestoneStatus } from "@/lib/payment-milestone-lifecycle"

/** Serialize plan creation with the funnel's stage transition. */
export async function milestoneStatusForFunnel(
  tx: Tx,
  funnelId: string | null | undefined
) {
  if (!funnelId) return initialPaymentMilestoneStatus(null)
  const [funnel] = await tx
    .select({ status: funnels.status })
    .from(funnels)
    .where(eq(funnels.id, funnelId))
    .limit(1)
    .for("update")
  return initialPaymentMilestoneStatus(funnel?.status)
}
