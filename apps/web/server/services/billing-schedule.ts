import "server-only"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import { funnels, quotations, quotationLineItems, paymentMilestones } from "@/db/schema"
import { quoteNet } from "./value"
import { validateBillingSchedule, quotationItemAllocations, validateQuotationItemAllocation, type BillingScheduleInput } from "@/lib/billing-schedule"
export type { BillingScheduleInput } from "@/lib/billing-schedule"

/** Caller authorizes the Funnel and supplies its existing tenant transaction. */
export async function saveBillingSchedule(tx: Tx, input: { funnelId: string; quotationId?: string; rows: BillingScheduleInput[] }) {
  validateBillingSchedule(input.rows)
  const [funnel] = await tx.select({ id: funnels.id, tenantId: funnels.tenantId, primaryQuotationId: funnels.primaryQuotationId }).from(funnels).where(and(eq(funnels.id, input.funnelId), isNull(funnels.deletedAt))).for("update")
  if (!funnel) throw new Error("Funnel not found")
  const quotationId = input.quotationId ?? funnel.primaryQuotationId
  if (!quotationId || quotationId !== funnel.primaryQuotationId) throw new Error("Select this quotation as primary before preparing its billing schedule.")
  const [quote] = await tx.select({ id: quotations.id, status: quotations.status, subtotal: quotations.subtotal, discountTotal: quotations.discountTotal }).from(quotations).where(and(eq(quotations.id, quotationId), eq(quotations.funnelId, funnel.id), eq(quotations.tenantId, funnel.tenantId), isNull(quotations.deletedAt))).for("update")
  if (!quote || ["void", "rejected", "expired"].includes(quote.status)) throw new Error("An active quotation is required for the billing schedule.")
  const total = input.rows.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0)
  if(total>Math.round(Number(quoteNet(quote))*100))throw new Error("Billing schedule exceeds the quoted amount excluding tax.")
  if (total !== Math.round(Number(quoteNet(quote)) * 100)) throw new Error("Payment milestones must equal the quotation net amount excluding tax. Allocate the full amount before saving.")
  const locked = await tx.execute(sql`select 1 from payment_milestones m where m.funnel_id = ${funnel.id} and m.tenant_id = ${funnel.tenantId} and m.deleted_at is null and (m.status = 'invoiced' or exists(select 1 from finance_docs d where d.milestone_id = m.id and d.tenant_id = m.tenant_id)) limit 1`)
  if (locked.length) {
    const existing = await tx.select({ id: paymentMilestones.id, description: paymentMilestones.description, dueDate: paymentMilestones.dueDate, title: paymentMilestones.title, amount: paymentMilestones.amount, quotationId: paymentMilestones.quotationId, quotationLineItemId: paymentMilestones.quotationLineItemId }).from(paymentMilestones).where(and(eq(paymentMilestones.funnelId, funnel.id), isNull(paymentMilestones.deletedAt))).for("update")
    const ids = new Set(input.rows.map(row => row.id))
    if (ids.size !== existing.length || input.rows.length !== existing.length || existing.some(row => !ids.has(row.id))) throw new Error("Schedules with finance history only allow invoice month and year updates on their existing rows.")
    for (const row of input.rows) {
      const original = existing.find(candidate => candidate.id === row.id)!
      if ((row.description !== undefined && (row.description || null)!==original.description) || (row.dueDate !== undefined && (row.dueDate || null)!==original.dueDate)) throw new Error("Schedules with finance history only allow invoice month and year updates.")
      if (row.title !== original.title || Math.round(Number(row.amount) * 100) !== Math.round(Number(original.amount) * 100) || (row.quotationLineItemId ?? null) !== original.quotationLineItemId) throw new Error("Schedules with finance history only allow invoice month and year updates.")
    }
    for (const row of input.rows) await tx.update(paymentMilestones).set({ expectedInvoiceMonth: row.expectedInvoiceMonth, expectedInvoiceYear: row.expectedInvoiceYear }).where(eq(paymentMilestones.id, row.id!))
    return existing.map(row => ({ ...row, expectedInvoiceMonth: input.rows.find(candidate => candidate.id === row.id)!.expectedInvoiceMonth, expectedInvoiceYear: input.rows.find(candidate => candidate.id === row.id)!.expectedInvoiceYear }))
  }
  const lines = await tx.select({ id: quotationLineItems.id, description: quotationLineItems.description, lineSubtotal: quotationLineItems.lineSubtotal }).from(quotationLineItems).where(eq(quotationLineItems.quotationId, quote.id))
  for (const row of input.rows) if (row.quotationLineItemId && !lines.some(line => line.id === row.quotationLineItemId)) throw new Error("Billing quotation item does not belong to this quotation.")
  validateQuotationItemAllocation(input.rows, quotationItemAllocations(lines, String(quoteNet(quote))))
  const stored = await tx.execute<{id:string}>(sql`select id from payment_milestones where funnel_id=${funnel.id} and tenant_id=${funnel.tenantId} and deleted_at is null for update`)
  const existingIds=new Set(stored.map(row=>row.id))
  const retained=input.rows.flatMap(row=>row.id && existingIds.has(row.id)?[row.id]:[])
  if(new Set(retained).size!==retained.length)throw new Error("A milestone cannot appear twice in the same plan.")
  const removed=stored.map(row=>row.id).filter(id=>!retained.includes(id))
  if(removed.length)await tx.update(paymentMilestones).set({deletedAt:new Date(),updatedAt:new Date()}).where(and(eq(paymentMilestones.tenantId,funnel.tenantId),inArray(paymentMilestones.id,removed)))
  const values=input.rows.map((row,sortOrder)=>({title:row.title.trim(),amount:row.amount,expectedInvoiceMonth:row.expectedInvoiceMonth,expectedInvoiceYear:row.expectedInvoiceYear,quotationLineItemId:row.quotationLineItemId??null,tenantId:funnel.tenantId,funnelId:funnel.id,quotationId:quote.id,sortOrder,...(row.description!==undefined?{description:row.description?.trim()?row.description:null}:{}),...(row.dueDate!==undefined?{dueDate:row.dueDate||null}:{})}))
  const saved: (typeof paymentMilestones.$inferSelect)[]=[]
  for(const [index,row] of input.rows.entries())if(row.id && existingIds.has(row.id)) {
    const updated=await tx.update(paymentMilestones).set({...values[index],updatedAt:new Date()}).where(and(eq(paymentMilestones.id,row.id),eq(paymentMilestones.tenantId,funnel.tenantId))).returning()
    saved.push(...updated)
  }
  const additions=values.filter((_value,index)=>!input.rows[index].id || !existingIds.has(input.rows[index].id!))
  if(additions.length)saved.push(...await tx.insert(paymentMilestones).values(additions).returning())
  return saved.sort((a,b)=>a.sortOrder-b.sortOrder)
}
export async function assertBillingScheduleForFunnel(tx: Tx, funnelId: string) {
  const [funnel] = await tx.select({ id: funnels.id, tenantId: funnels.tenantId, primaryQuotationId: funnels.primaryQuotationId }).from(funnels).where(and(eq(funnels.id, funnelId), isNull(funnels.deletedAt))).for("update")
  const quoteId = funnel?.primaryQuotationId
  if (!quoteId) throw new Error("Select a primary quotation before advancing to 4a.")
  const [quote] = await tx.select({ id: quotations.id, status: quotations.status, subtotal: quotations.subtotal, discountTotal: quotations.discountTotal }).from(quotations).where(and(eq(quotations.id, quoteId), eq(quotations.funnelId, funnelId), isNull(quotations.deletedAt))).for("update")
  if (!quote || ["void", "rejected", "expired"].includes(quote.status)) throw new Error("An active primary quotation is required.")
  const rows = await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.funnelId, funnelId), isNull(paymentMilestones.deletedAt)))
  validateBillingSchedule(rows.map(row => ({ ...row, expectedInvoiceMonth: row.expectedInvoiceMonth ?? "", expectedInvoiceYear: row.expectedInvoiceYear ?? 0 })))
  const historical = await tx.execute<{ id: string }>(sql`select m.id from payment_milestones m where m.funnel_id = ${funnelId} and m.tenant_id = ${funnel!.tenantId} and m.deleted_at is null and (m.status = 'invoiced' or exists(select 1 from finance_docs d where d.milestone_id = m.id and d.tenant_id = m.tenant_id))`)
  const historicalIds = new Set(historical.map(row => row.id))
  if (rows.some(row => row.quotationId !== quote.id && !historicalIds.has(row.id))) throw new Error("Open billing schedule rows must reference the current primary quotation.")
  if (!historical.length && !rows.some(row=>row.status==='invoiced')) {
    const items=await tx.select({id:quotationLineItems.id,description:quotationLineItems.description,lineSubtotal:quotationLineItems.lineSubtotal}).from(quotationLineItems).where(eq(quotationLineItems.quotationId,quote.id))
    validateQuotationItemAllocation(rows.map(row=>({...row,expectedInvoiceMonth:row.expectedInvoiceMonth??"",expectedInvoiceYear:row.expectedInvoiceYear??0})),quotationItemAllocations(items,String(quoteNet(quote))))
  }
  const total = rows.reduce((sum,row) => sum + Math.round(Number(row.amount) * 100), 0)
  if(total>Math.round(Number(quoteNet(quote))*100))throw new Error("Billing schedule exceeds the quoted amount excluding tax.")
  if (total !== Math.round(Number(quoteNet(quote)) * 100)) throw new Error("Payment milestones must equal the quotation net amount excluding tax. Allocate the full amount before saving.")
}
