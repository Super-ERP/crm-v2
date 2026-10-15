import "server-only"
import { findManagerApprover, requireManagerApprover } from "./approval-routing"
import { and, eq, isNull } from "drizzle-orm"
import { runInTenant, type Tx } from "@/db"
import {
  funnels,
  opportunities,
  accounts,
  pipelineStages,
  funnelStageHistory,
  stageApprovalRequests,
  tenantSettings,
} from "@/db/schema"
import {
  ensureOpportunityProjectCode,
  recomputeOpportunityTotal,
} from "@/server/services/opportunity-container"
import { PERMISSIONS } from "@/lib/permissions"
import {
  buildStageGate,
  missingFromKeys,
  requiresCloseRemarks,
  closeRemarksLabel,
  stagesRequiredBefore,
  requiredKeysForStages,
  isPresetFieldKey,
  assertTransitionAllowed,
  isRollbackTransition,
  requiresApprovalForTransition,
  requiresTransitionReason,
  canBypassApproval,
  type CustomFunnelField,
  type StageGateState,
} from "@/lib/stage-gate"
import { writeAudit } from "@/server/audit"
import { logActivity } from "@/server/services/activity"
import { getEntitledModuleMap } from "@/lib/modules.server"
import type { ServerContext } from "@/lib/server-context"
import { normalizeCustomFieldValue } from "@/lib/input-validation"
// Shared LOCAL YYYY-MM-DD formatter. Deriving `actualCloseDate` from this (a
// local-calendar slice) instead of a raw UTC `toISOString().slice(0,10)` keeps
// the date consistent with the `closedAt` timestamptz instead of rolling a day
// early for tenants east of UTC. (No per-tenant timezone field exists yet; the
// reporting layer remains the place to re-localize if needed.)
import { toDateString } from "@/lib/dates"

type StageRow = typeof pipelineStages.$inferSelect
type OppRow = typeof funnels.$inferSelect

function kindToStatus(kind: string): "open" | "won" | "lost" | "on_hold" {
  switch (kind) {
    case "WON":
      return "won"
    case "LOST":
      return "lost"
    case "PARKED":
      return "on_hold"
    default:
      return "open"
  }
}

/** Project codes are minted only when a child funnel first enters 4A. */
export function shouldAllocateOpportunityProjectCode(stageCode: string): boolean {
  return stageCode.trim().toLowerCase() === "4a"
}

function normalizeAdvanceCustomFields(
  customFields: Record<string, string> | null | undefined,
  defs: CustomFunnelField[]
): Record<string, string> | undefined {
  if (customFields === undefined) return undefined
  const safeCustomFields = customFields ?? {}
  const byKey = new Map(defs.map((f) => [f.key, f]))
  const normalized: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(safeCustomFields)) {
    const def = byKey.get(key)
    if (!def) continue
    const type = def.type ?? "text"
    const options = type === "select" ? def.options ?? [] : []
    normalized[key] = normalizeCustomFieldValue(
      rawValue,
      type,
      options,
      `${def.label} (${key})`
    )
  }
  return normalized
}

/**
 * Create (or reuse) a pending stage approval request routed to the reporting manager.
 */
async function createApprovalRequest(
  tx: Tx,
  ctx: ServerContext,
  opp: OppRow,
  target: StageRow,
  reason?: string
): Promise<{ approvalRequestId: string }> {
  if (!ctx.memberId) throw new Error("No member context")

  const [existing] = await tx
    .select({ id: stageApprovalRequests.id })
    .from(stageApprovalRequests)
    .where(
      and(
        eq(stageApprovalRequests.funnelId, opp.id),
        eq(stageApprovalRequests.targetStageId, target.id),
        eq(stageApprovalRequests.status, "pending")
      )
    )
    .limit(1)
  if (existing) return { approvalRequestId: existing.id }

  const approver = await requireManagerApprover(tx, ctx.memberId, PERMISSIONS.STAGE_ADVANCE_APPROVE)
  const [req] = await tx
    .insert(stageApprovalRequests)
    .values({
      tenantId: ctx.tenantId,
      funnelId: opp.id,
      requesterMemberId: ctx.memberId,
      fromStageId: opp.currentStageId,
      targetStageId: target.id,
      // Approval requests need an audit label, but requester does not need to
      // write a reason unless closing Lost/KIV.
      reason: reason?.trim() || "Stage advance requested",
      status: "pending",
      approverMemberId: approver,
    })
    .returning()
  await writeAudit(tx, ctx, {
    action: "approval.requested",
    entityType: "stage_approval_request",
    entityId: req.id,
    after: { funnelId: opp.id, targetStage: target.code },
  })
  return { approvalRequestId: req.id }
}

