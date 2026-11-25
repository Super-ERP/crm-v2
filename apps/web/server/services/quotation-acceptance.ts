import "server-only"
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import { attachments, auditLog, funnels, paymentMilestones, quotations } from "@/db/schema"
import type { ServerContext } from "@/lib/server-context"
import { toDateString } from "@/lib/dates"
import { acceptanceDateError, recordAcceptanceBlocker } from "@/lib/quotation-acceptance"
import type { QuotationStatus } from "@/lib/quotation-transitions"
import { quoteNet, syncOpportunityAmount } from "./value"
import { syncFunnelProductsFromQuote } from "./quote-sync"
import { logActivity } from "./activity"
import { writeAudit } from "@/server/audit"

export const ACCEPTANCE_RECORDED = "quotation.acceptance_recorded"
export const ACCEPTANCE_UNDONE = "quotation.acceptance_undone"

export type RecordAcceptanceInput = {
  quotationId: string
  acceptedOn: string
  note: string
  source: "manual" | "backfill"
  batchId?: string
  attachment?: { fileName: string; contentType: string; byteSize: number; storageKey: string } | null
}

export type RecordAcceptanceResult = {
  funnelId: string
  quoteNumber: string
  relinkedMilestones: number
  needsReplan: boolean
}

const cents = (value: string | number) => Math.round(Number(value) * 100)

/** Make `quoteId` the Funnel's single primary quotation and re-value the Funnel. */
async function makePrimary(tx: Tx, ctx: ServerContext, funnelId: string, quoteId: string) {
  await tx.update(quotations).set({ isPrimary: false }).where(and(eq(quotations.tenantId, ctx.tenantId), eq(quotations.funnelId, funnelId), ne(quotations.id, quoteId)))
  await tx.update(quotations).set({ isPrimary: true }).where(eq(quotations.id, quoteId))
  await tx.update(funnels).set({ primaryQuotationId: quoteId, updatedAt: new Date() }).where(and(eq(funnels.id, funnelId), eq(funnels.tenantId, ctx.tenantId)))
  await syncOpportunityAmount(tx, ctx, funnelId)
  await syncFunnelProductsFromQuote(tx, ctx.tenantId, funnelId, quoteId)
}

/**
 * Move open (uninvoiced, no finance history) milestones onto the accepted
 * quotation when that is safe: no row is tied to another quotation's line
 * item and the whole schedule still equals the quotation net. Otherwise leave
 * them and report that the schedule needs re-planning.
 */
async function relinkMilestones(tx: Tx, ctx: ServerContext, funnelId: string, quote: { id: string; subtotal: string; discountTotal: string }) {
  const rows = await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.tenantId, ctx.tenantId), eq(paymentMilestones.funnelId, funnelId), isNull(paymentMilestones.deletedAt)))
  if (!rows.length) return { relinked: 0, needsReplan: false }
  const history = await tx.execute<{ id: string }>(sql`select m.id from payment_milestones m where m.funnel_id = ${funnelId} and m.tenant_id = ${ctx.tenantId} and m.deleted_at is null and (m.status = 'invoiced' or exists(select 1 from finance_docs d where d.milestone_id = m.id and d.tenant_id = m.tenant_id))`)
  const historical = new Set(history.map(row => row.id))
  const toMove = rows.filter(row => !historical.has(row.id) && row.quotationId !== quote.id)
  if (!toMove.length) return { relinked: 0, needsReplan: false }
  const total = rows.reduce((sum, row) => sum + cents(row.amount), 0)
  if (toMove.some(row => row.quotationLineItemId) || total !== cents(quoteNet(quote))) return { relinked: 0, needsReplan: true }
  await tx.update(paymentMilestones).set({ quotationId: quote.id, updatedAt: new Date() }).where(and(eq(paymentMilestones.tenantId, ctx.tenantId), inArray(paymentMilestones.id, toMove.map(row => row.id))))
  return { relinked: toMove.length, needsReplan: false }
}

