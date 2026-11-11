import "server-only"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { canManageAllRecords, ownsOrManages, visibleMemberIds } from "@/lib/access-scope"
import { funnels, opportunities, pipelineStages, quotations, stageApprovalRequests } from "@/db/schema"
import { voidDuplicateFunnelSchema, type VoidDuplicateFunnelInput } from "@/lib/funnel-void"
import { writeAudit } from "@/server/audit"
import { logActivity } from "@/server/services/activity"
import { recomputeOpportunityTotal } from "@/server/services/opportunity-container"

/** Execution is reserved for the dedicated Sales Admin approval capability. */
export function canVoidDuplicateFunnel(ctx: Pick<ServerContext, "can">) {
  return ctx.can(PERMISSIONS.FUNNEL_VOID_APPROVE)
}

/** Caller supplies one tenant transaction; every check and write is atomic. */
export async function voidDuplicateWonFunnel(tx: Tx, ctx: ServerContext, input: VoidDuplicateFunnelInput) {
  if (!canVoidDuplicateFunnel(ctx)) throw new Error("FORBIDDEN: manager authorization is required to void duplicates")
  const parsed = voidDuplicateFunnelSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const { funnelId, retainedFunnelId, reason } = parsed.data
  const visible = await visibleMemberIds(tx, ctx)
  // Stable ordering also serializes attempts to void A into B and B into A.
  const rows = await tx.select({ id: funnels.id, name: funnels.name, accountId: funnels.accountId, currency: funnels.currency, opportunityId: funnels.opportunityId, ownerMemberId: funnels.ownerMemberId, status: funnels.status, stageKind: pipelineStages.kind }).from(funnels)
    .innerJoin(pipelineStages, and(eq(pipelineStages.id, funnels.currentStageId), eq(pipelineStages.tenantId, funnels.tenantId)))
    .where(and(eq(funnels.tenantId, ctx.tenantId), inArray(funnels.id, [funnelId, retainedFunnelId]), isNull(funnels.deletedAt)))
    .orderBy(asc(funnels.id)).for("update", { of: funnels })
  const source = rows.find(row => row.id === funnelId)
  const retained = rows.find(row => row.id === retainedFunnelId)
  if (!source || !retained) throw new Error("Both funnels must be available and not already voided")
  if (!canManageAllRecords(ctx) && rows.some(row => !ownsOrManages(visible, row.ownerMemberId))) throw new Error("FORBIDDEN: both funnels must be within your record access")
  if (rows.some(row => row.status !== "won" || row.stageKind !== "WON")) throw new Error("Both funnels must be Closed Won")
  if (source.accountId !== retained.accountId || source.currency !== retained.currency) throw new Error("The retained funnel must have the same customer and currency")

  // Serialize cached parent-total recomputation with other corrections on this parent.
  const [parent] = await tx.select({ id: opportunities.id }).from(opportunities)
    .where(and(eq(opportunities.id, source.opportunityId), eq(opportunities.tenantId, ctx.tenantId), isNull(opportunities.deletedAt)))
    .limit(1).for("no key update")
  if (!parent) throw new Error("Parent opportunity not available")

  // Lock quote rows before checking references/archiving; no quote content is deleted.
  await tx.select({ id: quotations.id }).from(quotations)
    .where(and(eq(quotations.tenantId, ctx.tenantId), eq(quotations.funnelId, funnelId), isNull(quotations.deletedAt)))
    .orderBy(asc(quotations.id)).for("update")
  const result = await tx.execute(sql`
    select
      exists(select 1 from projects p where p.tenant_id=${ctx.tenantId} and
        (p.funnel_id=${funnelId} or p.quotation_id in (select q.id from quotations q where q.tenant_id=${ctx.tenantId} and q.funnel_id=${funnelId}))) as projects,
      exists(select 1 from payment_milestones m where m.tenant_id=${ctx.tenantId} and
        (m.funnel_id=${funnelId} or m.quotation_id in (select q.id from quotations q where q.tenant_id=${ctx.tenantId} and q.funnel_id=${funnelId})) and
        (m.status='invoiced' or nullif(btrim(m.invoice_number),'') is not null or m.invoice_date is not null or nullif(btrim(m.so_number),'') is not null)) as invoices,
      exists(select 1 from finance_docs d where d.tenant_id=${ctx.tenantId} and d.milestone_id in
        (select m.id from payment_milestones m where m.tenant_id=${ctx.tenantId} and (m.funnel_id=${funnelId} or m.quotation_id in
          (select q.id from quotations q where q.tenant_id=${ctx.tenantId} and q.funnel_id=${funnelId})))) as finance,
      exists(select 1 from payment_milestones m where m.tenant_id=${ctx.tenantId} and (
        (m.funnel_id=${funnelId} and (m.project_id is not null or (m.quotation_id is not null and not exists
          (select 1 from quotations q where q.id=m.quotation_id and q.tenant_id=${ctx.tenantId} and q.funnel_id=${funnelId})))) or
        (m.quotation_id in (select q.id from quotations q where q.tenant_id=${ctx.tenantId} and q.funnel_id=${funnelId}) and
          (m.project_id is not null or m.funnel_id is distinct from ${funnelId}::uuid)))) as crosslinks,
      exists(select 1 from audit_log a where a.tenant_id=${ctx.tenantId} and a.action='funnel.duplicate_voided' and a."after"->>'retainedFunnelId'=${funnelId}) as retained_history,
      exists(select 1 from contracts c where c.tenant_id=${ctx.tenantId} and c.funnel_id=${funnelId} and c.deleted_at is null) as contracts,
      exists(select 1 from contract_years c where c.tenant_id=${ctx.tenantId} and c.funnel_id=${funnelId} and c.deleted_at is null and c.status<>'cancelled') as schedules,
      exists(select 1 from deal_costs c where c.tenant_id=${ctx.tenantId} and c.funnel_id=${funnelId} and c.deleted_at is null) as costs,
      (exists(select 1 from intercompany_deal_parties p where p.funnel_id=${funnelId}) or
       exists(select 1 from intercompany_deals d where d.funnel_id=${funnelId})) as intercompany
  `)
  const blockers = result[0] as unknown as Record<string, boolean>
  const labels: Record<string, string> = { projects: "delivery projects / sales orders", invoices: "invoicing history", finance: "finance documents", crosslinks: "milestones attached to other records", retained_history: "previous duplicate corrections retaining this funnel", contracts: "contracts", schedules: "contract schedules", costs: "purchase costs", intercompany: "intercompany records" }
  const blocked = Object.keys(labels).filter(key => blockers[key])
  if (blocked.length) throw new Error(`Cannot void: linked ${blocked.map(key => labels[key]).join(", ")} require review first.`)
  const now = new Date()
  const archivedQuotes = await tx.update(quotations).set({ deletedAt: now, isPrimary: false, updatedAt: now })
    .where(and(eq(quotations.tenantId, ctx.tenantId), eq(quotations.funnelId, funnelId), isNull(quotations.deletedAt))).returning({ id: quotations.id })
  await tx.update(stageApprovalRequests).set({ status: "cancelled", decidedAt: now, updatedAt: now, decisionNote: `Duplicate voided: ${reason}` })
    .where(and(eq(stageApprovalRequests.tenantId, ctx.tenantId), eq(stageApprovalRequests.funnelId, funnelId), eq(stageApprovalRequests.status, "pending")))
  await tx.update(funnels).set({ deletedAt: now, updatedAt: now })
    .where(and(eq(funnels.tenantId, ctx.tenantId), eq(funnels.id, funnelId)))
  await recomputeOpportunityTotal(tx, ctx.tenantId, source.opportunityId)
  await writeAudit(tx, ctx, {
    action: "funnel.duplicate_voided", entityType: "opportunity", entityId: funnelId,
    before: { name: source.name, status: source.status, accountId: source.accountId, currency: source.currency, opportunityId: source.opportunityId },
    after: { retainedFunnelId, retainedFunnelName: retained.name, reason, archivedQuotationCount: archivedQuotes.length },
  })
  for (const id of [funnelId, retainedFunnelId]) await logActivity(tx, ctx, { entityType: "opportunity", entityId: id, type: "system", subject: `Duplicate funnel voided: ${source.name}`, body: `Retained funnel: ${retained.name} (${retainedFunnelId}). Reason: ${reason}` })
  return { retainedFunnelId, opportunityId: source.opportunityId, archivedQuotationCount: archivedQuotes.length }
}
