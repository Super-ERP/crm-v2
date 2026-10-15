import "server-only"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { runInTenant, type Tx } from "@/db"
import { PERMISSIONS } from "@/lib/permissions"
import { resolveApprovalRoute, findManagerApprover } from "./approval-routing"
import { assertConversionSnapshot, validateConversionInput, type LeadConversionInput } from "@/lib/lead-conversion-approval"
import {
  leads,
  accounts,
  persons,
  funnels,
  pipelines,
  pipelineStages,
  funnelStageHistory,
} from "@/db/schema"
import { FIRST_STAGE_CODE } from "@/lib/funnel-stages"
import {
  tenantConfiguredCurrency,
  tenantCurrencyForRecord,
} from "./tenant-currency"
import {
  createOpportunityContainer,
  recomputeOpportunityTotal,
} from "./opportunity-container"
import { writeAudit } from "@/server/audit"
import {
  visibleMemberIds,
  ownsOrManages,
  canManageAllRecords,
} from "@/lib/access-scope"
import type { ServerContext } from "@/lib/server-context"

export type ConversionResult = {
  accountId: string
  personId: string
  /** The created Opportunity container (null when createOpportunity was false). */
  opportunityId: string | null
}

export function resolveDefaultSalesFunnel(
  pipelines: readonly {
    id: string
    isDefault: boolean
    name?: string
    tenantId?: string
  }[],
  stages: readonly {
    id: string
    pipelineId: string
    code: string
    kind: string
    sortOrder: number
    tenantId?: string
  }[],
  tenantId?: string
): { pipelineId: string; stageId: string } {
  const funnel = pipelines.find(
    (pipeline) =>
      pipeline.isDefault && (!tenantId || !pipeline.tenantId || pipeline.tenantId === tenantId)
  )
  if (!funnel) throw new Error("No default Sales Funnel configured")
  const stage = stages
    .filter(
      (candidate) =>
        candidate.pipelineId === funnel.id &&
        (!tenantId || !candidate.tenantId || candidate.tenantId === tenantId) &&
        candidate.code === FIRST_STAGE_CODE &&
        candidate.kind === "OPEN"
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]
  if (!stage) throw new Error("Default Sales Funnel has no OPEN 0E stage")
  return { pipelineId: funnel.id, stageId: stage.id }
}

/**
 * Atomically convert a qualified lead into an Account + Person (+ optional
 * Opportunity seeded at stage 0e). Carries owner & source; links the lead back
 * to the created records and marks it converted.
 */
export async function convertLead(ctx: ServerContext, input: LeadConversionInput): Promise<(ConversionResult & { pending?: false }) | { pending: true; requestId: string; accountId: null; personId: null; opportunityId: null }> {
  if (!ctx.can(PERMISSIONS.LEAD_CONVERT)) throw new Error("FORBIDDEN: missing lead.convert")
  validateConversionInput(input)
  return runInTenant(ctx.tenantId, async tx => {
    const [lead] = await tx.select().from(leads).where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt))).limit(1).for("update")
    if (!lead) throw new Error("Lead not found")
    const visible = await visibleMemberIds(tx, ctx)
    if (!canManageAllRecords(ctx) && !ownsOrManages(visible, lead.ownerMemberId)) throw new Error("FORBIDDEN: not permitted on this lead")
    await validateLeadAndAccount(tx, ctx, lead, input)
    const pending = await tx.execute(sql`SELECT id FROM lead_conversion_approval_requests WHERE tenant_id = ${ctx.tenantId} AND lead_id = ${lead.id} AND status = 'pending'`)
    if (pending.length) throw new Error("A conversion request is already pending for this lead")
    const route = await resolveApprovalRoute(tx, ctx, PERMISSIONS.LEAD_CONVERT_APPROVE)
    if (route.direct) return executeConversion(tx, ctx, input)
    if (!ctx.memberId) throw new Error("A tenant membership is required")
    const [request] = await tx.execute<{ id: string }>(sql`
      INSERT INTO lead_conversion_approval_requests (tenant_id, lead_id, requester_member_id, approver_member_id, input_snapshot, lead_snapshot)
      VALUES (${ctx.tenantId}, ${lead.id}, ${ctx.memberId}, ${route.approverMemberId}, ${JSON.stringify(input)}::jsonb, ${JSON.stringify(lead)}::jsonb) RETURNING id
    `)
    await writeAudit(tx, ctx, { action: "lead.conversion_requested", entityType: "lead", entityId: lead.id, after: { requestId: request.id, input, approverMemberId: route.approverMemberId } })
    return { accountId: null, personId: null, opportunityId: null, pending: true as const, requestId: request.id }
  })
}