export async function recordQuotationAcceptance(tx: Tx, ctx: ServerContext, input: RecordAcceptanceInput): Promise<RecordAcceptanceResult> {
  const note = input.note.trim()
  if (!note) throw new Error("Enter a note explaining the acceptance.")
  if (note.length > 2000) throw new Error("Keep the note under 2,000 characters.")
  // Same Funnel → quotation lock order as accept, billing and primary changes.
  await tx.execute(sql`select id from funnels where tenant_id=${ctx.tenantId} and id=(select funnel_id from quotations where id=${input.quotationId} and tenant_id=${ctx.tenantId}) for update`)
  const [q] = await tx.select().from(quotations).where(and(eq(quotations.id, input.quotationId), eq(quotations.tenantId, ctx.tenantId))).limit(1).for("update")
  if (!q) throw new Error("Quotation not found")
  const [funnel] = await tx.select({ id: funnels.id, status: funnels.status, deletedAt: funnels.deletedAt }).from(funnels).where(and(eq(funnels.id, q.funnelId), eq(funnels.tenantId, ctx.tenantId))).limit(1)
  if (!funnel || funnel.deletedAt) throw new Error("Funnel not found")
  const [other] = await tx.select({ quoteNumber: quotations.quoteNumber }).from(quotations).where(and(eq(quotations.funnelId, q.funnelId), ne(quotations.id, q.id), isNull(quotations.deletedAt), eq(quotations.status, "accepted"))).limit(1)
  const blocker = recordAcceptanceBlocker({ status: q.status as QuotationStatus, deleted: !!q.deletedAt, funnelStatus: funnel.status, otherAcceptedQuoteNumber: other?.quoteNumber ?? null })
  if (blocker) throw new Error(blocker)
  const dateError = acceptanceDateError(input.acceptedOn, toDateString(), q.quoteDate)
  if (dateError) throw new Error(dateError)

  const lapsed = !!q.validUntil && input.acceptedOn > q.validUntil
  await tx.update(quotations).set({ status: "accepted", acceptedAt: new Date(`${input.acceptedOn}T00:00:00+08:00`), updatedAt: new Date() }).where(eq(quotations.id, q.id))
  await makePrimary(tx, ctx, q.funnelId, q.id)
  const milestones = await relinkMilestones(tx, ctx, q.funnelId, q)

  let attachmentId: string | null = null
  if (input.attachment) {
    const [row] = await tx.insert(attachments).values({ tenantId: ctx.tenantId, attachableType: "quotation", attachableId: q.id, ...input.attachment, uploadedByMemberId: ctx.memberId }).returning({ id: attachments.id })
    attachmentId = row.id
  }

  await logActivity(tx, ctx, {
    entityType: "opportunity",
    entityId: q.funnelId,
    type: "system",
    subject: `Quotation ${q.quoteNumber} acceptance recorded (accepted ${input.acceptedOn})`,
  })
  await writeAudit(tx, ctx, {
    action: ACCEPTANCE_RECORDED,
    entityType: "quotation",
    entityId: q.id,
    before: { status: q.status, isPrimary: q.isPrimary, acceptedAt: q.acceptedAt },
    after: { status: "accepted", acceptedOn: input.acceptedOn, funnelId: q.funnelId, amount: quoteNet(q) },
    metadata: { note, source: input.source, batchId: input.batchId ?? null, lapsed, validUntil: q.validUntil, attachmentId, relinkedMilestones: milestones.relinked, needsReplan: milestones.needsReplan },
  })
  return { funnelId: q.funnelId, quoteNumber: q.quoteNumber, relinkedMilestones: milestones.relinked, needsReplan: milestones.needsReplan }
}