async function cancelPendingApprovalRequests(
  tx: Tx,
  ctx: ServerContext,
  funnelId: string
): Promise<void> {
  const pending = await tx
    .select({ id: stageApprovalRequests.id })
    .from(stageApprovalRequests)
    .where(
      and(
        eq(stageApprovalRequests.funnelId, funnelId),
        eq(stageApprovalRequests.status, "pending")
      )
    )
    .for("update")

  for (const request of pending) {
    const cancelled = await tx
      .update(stageApprovalRequests)
      .set({
        status: "cancelled",
        decidedAt: new Date(),
        decisionNote: "Request cancelled because the funnel moved back.",
      })
      .where(
        and(
          eq(stageApprovalRequests.id, request.id),
          eq(stageApprovalRequests.status, "pending")
        )
      )
      .returning({ id: stageApprovalRequests.id })
    if (cancelled.length === 0) continue
    await writeAudit(tx, ctx, {
      action: "approval.cancelled",
      entityType: "stage_approval_request",
      entityId: request.id,
      after: { reason: "funnel moved back" },
    })
  }
}

function stageGateState(
  opp: OppRow,
  container: typeof opportunities.$inferSelect
): StageGateState {
  return {
    hasEstimate:
      opp.estimatedAmount != null && Number(opp.estimatedAmount) > 0,
    hasCloseDate: !!opp.expectedCloseDate,
    hasContact: !!opp.primaryPersonId,
    hasNature:
      Array.isArray(opp.projectNatures) && opp.projectNatures.length > 0,
    hasQuote: !!opp.primaryQuotationId,
    hasVision: !!container.vision?.trim(),
    hasPain: !!container.pain?.trim(),
    hasOwnerContact: !!container.ownerContactId,
    hasOwnerBudgetLimit:
      container.ownerBudgetLimit != null && Number(container.ownerBudgetLimit) > 0,
    hasOppEstimatedBudget:
      container.estimatedBudget != null && Number(container.estimatedBudget) > 0,
    hasOppEstimatedCloseDate: !!container.estimatedCloseDate,
    hasValue: !!container.value?.trim(),
    hasPowerSponsorContact: !!container.powerSponsorContactId,
    hasPowerSponsorBudgetLimit:
      container.powerSponsorBudgetLimit != null &&
      Number(container.powerSponsorBudgetLimit) > 0,
    hasControl: !!container.control?.trim(),
    hasProcurementStage: !!opp.procurementStage?.trim(),
    hasNegotiationDone: !!opp.negotiationDone,
    hasNegotiationDate: !!opp.negotiationDate,
    hasExpectedInvoice:
      !!opp.expectedInvoiceMonth && !!opp.expectedInvoiceYear,
    hasProjectYear: opp.projectYear != null,
    hasAwardDate: !!opp.awardDate,
    hasPurchaseOrderNumber: !!opp.purchaseOrderNumber?.trim(),
    hasContract: !!opp.contract?.trim(),
  }
}

function requiredKeysForTransition(
  allStages: StageRow[],
  from: StageRow,
  target: StageRow,
  customFieldDefs: CustomFunnelField[],
  skipPpvvc = false
): string[] {
  const customKeys = new Set(customFieldDefs.map((field) => field.key))
  return requiredKeysForStages(
    stagesRequiredBefore(allStages, from.id, target.id),
    {
      skipPpvvcForWonTransition: skipPpvvc || target.kind === "WON",
    }
  ).filter((key) => customKeys.has(key) || isPresetFieldKey(key))
}


