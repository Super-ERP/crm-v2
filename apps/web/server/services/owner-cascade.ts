import "server-only"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import { persons, funnels, opportunities, projects, contracts, quotations, stageApprovalRequests } from "@/db/schema"

/**
 * When an account's owner changes, its owned records follow so record-scoped
 * access stays consistent.
 *
 * Contacts, opportunity containers, funnels, projects and contracts each carry
 * their own owner. Quotations and milestones inherit access via their funnel.
 * Pending decisions from the previous owner are closed for resubmission.
 *
 * Runs inside the caller's transaction so the reassignment is atomic with the
 * account update. Only touches non-deleted rows.
 * Returns the number of rows updated per child table (useful for auditing).
 */
export async function cascadeAccountOwner(
  tx: Tx,
  tenantId: string,
  accountId: string,
  newOwnerMemberId: string
): Promise<{ persons: number; opportunities: number; funnels: number; projects: number; contracts: number; stageApprovals: number; quotationApprovals: number }> {
  const updatedPersons = await tx
    .update(persons)
    .set({ ownerMemberId: newOwnerMemberId })
    .where(
      and(
        eq(persons.tenantId, tenantId),
        eq(persons.accountId, accountId),
        isNull(persons.deletedAt)
      )
    )
    .returning({ id: persons.id })

  const updatedOpportunities = await tx
    .update(opportunities)
    .set({ ownerMemberId: newOwnerMemberId })
    .where(
      and(
        eq(opportunities.tenantId, tenantId),
        eq(opportunities.accountId, accountId),
        isNull(opportunities.deletedAt)
      )
    )
    .returning({ id: opportunities.id })

  const updatedFunnels = await tx
    .update(funnels)
    .set({ ownerMemberId: newOwnerMemberId })
    .where(
      and(
        eq(funnels.tenantId, tenantId),
        eq(funnels.accountId, accountId),
        isNull(funnels.deletedAt)
      )
    )
    .returning({ id: funnels.id })

  const updatedProjects = await tx
    .update(projects)
    .set({ ownerMemberId: newOwnerMemberId })
    .where(
      and(
        eq(projects.tenantId, tenantId),
        eq(projects.accountId, accountId),
        isNull(projects.deletedAt)
      )
    )
    .returning({ id: projects.id })

  const updatedContracts = await tx
    .update(contracts)
    .set({ ownerMemberId: newOwnerMemberId })
    .where(
      and(
        eq(contracts.tenantId, tenantId),
        eq(contracts.accountId, accountId),
        isNull(contracts.deletedAt)
      )
    )
    .returning({ id: contracts.id })

  const accountFunnels = sql`(select ${funnels.id} from ${funnels}
    where ${funnels.tenantId} = ${tenantId} and ${funnels.accountId} = ${accountId})`

  const cancelledStageApprovals = await tx
    .update(stageApprovalRequests)
    .set({
      status: "cancelled",
      decidedAt: new Date(),
      decisionNote: "Account owner changed. The new owner must resubmit this stage request.",
    })
    .where(and(
      eq(stageApprovalRequests.tenantId, tenantId),
      eq(stageApprovalRequests.status, "pending"),
      inArray(stageApprovalRequests.funnelId, accountFunnels)
    ))
    .returning({ id: stageApprovalRequests.id })

  const resetQuotations = await tx
    .update(quotations)
    .set({
      status: "draft",
      approverMemberId: null,
      approvedAt: null,
      rejectionReason: "Account owner changed. Resubmit for approval under the new owner.",
      updatedAt: new Date(),
    })
    .where(and(
      eq(quotations.tenantId, tenantId),
      eq(quotations.status, "pending_approval"),
      isNull(quotations.deletedAt),
      inArray(quotations.funnelId, accountFunnels)
    ))
    .returning({ id: quotations.id })

  return {
    persons: updatedPersons.length,
    opportunities: updatedOpportunities.length,
    funnels: updatedFunnels.length,
    projects: updatedProjects.length,
    contracts: updatedContracts.length,
    stageApprovals: cancelledStageApprovals.length,
    quotationApprovals: resetQuotations.length,
  }
}
