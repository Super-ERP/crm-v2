import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { opportunities, funnels } from "@/db/schema"
import { visibleMemberIds, ownsOrManages, canManageAllRecords } from "@/lib/access-scope"
import { recordChanges } from "@/server/services/changes/record"
import { recordPpvvcSyncChanges, updateOpportunityPpvvc } from "@/server/services/ppvvc"
import { normalizePpvvcPatch } from "@/lib/ppvvc"

export type OpportunityContainerUpdateInput = {
  description?: string | null
  // PPVVC "Analysis" block — source of truth on the container, cascaded to
  // every non-deleted child funnel (same pattern as project nature below).
  pain?: string | null
  power?: string | null
  vision?: string | null
  value?: string | null
  control?: string | null
  projectNatureCode?: string | null
  projectNatures?: string[] | null
  ownerContactId?: string | null
  ownerBudgetLimit?: string | null
  powerSponsorContactId?: string | null
  powerSponsorBudgetLimit?: string | null
  estimatedBudget?: string | null
  estimatedCloseDate?: string | null
  isRenewal?: boolean
  showDashboards?: boolean
  assignedPresales?: string | null
  competitor?: string | null
}


/** Update a scoped container inside the caller's existing tenant transaction. */
export async function updateOpportunityContainerInTransaction(tx: Tx, ctx: ServerContext, id: string, input: OpportunityContainerUpdateInput) {
const [existing] = await tx
  .select()
  .from(opportunities)
  .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt)))
  .limit(1)
if (!existing) throw new Error("Opportunity not found")

const visible = await visibleMemberIds(tx, ctx)
if (!canManageAllRecords(ctx) && !ownsOrManages(visible, existing.ownerMemberId)) {
  throw new Error("FORBIDDEN: not permitted on this Opportunity")
}

const ppvvcInput = normalizePpvvcPatch({
  pain: input.pain,
  power: input.power,
  vision: input.vision,
  value: input.value,
  control: input.control,
})
const cascade = {
  projectNatureCode:
    input.projectNatures !== undefined
      ? (input.projectNatures?.[0] ?? null)
      : input.projectNatureCode === undefined
        ? existing.projectNatureCode
        : input.projectNatureCode || null,
  projectNatures:
    input.projectNatures === undefined
      ? existing.projectNatures
      : input.projectNatures && input.projectNatures.length
        ? input.projectNatures
        : null,
}

const updated = {
  description:
    input.description === undefined ? existing.description : input.description || null,
  ...cascade,
  ownerContactId:
    input.ownerContactId === undefined
      ? existing.ownerContactId
      : input.ownerContactId || null,
  ownerBudgetLimit:
    input.ownerBudgetLimit === undefined
      ? existing.ownerBudgetLimit
      : input.ownerBudgetLimit || null,
  powerSponsorContactId:
    input.powerSponsorContactId === undefined
      ? existing.powerSponsorContactId
      : input.powerSponsorContactId || null,
  powerSponsorBudgetLimit:
    input.powerSponsorBudgetLimit === undefined
      ? existing.powerSponsorBudgetLimit
      : input.powerSponsorBudgetLimit || null,
  estimatedBudget:
    input.estimatedBudget === undefined
      ? existing.estimatedBudget
      : input.estimatedBudget || null,
  estimatedCloseDate:
    input.estimatedCloseDate === undefined
      ? existing.estimatedCloseDate
      : input.estimatedCloseDate || null,
  isRenewal: input.isRenewal ?? existing.isRenewal,
  showDashboards: input.showDashboards ?? existing.showDashboards,
  assignedPresales:
    input.assignedPresales === undefined
      ? existing.assignedPresales
      : input.assignedPresales || null,
  competitor:
    input.competitor === undefined ? existing.competitor : input.competitor || null,
  updatedAt: new Date(),
}

const hasPpvvcInput = Object.keys(ppvvcInput).length > 0
const syncedPpvvc = hasPpvvcInput
  ? await updateOpportunityPpvvc(tx, {
      opportunityId: id,
      tenantId: ctx.tenantId,
      values: ppvvcInput,
      actorId: ctx.userId,
    })
  : null
if (syncedPpvvc) await recordPpvvcSyncChanges(tx, ctx, syncedPpvvc)

await tx.update(opportunities).set(updated).where(eq(opportunities.id, id))

// Project nature remains a compatibility snapshot on live child Funnels;
// PPVVC snapshots are maintained only by updateOpportunityPpvvc above.
await tx
  .update(funnels)
  .set({
    projectNatureCode: cascade.projectNatureCode,
    projectNatures: cascade.projectNatures,
    updatedAt: new Date(),
  })
  .where(and(eq(funnels.opportunityId, id), isNull(funnels.deletedAt)))

await recordChanges(tx, ctx, {
  entityType: "opportunity",
  registryKey: "opportunity",
  entityId: id,
  before: existing,
  after: { ...existing, ...updated },
  subject: "Opportunity updated",
})
}