async function applyStageMove(
  tx: Tx,
  ctx: ServerContext,
  opp: OppRow,
  toStage: StageRow,
  source: "manual" | "approval" | "quote_accept",
  approvalRequestId?: string | null,
  reason?: string | null
): Promise<void> {
  const status = kindToStatus(toStage.kind)
  const closing = status === "won" || status === "lost"
  // Preserve the original close timestamp/date if the deal was already closed;
  // only stamp a new one when a still-open deal is being closed. Derive
  // actualCloseDate from this same timestamp so the date and timestamptz agree.
  const closeTs = closing ? opp.closedAt ?? new Date() : null
  // SF "Closed Remarks" persists to the dedicated per-kind text field (not
  // just funnel_stage_history.reason), so a report reading the funnel row
  // directly sees it too.
  const remarksSet: Partial<typeof funnels.$inferInsert> = {}
  if (reason?.trim()) {
    if (toStage.kind === "LOST") remarksSet.lostReason = reason.trim()
    else if (toStage.kind === "PARKED") remarksSet.kivReason = reason.trim()
  }
  await tx
    .update(funnels)
    .set({
      currentStageId: toStage.id,
      status,
      closedAt: closeTs,
      actualCloseDate: closeTs
        ? opp.actualCloseDate ?? toDateString(closeTs)
        : null,
      ...remarksSet,
    })
    .where(eq(funnels.id, opp.id))

  if (shouldAllocateOpportunityProjectCode(toStage.code)) {
    await ensureOpportunityProjectCode(tx, opp.opportunityId, ctx)
  }

  // ── Salesforce "Closed Won" automations (core) ─────────────────────────────
  if (status === "won") {
    const wonSet: Partial<typeof funnels.$inferInsert> = {}
    // Award Date → Estimated Funnel Close Date.
    if (opp.awardDate) wonSet.expectedCloseDate = opp.awardDate
    // Quoted Amount → Estimated Funnel Amount (the won deal's value is the quote).
    if (opp.amount != null && Number(opp.amount) > 0) wonSet.estimatedAmount = opp.amount
    if (Object.keys(wonSet).length > 0) {
      await tx.update(funnels).set(wonSet).where(eq(funnels.id, opp.id))
    }
    // Account type Prospect → Customer.
    await tx
      .update(accounts)
      .set({ isCustomer: true })
      .where(and(eq(accounts.id, opp.accountId), eq(accounts.isCustomer, false)))
    // Estimated amount may have changed → refresh the container rollup.
    await recomputeOpportunityTotal(tx, ctx.tenantId, opp.opportunityId)

  }

  await tx.insert(funnelStageHistory).values({
    tenantId: ctx.tenantId,
    funnelId: opp.id,
    fromStageId: opp.currentStageId,
    toStageId: toStage.id,
    changedByMemberId: ctx.memberId,
    approvalRequestId: approvalRequestId ?? null,
    probabilityAtChange: toStage.probability,
    valueAtChange: opp.amount,
    source,
    reason: reason ?? null,
  })

  await writeAudit(tx, ctx, {
    action: "opportunity.stage_changed",
    entityType: "opportunity",
    entityId: opp.id,
    after: { stage: toStage.code, source },
  })
  await logActivity(tx, ctx, {
    entityType: "opportunity",
    entityId: opp.id,
    type: "stage_change",
    subject: `Stage → ${toStage.name}`,
  })
  // Stage + status feed the partner-facing intercompany mirror (no-op unless
  // this deal is intercompany). Loaded lazily so this next-free service carries
  // no static dependency on the finance plugin.
  if ((await getEntitledModuleMap()).finance) {
    const { syncIntercompanyMirror } = await import("@/server/services/intercompany")
    await syncIntercompanyMirror(tx, opp.id)
  }
}

export type AdvanceOutcome = { moved: boolean; approvalRequestId?: string }

/**
 * Two gates: (1) the caller must already hold `stage.advance`. (2) if the target
 * stage requires approval AND the actor does not hold stage-approval permission, the stage does NOT move — a pending approval request is
 * created and routed to the upline. Otherwise the stage moves immediately.
 */