/** Backfill helper: an accepted quotation exists but is not primary. */
export async function switchToAcceptedPrimary(tx: Tx, ctx: ServerContext, funnelId: string, batchId: string, note: string) {
  await tx.execute(sql`select id from funnels where tenant_id=${ctx.tenantId} and id=${funnelId} for update`)
  const [accepted] = await tx.select().from(quotations).where(and(eq(quotations.tenantId, ctx.tenantId), eq(quotations.funnelId, funnelId), eq(quotations.status, "accepted"), isNull(quotations.deletedAt))).limit(1).for("update")
  if (!accepted) throw new Error("No accepted quotation on this Funnel")
  const [funnel] = await tx.select({ primaryQuotationId: funnels.primaryQuotationId }).from(funnels).where(eq(funnels.id, funnelId)).limit(1)
  await makePrimary(tx, ctx, funnelId, accepted.id)
  const milestones = await relinkMilestones(tx, ctx, funnelId, accepted)
  await writeAudit(tx, ctx, {
    action: "quotation.primary_set",
    entityType: "quotation",
    entityId: accepted.id,
    before: { primaryQuotationId: funnel?.primaryQuotationId ?? null },
    after: { primaryQuotationId: accepted.id },
    metadata: { note, source: "backfill", batchId, relinkedMilestones: milestones.relinked, needsReplan: milestones.needsReplan },
  })
  return { quoteNumber: accepted.quoteNumber, ...milestones }
}

/**
 * Owner/Admin only: put an accepted quotation back to the status it had before
 * the acceptance, as long as no milestone on the Funnel has been invoiced
 * against it or has finance history.
 */
export async function undoQuotationAcceptance(tx: Tx, ctx: ServerContext, input: { quotationId: string; reason: string }) {
  const reason = input.reason.trim()
  if (!reason) throw new Error("Enter a reason for undoing the acceptance.")
  await tx.execute(sql`select id from funnels where tenant_id=${ctx.tenantId} and id=(select funnel_id from quotations where id=${input.quotationId} and tenant_id=${ctx.tenantId}) for update`)
  const [q] = await tx.select().from(quotations).where(and(eq(quotations.id, input.quotationId), eq(quotations.tenantId, ctx.tenantId), isNull(quotations.deletedAt))).limit(1).for("update")
  if (!q) throw new Error("Quotation not found")
  if (q.status !== "accepted") throw new Error("Only an accepted quotation can have its acceptance undone.")
  const locked = await tx.execute(sql`select 1 from payment_milestones m where m.quotation_id = ${q.id} and m.tenant_id = ${ctx.tenantId} and m.deleted_at is null and (m.status = 'invoiced' or exists(select 1 from finance_docs d where d.milestone_id = m.id and d.tenant_id = m.tenant_id)) limit 1`)
  if (locked.length) throw new Error("A payment milestone on this quotation has been invoiced, so its acceptance can’t be undone.")
  const [recorded] = await tx.select({ before: auditLog.before }).from(auditLog).where(and(eq(auditLog.tenantId, ctx.tenantId), eq(auditLog.entityType, "quotation"), eq(auditLog.entityId, q.id), eq(auditLog.action, ACCEPTANCE_RECORDED))).orderBy(desc(auditLog.createdAt)).limit(1)
  const previous = (recorded?.before as { status?: QuotationStatus } | null)?.status
  const restored: QuotationStatus = previous && previous !== "accepted" ? previous : "sent"
  await tx.update(quotations).set({ status: restored, acceptedAt: null, updatedAt: new Date() }).where(eq(quotations.id, q.id))
  await logActivity(tx, ctx, { entityType: "opportunity", entityId: q.funnelId, type: "system", subject: `Quotation ${q.quoteNumber} acceptance undone` })
  await writeAudit(tx, ctx, {
    action: ACCEPTANCE_UNDONE,
    entityType: "quotation",
    entityId: q.id,
    before: { status: "accepted", acceptedAt: q.acceptedAt },
    after: { status: restored },
    metadata: { reason },
  })
  return { funnelId: q.funnelId, status: restored }
}
