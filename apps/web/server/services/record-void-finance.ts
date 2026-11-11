import "server-only"
import { and, eq, inArray, ne, sql } from "drizzle-orm"
import { financeDocs, salesOrders, projects, funnels } from "@/db/schema"
import type { Tx } from "@/lib/actions"
import type { ServerContext } from "@/lib/server-context"
import { assertCan } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { requireEntitledModule } from "@/lib/modules.server"
import type { VoidTarget, VoidBlocker } from "@/lib/record-void"
import { lockRecordVoidGraph } from "./record-void-lock"
import { writeAudit } from "@/server/audit"
import { logActivity } from "./activity"

/** Shared by preview and execution: no upstream cancellation cascades into money. */
export async function getFinanceVoidImpact(tx: Tx, ctx: ServerContext, target: VoidTarget): Promise<{ blockers: VoidBlocker[]; effects: string[] }> {
  const blockers: VoidBlocker[] = []
  const effects: string[] = []
  if (target.type === "sales_order") {
    await requireEntitledModule("salesOrders")
    const [so] = await tx.select().from(salesOrders).where(and(eq(salesOrders.id, target.id),eq(salesOrders.tenantId,ctx.tenantId))).limit(1)
    if (!so) throw new Error("Sales order not found")
    if (so.status === "void") blockers.push({ code: "already_void", message: "Sales order is already void" })
    const children = await tx.select({ number: financeDocs.number, status: financeDocs.status }).from(financeDocs)
      .where(and(eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.salesOrderId, so.id), ne(financeDocs.status, "cancelled")))
    for (const child of children) blockers.push({ code: "live_finance_document", message: `Resolve a linked finance document (${child.status}) first` })
    effects.push(`Sales order ${so.soNumber ?? so.id} becomes void; its number, attachments and history remain`)
    return { blockers, effects }
  }
  if (target.type !== "finance_doc") throw new Error("Unsupported finance void target")
  await requireEntitledModule("finance")
  const [doc] = await tx.select().from(financeDocs).where(and(eq(financeDocs.id, target.id),eq(financeDocs.tenantId,ctx.tenantId))).limit(1)
  if (!doc) throw new Error("Finance document not found")
  if (doc.status === "cancelled") blockers.push({ code: "already_void", message: "Document is already cancelled" })
  const children = await tx.select({ number: financeDocs.number, status: financeDocs.status }).from(financeDocs)
    .where(and(eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.parentId, doc.id), ne(financeDocs.status, "cancelled")))
  for (const child of children) blockers.push({ code: "live_finance_child", message: `Resolve a linked finance document (${child.status}) first` })
  let intercompany = !!(doc.intercompanyDealId || doc.counterpartDocId)
  if (doc.projectId) {
    const [project] = await tx.select({ deal: projects.intercompanyDealId, intercompany: funnels.isIntercompany })
      .from(projects).leftJoin(funnels, eq(funnels.id, projects.funnelId)).where(eq(projects.id, doc.projectId)).limit(1)
    intercompany ||= !!(project?.deal || project?.intercompany)
  }
  // Historical mirrors lack a structural link to their original customer invoice.
  if (intercompany) blockers.push({ code: "intercompany_reconciliation", message: "Intercompany documents require reconciliation across both entities before Void" })
  if ((doc.status === "issued" || doc.status === "settled") && !ctx.can(PERMISSIONS.FINANCE_REVERSE)) {
    blockers.push({ code: "finance_reverse_required", message: "Posted financial documents require finance reversal permission" })
  }
  effects.push(`${doc.number} becomes cancelled; amounts, numbering, links and proof remain in history`)
  if (doc.status === "issued" || doc.status === "settled") effects.push("The document leaves active financial reporting; this records a reversal, not an external refund")
  if ((doc.kind === "receipt" || doc.kind === "payment") && doc.parentId) {
    const [parent] = await tx.select().from(financeDocs).where(and(eq(financeDocs.id, doc.parentId),eq(financeDocs.tenantId,ctx.tenantId))).limit(1)
    if (!parent || (doc.projectId && parent.projectId !== doc.projectId) || (doc.salesOrderId && parent.salesOrderId !== doc.salesOrderId) || (doc.currency && parent.currency !== doc.currency)) {
      blockers.push({code:"finance_link_reconciliation",message:"The payment parent does not match this record's project and Sales Order. Reconcile the links first."})
      return {blockers,effects}
    }
    const [remaining] = await tx.select({ amount: sql<string>`coalesce(sum(${financeDocs.amount}),0)` }).from(financeDocs)
      .where(and(eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.parentId, doc.parentId), ne(financeDocs.id, doc.id), inArray(financeDocs.kind, ["receipt", "payment"]), inArray(financeDocs.status, ["issued", "settled"])))
    effects.push(`Remaining issued payments: ${remaining?.amount ?? "0"} ${parent?.currency ?? doc.currency}`)
    if (parent?.status === "settled" && Number(remaining?.amount ?? 0) < Number(parent.amount)) effects.push(`${parent.number} reopens as issued because remaining payments no longer cover it`)
  }
  return { blockers, effects }
}

export async function executeFinanceVoid(tx: Tx, ctx: ServerContext, target: VoidTarget, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error("Enter a reason")
  await lockRecordVoidGraph(tx, ctx.tenantId)
  assertCan(ctx, target.type === "finance_doc" ? PERMISSIONS.FINANCE_MANAGE : PERMISSIONS.SALES_ORDER_APPROVE)
  const impact = await getFinanceVoidImpact(tx, ctx, target)
  if (impact.blockers.length) throw new Error(impact.blockers.map(b => b.message).join("; "))
  if (target.type === "sales_order") {
    const [changed] = await tx.update(salesOrders).set({ status: "void", updatedAt: new Date() })
      .where(and(eq(salesOrders.tenantId,ctx.tenantId),eq(salesOrders.id, target.id), ne(salesOrders.status, "void"))).returning({ id: salesOrders.id })
    if (!changed) throw new Error("Sales order changed; refresh and retry")
    return
  }
  const [doc] = await tx.update(financeDocs).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.id, target.id), ne(financeDocs.status, "cancelled"))).returning()
  if (!doc) throw new Error("Document changed; refresh and retry")
  if ((doc.kind === "receipt" || doc.kind === "payment") && doc.parentId) {
    const [remaining] = await tx.select({ amount: sql<string>`coalesce(sum(${financeDocs.amount}),0)` }).from(financeDocs)
      .where(and(eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.parentId, doc.parentId), inArray(financeDocs.kind, ["receipt", "payment"]), inArray(financeDocs.status, ["issued", "settled"])))
    const [reopened] = await tx.update(financeDocs).set({ status: "issued", updatedAt: new Date() }).where(and(
      eq(financeDocs.tenantId,ctx.tenantId),eq(financeDocs.id, doc.parentId), eq(financeDocs.status, "settled"), sql`${financeDocs.amount} > ${remaining?.amount ?? "0"}::numeric`
    )).returning({ id: financeDocs.id, number: financeDocs.number })
    if (reopened) {
      await writeAudit(tx, ctx, { action: "finance.settlement_reopened", entityType: "finance_doc", entityId: reopened.id,
        before: { status: "settled" }, after: { status: "issued", reversedDocumentId: doc.id, reason, remainingPayments: remaining?.amount ?? "0" } })
      await logActivity(tx, ctx, { entityType: "finance_doc", entityId: reopened.id, type: "system",
        subject: `${reopened.number} reopened after reviewed reversal of ${doc.number}` })
    }
  }
}