export async function requestStageAdvance(
  ctx: ServerContext,
  input: {
    funnelId: string
    targetStageId: string
    reason?: string
    /** Custom-field values captured in the advance dialog, merged onto the
     *  funnel before the entry gate is evaluated. */
    customFields?: Record<string, string>
    /** Kanban moves do not require PPVVC completion before stage change. */
    skipPpvvc?: boolean
  }
): Promise<AdvanceOutcome> {
  return runInTenant(ctx.tenantId, async (tx) => {
    const [opp] = await tx
      .select()
      .from(funnels)
      .where(and(eq(funnels.id, input.funnelId), isNull(funnels.deletedAt)))
      .limit(1)
      .for("update")
    if (!opp) throw new Error("Funnel not found")

    // The SF-parity validation rules read the parent Opportunity CONTAINER's
    // live fields (e.g. `Opportunity__r.Vision__c`), not the funnel's cascaded
    // copy, which can drift after a container edit.
    const [container] = await tx
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opp.opportunityId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1)
    if (!container) throw new Error("Opportunity not found")

    // Every stage of this funnel — needed to resolve the requirements of any
    // intermediate stages a multi-stage jump skips over.
    const allStages = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, opp.pipelineId))

    const from = allStages.find((s) => s.id === opp.currentStageId)
    if (!from) throw new Error("Current stage not found")

    const target = allStages.find((s) => s.id === input.targetStageId)
    if (!target) throw new Error("Stage not found")
    if (target.pipelineId !== opp.pipelineId)
      throw new Error("Stage does not belong to this funnel")

    // Enforce the stage state machine before anything else.
    assertTransitionAllowed(from, target)
    const rollback = isRollbackTransition(from, target)

    const [settings] = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.organizationId, ctx.tenantId))
      .limit(1)
    const customFieldDefs = settings?.customFunnelFields ?? []
    const stageCustomFields = normalizeAdvanceCustomFields(
      input.customFields,
      customFieldDefs
    )

    // Merge the dialog's custom-field values onto the funnel before evaluating
    // the gate, so the info the user just filled in counts.
    const mergedCustom: Record<string, unknown> = {
      ...((opp.customFields ?? {}) as Record<string, unknown>),
      ...(stageCustomFields ?? {}),
    }

    // Entry requirements: the information that must be on the funnel before it
    // may enter this stage (mirrors Salesforce's "fill the info to mark this
    // stage" gate). Authoritative — the dialog pre-checks the same rules.
    // Presets read real columns; custom fields read the merged values. A
    // multi-stage jump (e.g. 0e→4a) must satisfy every stage it passes through.
    const stageGate = buildStageGate(
      stageGateState(opp, container),
      mergedCustom,
      customFieldDefs
    )
    const requiredKeys = requiredKeysForTransition(
      allStages,
      from,
      target,
      customFieldDefs,
      input.skipPpvvc
    )
    const missing = rollback ? [] : missingFromKeys(requiredKeys, stageGate)
    if (!rollback && missing.length > 0) {
      throw new Error(
        `Add ${missing.map((m) => m.label).join(", ")} before moving to ${target.name}.`
      )
    }
    if (requiresTransitionReason(from, target) && !input.reason?.trim()) {
      throw new Error(
        `${from.kind === "LOST" && !requiresCloseRemarks(target.kind) ? "Reopen reason" : closeRemarksLabel(target.kind)} is required to move to ${target.name}.`
      )
    }

    // Persist the captured custom-field values (even when the move only queues
    // an approval — the info is now on record for the approver).
    if (stageCustomFields && Object.keys(stageCustomFields).length > 0) {
      await tx
        .update(funnels)
        .set({ customFields: mergedCustom as Record<string, string> })
        .where(eq(funnels.id, opp.id))
    }

    const gated =
      requiresApprovalForTransition(from, target) && !canBypassApproval(ctx)

    if (!gated) {
      if (rollback) await cancelPendingApprovalRequests(tx, ctx, opp.id)
      await applyStageMove(
        tx,
        ctx,
        opp,
        target,
        "manual",
        null,
        input.reason?.trim() || null
      )
      return { moved: true }
    }

    const { approvalRequestId } = await createApprovalRequest(
      tx,
      ctx,
      opp,
      target,
      input.reason
    )
    return { moved: false, approvalRequestId }
  }, { deadlockRetries: 2 })
}

/**
 * Outcome of a decision. `status` is the request's resolved status — note the
 * extra `"obsolete"` value: an approve that could no longer be applied because
 * the funnel had already moved past/closed the target stage (the request is
 * recorded as `rejected` in the DB with an explanatory note, but reported as
 * obsolete here so the UI can show a neutral, non-error message). `message` is a
 * friendly, user-facing summary the caller can surface in a toast.
 */
