"use server"

import { getTableFields } from "@/lib/table-controls/registry"

import { revalidatePath } from "next/cache"
import { withTenant } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { runAction, type ActionResult } from "@/lib/action-result"
import { opportunitiesList, opportunitiesGet, opportunitiesFilterOptions } from "@/lib/api-readers"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { opportunities } from "@/db/schema"
import { updateOpportunityContainerInTransaction, type OpportunityContainerUpdateInput } from "@/server/services/update-opportunity-container"

/** A resolved contact for display: name + derived "Designation" (persons.title). */
export type ContactRef = { id: string; name: string; designation: string | null }

export type OpportunityContainerRow = {
  projectCodes?: string[]
  crossDealProjectCodes?: string[]
  id: string
  code: string
  name: string
  accountId: string
  accountName: string
  accountCode: string | null
  accountOwnerMemberId: string | null
  accountOwnerName: string | null
  totalEstimatedFunnelAmount: string | null
  estimatedTotalsByCurrency: Array<{ currency: string; total: string }>
  funnelCount: number
  currency: string
  createdAt: Date
}

export async function listOpportunityPage(input: ServerTableQuery): Promise<{ rows: OpportunityContainerRow[]; total: number }> {
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => opportunitiesList(tx, ctx,
    normalizeRecordListQuery(input, ["name", "accountId", "funnelCount", "accountOwnerMemberId"], ["accountId", "accountOwnerMemberId"], getTableFields("opportunities"))))
}

export async function listOpportunityFilterOptions() {
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => opportunitiesFilterOptions(tx, ctx))
}

export type OpportunityContainerDetail = {
  opportunity: typeof opportunities.$inferSelect
  accountId: string
  accountName: string
  accountCurrency: string
  ownerName: string | null
  /** Opportunity Owner Contact, resolved with its derived Designation. */
  ownerContact: ContactRef | null
  /** Power Sponsor Contact, resolved with its derived Designation. */
  powerSponsorContact: ContactRef | null
  funnels: {
    projectCode?: string | null
    crossDealProjectCode?: string | null
    id: string
    name: string
    stageName: string | null
    stageKind: string | null
    status: string
    estimatedAmount: string | null
    currency: string
  }[]
  quotations: {
    id: string
    quoteNumber: string
    status: string
    total: string | null
    currency: string
    funnelId: string
    funnelName: string
  }[]
  products: {
    id: string
    description: string | null
    quantity: string
    unitPrice: string
    productCategory: string | null
    funnelId: string
    funnelName: string
  }[]
}

/** One Opportunity container with its child funnels. */
export async function getOpportunity(
  id: string
): Promise<OpportunityContainerDetail | null> {
  return withTenant(PERMISSIONS.OPPORTUNITY_VIEW, (tx, ctx) => opportunitiesGet(tx, ctx, id))
}

export type { OpportunityContainerUpdateInput } from "@/server/services/update-opportunity-container"

/**
 * Update an Opportunity container. PPVVC + project nature cascade to every
 * non-deleted child funnel (they're the source of truth here, same as at
 * container-creation time) — everything else is container-only.
 */
export async function updateOpportunityContainer(
  id: string,
  input: OpportunityContainerUpdateInput
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await withTenant(PERMISSIONS.OPPORTUNITY_UPDATE, async (tx, ctx) => {
      await updateOpportunityContainerInTransaction(tx, ctx, id, input)
    })
    revalidatePath(`/opportunities/${id}`)
  })
}