async function validateLeadAndAccount(tx: Tx, ctx: ServerContext, lead: typeof leads.$inferSelect, input: LeadConversionInput) {
  if (lead.status === "converted") throw new Error("Lead already converted")
  if (lead.status === "disqualified") throw new Error("Disqualified leads cannot be converted")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email?.trim() ?? "")) throw new Error("Add a valid email before converting")
  if (input.existingAccountId) {
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, input.existingAccountId), isNull(accounts.deletedAt))).limit(1).for("share")
    if (!account) throw new Error("Account not found")
    const visible = await visibleMemberIds(tx, ctx)
    if (!canManageAllRecords(ctx) && !ownsOrManages(visible, account.ownerMemberId)) throw new Error("FORBIDDEN: not permitted on this account")
    if (!account.ownerMemberId) throw new Error("Assign an account owner before converting this lead.")
  }
}

export async function decideLeadConversion(ctx: ServerContext, requestId: string, decision: "approved" | "rejected" | "cancelled", reason?: string) {
  if (!["approved", "rejected", "cancelled"].includes(decision)) throw new Error("Invalid decision")
  if (decision !== "cancelled" && !ctx.can(PERMISSIONS.LEAD_CONVERT_APPROVE)) throw new Error("FORBIDDEN: missing lead.convert.approve")
  if (decision === "rejected" && !reason?.trim()) throw new Error("A rejection reason is required")
  return runInTenant(ctx.tenantId, async tx => {
    const [request] = await tx.execute<{ id: string; lead_id: string; requester_member_id: string; status: string; input_snapshot: LeadConversionInput; lead_snapshot: unknown }>(sql`SELECT * FROM lead_conversion_approval_requests WHERE tenant_id = ${ctx.tenantId} AND id = ${requestId} FOR UPDATE`)
    if (!request || request.status !== "pending") throw new Error("Pending request not found")
    if (decision === "cancelled") {
      if (ctx.memberId !== request.requester_member_id) throw new Error("Only the requester can cancel this request")
    } else if (!ctx.isSuperadmin) {
      if (ctx.memberId === request.requester_member_id || await findManagerApprover(tx, request.requester_member_id, PERMISSIONS.LEAD_CONVERT_APPROVE) !== ctx.memberId)
        throw new Error("FORBIDDEN: only the assigned reporting manager can decide")
    }
    if (decision !== "cancelled") {
      if (ctx.memberId === request.requester_member_id) throw new Error("Cannot decide your own request")
      const [source] = await tx.select().from(leads).where(and(eq(leads.id, request.lead_id), isNull(leads.deletedAt))).limit(1).for("update")
      if (!source) throw new Error("Lead not found")
      const visible = await visibleMemberIds(tx, ctx)
      if (!canManageAllRecords(ctx) && !ownsOrManages(visible, source.ownerMemberId)) throw new Error("FORBIDDEN: not permitted on this lead")
    }
    let result: ConversionResult | null = null
    if (decision === "approved") {
      const [lead] = await tx.select().from(leads).where(and(eq(leads.id, request.lead_id), isNull(leads.deletedAt))).limit(1).for("update")
      if (!lead) throw new Error("Lead not found")
      assertConversionSnapshot(request.lead_snapshot, lead)
      validateConversionInput(request.input_snapshot)
      // Re-evaluate the requester's current membership, permission and owner scope.
      const permissions = await tx.execute<{ key: string; userId: string }>(sql`
        SELECT DISTINCT perm.key, m.user_id AS "userId" FROM membership_profiles profile
        JOIN member m ON m.id = profile.member_id AND m.organization_id = ${ctx.tenantId}
        JOIN role_permissions rp ON rp.role_id IN (
          SELECT mr.role_id FROM member_roles mr WHERE mr.member_id = profile.member_id
          UNION ALL SELECT profile.role_id WHERE NOT EXISTS (SELECT 1 FROM member_roles mr WHERE mr.member_id = profile.member_id)
        ) JOIN permissions perm ON perm.id = rp.permission_id
        WHERE profile.member_id = ${request.requester_member_id} AND profile.status = 'active'
      `)
      const keys = new Set(permissions.map(p => p.key))
      const requesterCtx: ServerContext = { ...ctx, memberId: request.requester_member_id, userId: permissions[0]?.userId ?? "", isSuperadmin: false, permissions: keys, can: key => keys.has(key) }
      if (!requesterCtx.can(PERMISSIONS.LEAD_CONVERT)) throw new Error("Requester no longer has permission to convert leads")
      const requesterVisible = await visibleMemberIds(tx, requesterCtx)
      if (!canManageAllRecords(requesterCtx) && !ownsOrManages(requesterVisible, lead.ownerMemberId)) throw new Error("Requester no longer has access to this lead")
      await validateLeadAndAccount(tx, requesterCtx, lead, request.input_snapshot)
      await validateLeadAndAccount(tx, ctx, lead, request.input_snapshot)
      result = await executeConversion(tx, ctx, request.input_snapshot, request.requester_member_id)
    }
    await tx.execute(sql`UPDATE lead_conversion_approval_requests SET status = ${decision}, decision_note = ${reason?.trim() || null}, decided_at = now(), decided_by_member_id = ${ctx.memberId} WHERE tenant_id = ${ctx.tenantId} AND id = ${requestId}`)
    await writeAudit(tx, ctx, { action: `lead.conversion_${decision}`, entityType: "lead", entityId: request.lead_id, after: { requestId, reason: reason?.trim(), result } })
    return { leadId: request.lead_id, result }
  })
}