export type DecisionOutcome = {
  status: "approved" | "rejected" | "cancelled" | "obsolete"
  message: string
}

async function resolveApprovalAsObsolete(
  tx: Tx,
  ctx: ServerContext,
  requestId: string,
  note: string
): Promise<DecisionOutcome> {
  const resolved = await tx
    .update(stageApprovalRequests)
    .set({
      status: "rejected",
      approverMemberId: ctx.memberId,
      decidedAt: new Date(),
      decisionNote: note,
    })
    .where(
      and(
        eq(stageApprovalRequests.id, requestId),
        eq(stageApprovalRequests.status, "pending")
      )
    )
    .returning({ id: stageApprovalRequests.id })
  if (resolved.length === 0) throw new Error("Request already decided")
  await writeAudit(tx, ctx, {
    action: "approval.obsolete",
    entityType: "stage_approval_request",
    entityId: requestId,
    after: { reason: note },
  })
  return { status: "obsolete", message: note }
}

/** Approve (performs the move), reject (no change), or cancel (requester only). */
export async function decideApproval(
  ctx: ServerContext,
  input: {
    requestId: string
    decision: "approved" | "rejected" | "cancelled"
    note?: string
  }
): Promise<DecisionOutcome> {
  return runInTenant(ctx.tenantId, async (tx) => {
    // Rejections only need the request lock. Approvals lock funnel then request
    // below, matching stage advancement lock order.
    const initialQuery = tx
      .select()
      .from(stageApprovalRequests)
      .where(eq(stageApprovalRequests.id, input.requestId))
      .limit(1)
    const [initialReq] = await (input.decision === "rejected"
      ? initialQuery.for("update")
      : initialQuery)
    if (!initialReq) throw new Error("Request not found")
    let req = initialReq
    if (req.status !== "pending") throw new Error("Request already decided")

    if (input.decision === "cancelled") {
      if (req.requesterMemberId !== ctx.memberId && !ctx.isSuperadmin)
        throw new Error("Only the requester can cancel")
      // Conditional update guarded by status so a racing decision can't be
      // overwritten; rowCount of 0 means it was already decided.
      const cancelled = await tx
        .update(stageApprovalRequests)
        .set({ status: "cancelled", decidedAt: new Date(), decisionNote: input.note ?? null })
        .where(
          and(
            eq(stageApprovalRequests.id, req.id),
            eq(stageApprovalRequests.status, "pending")
          )
        )
        .returning({ id: stageApprovalRequests.id })
      if (cancelled.length === 0) throw new Error("Request already decided")
      await writeAudit(tx, ctx, {
        action: "approval.cancelled",
        entityType: "stage_approval_request",
        entityId: req.id,
      })
      return { status: "cancelled", message: "Request cancelled" }
    }

    const assertAssignedApprover = () => {
      if (ctx.isSuperadmin) return
      if (!ctx.memberId || req.approverMemberId !== ctx.memberId ||
          !ctx.can(PERMISSIONS.STAGE_ADVANCE_APPROVE))
        throw new Error("Not authorized to decide this request")
      if (req.requesterMemberId === ctx.memberId)
        throw new Error("Cannot approve your own request")
    }
    const assertCurrentApprover = async () => {
      assertAssignedApprover()
      if (!ctx.isSuperadmin &&
          await findManagerApprover(tx, req.requesterMemberId, PERMISSIONS.STAGE_ADVANCE_APPROVE) !== ctx.memberId)
        throw new Error("Not authorized to decide this request")
    }
    // Reject already holds the request row; approval locks funnel then request.
    // Delay the recursive route read until after those locks so it is current
    // and successful approvals need only one route query.
    if (input.decision === "rejected") await assertCurrentApprover()
    else assertAssignedApprover()

    if (input.decision === "rejected") {
      const rejected = await tx
        .update(stageApprovalRequests)
        .set({
          status: "rejected",
          approverMemberId: ctx.memberId,
          decidedAt: new Date(),
          decisionNote: input.note ?? null,
        })
        .where(
          and(
            eq(stageApprovalRequests.id, req.id),
            eq(stageApprovalRequests.status, "pending")
          )
        )
        .returning({ id: stageApprovalRequests.id })
      if (rejected.length === 0) throw new Error("Request already decided")
      await writeAudit(tx, ctx, {
        action: "approval.rejected",
        entityType: "stage_approval_request",
        entityId: req.id,
      })
      return { status: "rejected", message: "Request rejected" }
    }

    // Approved: lock the funnel and re-validate the transition against its
    // *current* stage — it may have advanced to/past the target, or closed
    // entirely, since the request was filed.
    const [opp] = await tx
      .select()
      .from(funnels)
      .where(eq(funnels.id, req.funnelId))
      .limit(1)
      .for("update")
    if (!opp) throw new Error("Funnel or stage missing")
    const [lockedReq] = await tx
      .select()
      .from(stageApprovalRequests)
      .where(eq(stageApprovalRequests.id, req.id))
      .limit(1)
      .for("update")
    if (!lockedReq || lockedReq.status !== "pending")
      throw new Error("Request already decided")
    req = lockedReq
    // A reporting-line or role change may have committed while locks waited.
    await assertCurrentApprover()
    const [from] = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, opp.currentStageId))
      .limit(1)
    const [target] = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, req.targetStageId))
      .limit(1)
    if (!from || !target) throw new Error("Funnel or stage missing")

    // A request represents one exact transition. Resolve it as obsolete if
    // current state can no longer perform that forward move. This path must
    // commit the request decision, otherwise stale requests remain pending.
    const transitionStillAllowed = (() => {
      try {
        assertTransitionAllowed(from, target)
        return true
      } catch {
        return false
      }
    })()
    const staleTransition =
      !transitionStillAllowed ||
      from.id === target.id ||
      target.pipelineId !== opp.pipelineId ||
      req.fromStageId !== from.id ||
      isRollbackTransition(from, target)
    if (staleTransition) {
      const closeNote =
        "This funnel no longer has the requested forward transition; request closed."
      const note = input.note?.trim()
        ? `${input.note.trim()} — ${closeNote}`
        : closeNote
      return resolveApprovalAsObsolete(tx, ctx, req.id, note)
    }

    const [container] = await tx
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opp.opportunityId),
          isNull(opportunities.deletedAt)
        )
      )
      .limit(1)
      .for("update")
    const [settings] = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.organizationId, ctx.tenantId))
      .limit(1)
    const allStages = await tx
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, opp.pipelineId))
    if (!container) {
      return resolveApprovalAsObsolete(
        tx,
        ctx,
        req.id,
        "Current funnel data is unavailable; request closed."
      )
    }
    const customFieldDefs = settings?.customFunnelFields ?? []
    const requiredKeys = requiredKeysForTransition(
      allStages,
      from,
      target,
      customFieldDefs
    )
    const missing = missingFromKeys(
      requiredKeys,
      buildStageGate(
        stageGateState(opp, container),
        (opp.customFields ?? {}) as Record<string, unknown>,
        customFieldDefs
      )
    )
    if (missing.length > 0) {
      const closeNote = `Current requirements are no longer satisfied: ${missing
        .map((field) => field.label)
        .join(", ")}. Request closed.`
      const note = input.note?.trim()
        ? `${input.note.trim()} — ${closeNote}`
        : closeNote
      return resolveApprovalAsObsolete(tx, ctx, req.id, note)
    }

    const claimed = await tx
      .update(stageApprovalRequests)
      .set({
        status: "approved",
        approverMemberId: ctx.memberId,
        decidedAt: new Date(),
        decisionNote: input.note ?? null,
      })
      .where(
        and(
          eq(stageApprovalRequests.id, req.id),
          eq(stageApprovalRequests.status, "pending")
        )
      )
      .returning({ id: stageApprovalRequests.id })
    if (claimed.length === 0) throw new Error("Request already decided")

    await applyStageMove(tx, ctx, opp, target, "approval", req.id, req.reason)
    await writeAudit(tx, ctx, {
      action: "approval.approved",
      entityType: "stage_approval_request",
      entityId: req.id,
    })
    return {
      status: "approved",
      message: `Request approved — moved to ${target.name}`,
    }
  }, { deadlockRetries: 2 })
}
