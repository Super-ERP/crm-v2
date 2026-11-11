import "server-only"
import { and,eq,ne,isNull,notInArray,desc } from "drizzle-orm"
import type { Tx } from "@/db"
import { funnels,quotations,opportunityProducts } from "@/db/schema"
import { syncOpportunityAmount } from "./value"
import { syncFunnelProductsFromQuote } from "./quote-sync"

export async function reassignPrimaryAfterRemoval(
  tx: Tx,
  ctx: Parameters<typeof syncOpportunityAmount>[1],
  funnelId: string,
  removedQuotationId: string
): Promise<void> {
  const [opp] = await tx
    .select({ primaryQuotationId: funnels.primaryQuotationId })
    .from(funnels)
    .where(eq(funnels.id, funnelId))
    .limit(1)
  if (opp?.primaryQuotationId !== removedQuotationId) return

  const [candidate] = await tx
    .select({ id: quotations.id })
    .from(quotations)
    .where(
      and(
        eq(quotations.funnelId, funnelId),
        ne(quotations.id, removedQuotationId),
        isNull(quotations.deletedAt),
        notInArray(quotations.status, ["rejected", "expired", "void"])
      )
    )
    .orderBy(desc(quotations.createdAt),desc(quotations.id))
    .limit(1)

  if (candidate) {
    await tx
      .update(quotations)
      .set({ isPrimary: false })
      .where(
        and(
          eq(quotations.funnelId, funnelId),
          ne(quotations.id, candidate.id)
        )
      )
    await tx
      .update(quotations)
      .set({ isPrimary: true })
      .where(eq(quotations.id, candidate.id))
    await tx
      .update(funnels)
      .set({ primaryQuotationId: candidate.id, updatedAt: new Date() })
      .where(eq(funnels.id, funnelId))
    // Synced quote -> opportunity products (Salesforce Quote Line Item ->
    // Opportunity Product behaviour).
    await syncFunnelProductsFromQuote(tx, ctx.tenantId, funnelId, candidate.id)
  } else {
    // No live quote remains: clear the pointer AND reset the amount. Without
    // this, syncOpportunityAmount short-circuits on the null pointer and the
    // opportunity keeps reporting the removed quote's net in the forecast.
    await tx
      .update(funnels)
      .set({ primaryQuotationId: null, amount: null, updatedAt: new Date() })
      .where(eq(funnels.id, funnelId))
    // No synced quote left to drive opportunity products either.
    await tx
      .delete(opportunityProducts)
      .where(
        and(
          eq(opportunityProducts.tenantId, ctx.tenantId),
          eq(opportunityProducts.funnelId, funnelId)
        )
      )
  }
  await syncOpportunityAmount(tx, ctx, funnelId)
}