/** Private: every caller must pass through submission routing or a locked approval decision. */
async function executeConversion(tx: Tx, ctx: ServerContext, input: LeadConversionInput, initiatingMemberId = ctx.memberId): Promise<ConversionResult> {
    // Lock the lead row so two concurrent converts can't both proceed (TOCTOU).
    const [lead] = await tx
      .select()
      .from(leads)
      .where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt)))
      .limit(1)
      .for("update")
    if (!lead) throw new Error("Lead not found")
    if (lead.status === "converted") throw new Error("Lead already converted")

    // A contact must carry an email. New leads always have one (enforced on
    // create/update), but guard here too so legacy/imported leads can't convert
    // into an email-less contact.
    if (!lead.email?.trim())
      throw new Error("This lead has no email. Add a valid email before converting.")

    // Account: attach to an existing one, or create from the company name. When
    // attaching to a caller-supplied account, validate it exists in this tenant
    // and the caller owns/manages it (mirrors createPerson) — closes the
    // cross-tenant FK / record-scope bypass.
    let accountId = input.existingAccountId ?? null
    let accountOwnerMemberId: string | null = null
    if (accountId) {
      const visible = await visibleMemberIds(tx, ctx)
      const [dest] = await tx
        .select({ ownerMemberId: accounts.ownerMemberId })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), isNull(accounts.deletedAt)))
        .limit(1)
        .for("share")
      if (!dest) throw new Error("Account not found")
      accountOwnerMemberId = dest.ownerMemberId
      if (
        !canManageAllRecords(ctx) &&
        !ownsOrManages(visible, dest.ownerMemberId)
      ) {
        throw new Error("FORBIDDEN: not permitted on this account")
      }
    }
    if (!accountId) {
      // Company code is compulsory on the new-account path (used in project
      // codes). Validate its format and tenant-uniqueness here too — the dialog
      // pre-checks, but the server is authoritative.
      const code = (input.newAccount?.code ?? "").trim().toUpperCase()
      if (!/^[A-Z0-9]{2,6}$/.test(code))
        throw new Error(
          "A company code (2–6 letters/digits) is required for the new account"
        )
      const [dup] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.tenantId, ctx.tenantId),
            eq(sql`upper(${accounts.code})`, code),
            isNull(accounts.deletedAt)
          )
        )
        .limit(1)
      if (dup) throw new Error("Company code already used by another account")

      // Keep only the populated address fields (drop empties) so we never store
      // an object of all-nulls in the jsonb column.
      const rawAddress = input.newAccount?.address ?? null
      const addressEntries = rawAddress
        ? Object.entries(rawAddress).filter(([, v]) => v != null && v !== "")
        : []
      const billingAddress = addressEntries.length
        ? Object.fromEntries(addressEntries)
        : null

      const [acc] = await tx
        .insert(accounts)
        .values({
          tenantId: ctx.tenantId,
          name: lead.companyName || lead.name,
          code,
          ownerMemberId: lead.ownerMemberId ?? initiatingMemberId,
          currency: await tenantConfiguredCurrency(tx, ctx.tenantId, undefined),
          accountType:
            input.newAccount?.accountType === "reseller" ? "reseller" : "client",
          phone: input.newAccount?.phone?.trim() || null,
          billingAddress,
        })
        .returning()
      accountId = acc.id
      accountOwnerMemberId = acc.ownerMemberId
    }
    if (!accountOwnerMemberId) throw new Error("Assign an account owner before converting this lead.")

    // Person under that account.
    const parts = (lead.name || "").trim().split(/\s+/)
    const firstName = parts[0] || lead.name || "Contact"
    const lastName = parts.slice(1).join(" ") || null
    const [person] = await tx
      .insert(persons)
      .values({
        tenantId: ctx.tenantId,
        accountId,
        ownerMemberId: accountOwnerMemberId,
        firstName,
        lastName,
        email: lead.email,
        phone: lead.phone,
        isPrimary: true,
      })
      .returning()

    // Optional Opportunity container (+ first funnel) at the first stage.
    let containerId: string | null = null
    if (input.createOpportunity) {
      const [defaultFunnel] = await tx
        .select({
          id: pipelines.id,
          name: pipelines.name,
          isDefault: pipelines.isDefault,
          tenantId: pipelines.tenantId,
        })
        .from(pipelines)
        .where(and(eq(pipelines.tenantId, ctx.tenantId), eq(pipelines.isDefault, true)))
        .limit(1)
      const stages = defaultFunnel
        ? await tx
            .select()
            .from(pipelineStages)
            .where(
              and(
                eq(pipelineStages.pipelineId, defaultFunnel.id),
                eq(pipelineStages.code, FIRST_STAGE_CODE),
                eq(pipelineStages.kind, "OPEN")
              )
            )
            .orderBy(asc(pipelineStages.sortOrder))
        : []
      const resolved = resolveDefaultSalesFunnel(
        defaultFunnel ? [defaultFunnel] : [],
        stages,
        ctx.tenantId
      )
      const stage = stages.find((candidate) => candidate.id === resolved.stageId)!
      const dealName =
        input.opportunityName || `${lead.companyName || lead.name} opportunity`
      const funnelName = input.funnelName || dealName
      const [account] = await tx
        .select({ currency: accounts.currency })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1)
      const currency = await tenantCurrencyForRecord(
        tx,
        ctx.tenantId,
        undefined,
        account?.currency
      )
      const ownerMemberId = accountOwnerMemberId
      // Lead → Opportunity CONTAINER, with a first funnel under it.
      const container = await createOpportunityContainer(tx, ctx, {
        accountId,
        ownerMemberId,
        name: dealName,
        year: input.expectedCloseDate
          ? Number(input.expectedCloseDate.slice(0, 4))
          : null,
        currency,
        primaryPersonId: person.id,
      })
      containerId = container.id
      const [opp] = await tx
        .insert(funnels)
        .values({
          tenantId: ctx.tenantId,
          opportunityId: container.id,
          name: funnelName,
          accountId,
          primaryPersonId: person.id,
          pipelineId: resolved.pipelineId,
          currentStageId: stage.id,
          ownerMemberId,
          currency,
          expectedCloseDate: input.expectedCloseDate ?? null,
        })
        .returning()
      await tx.insert(funnelStageHistory).values({
        tenantId: ctx.tenantId,
        funnelId: opp.id,
        toStageId: stage.id,
        changedByMemberId: ctx.memberId,
        probabilityAtChange: stage.probability,
        source: "manual",
      })
      await recomputeOpportunityTotal(tx, ctx.tenantId, container.id)
    }

    await tx
      .update(leads)
      .set({
        status: "converted",
        convertedAccountId: accountId,
        convertedPersonId: person.id,
        convertedOpportunityId: containerId,
        convertedAt: new Date(),
      })
      .where(eq(leads.id, input.leadId))

    await writeAudit(tx, ctx, {
      action: "lead.converted",
      entityType: "lead",
      entityId: input.leadId,
      after: { accountId, personId: person.id, opportunityId: containerId },
    })

    return { accountId, personId: person.id, opportunityId: containerId }
}
