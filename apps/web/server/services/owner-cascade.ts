import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import type { Tx } from "@/db"
import { persons, funnels, opportunities, projects, contracts } from "@/db/schema"

/**
 * When an account's owner changes, its owned records follow so record-scoped
 * access stays consistent.
 *
 * Contacts, opportunity containers, funnels, projects and contracts each carry
 * their own owner. Quotations and milestones inherit access via their funnel.
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
): Promise<{ persons: number; opportunities: number; funnels: number; projects: number; contracts: number }> {
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

  return {
    persons: updatedPersons.length,
    opportunities: updatedOpportunities.length,
    funnels: updatedFunnels.length,
    projects: updatedProjects.length,
    contracts: updatedContracts.length,
  }
}
