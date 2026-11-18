export const BILLING_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const
export type BillingScheduleInput = { id?: string; title: string; amount: string; expectedInvoiceMonth: string; expectedInvoiceYear: number; quotationLineItemId?: string | null; description?: string | null; dueDate?: string | null }
export function isForecastOnlyMilestoneUpdate(input: object) {
  const keys=Object.keys(input)
  return keys.length>0 && keys.every(key=>key==='expectedInvoiceMonth' || key==='expectedInvoiceYear')
}
export function validateMilestoneDetails(row: { description?: string | null; dueDate?: string | null }) {
  if (row.description !== undefined && row.description !== null && typeof row.description !== 'string') throw new Error('Remarks must be text.')
  if (row.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate) || !Number.isFinite(Date.parse(row.dueDate)) || new Date(row.dueDate).toISOString().slice(0,10)!==row.dueDate)) throw new Error('Enter a valid payment due date.')
}
export function validateBillingSchedule(rows: BillingScheduleInput[]) {
  if (!rows.length) throw new Error("Configure at least one billing schedule row before advancing to 4a.")
  for (const row of rows) {
    validateMilestoneDetails(row)
    if (!row.title.trim()) throw new Error("Every billing row needs a title.")
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0 || !/^\d+(\.\d{1,2})?$/.test(row.amount)) throw new Error("Every billing row needs a positive amount in whole cents.")
    if (!(BILLING_MONTHS as readonly string[]).includes(row.expectedInvoiceMonth) || !Number.isInteger(row.expectedInvoiceYear) || row.expectedInvoiceYear < 1900 || row.expectedInvoiceYear > 9999) throw new Error("Every billing row requires a valid expected invoice month and year.")
  }
}

export type BillingQuotationItem = { id: string; description: string; lineSubtotal: string | null }
/** Allocate quotation-level discount proportionally, preserving the exact net cents. */
export function quotationItemAllocations(lines: readonly BillingQuotationItem[], netValue: string) {
  const target = BigInt(Math.max(0, Math.round(Number(netValue) * 100)))
  const weights = lines.map(line => BigInt(Math.max(0, Math.round(Number(line.lineSubtotal || 0) * 100))))
  const total = weights.reduce((sum, value) => sum + value, BigInt(0))
  if (!total) return lines.map(line => ({ ...line, billingAmount: "0.00" }))
  const shares = weights.map(weight => target * weight / total)
  let remainder = target - shares.reduce((sum, value) => sum + value, BigInt(0))
  const order = weights.map((weight, index) => ({ index, remainder: target * weight % total })).sort((a,b) => a.remainder === b.remainder ? a.index-b.index : a.remainder > b.remainder ? -1 : 1)
  for (const row of order) { if (!remainder) break; shares[row.index]++; remainder-- }
  return lines.map((line,index) => ({ ...line, billingAmount: `${shares[index]/BigInt(100)}.${String(shares[index]%BigInt(100)).padStart(2,'0')}` }))
}
export function billingRowsFromQuotationItems(items: readonly { id: string; description: string; billingAmount: string }[]): BillingScheduleInput[] {
  return items.filter(item => Number(item.billingAmount)>0).map(item => ({ title: item.description, amount: item.billingAmount, quotationLineItemId: item.id, expectedInvoiceMonth: "", expectedInvoiceYear: 0 }))
}
export function validateQuotationItemAllocation(rows: BillingScheduleInput[], items: readonly { id: string; description: string; billingAmount: string }[]) {
  if (!items.length) return // Legacy quotations without item detail keep their existing compatibility path.
  for (const row of rows) if (!row.quotationLineItemId || !items.some(item=>item.id===row.quotationLineItemId)) throw new Error(`Select a quotation item for milestone "${row.title}".`)
  for (const [index,item] of items.entries()) {
    const scheduled=rows.filter(row=>row.quotationLineItemId===item.id).reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)
    if (scheduled!==Math.round(Number(item.billingAmount)*100)) throw new Error(`Quotation item ${index+1}: milestone amounts must total ${item.billingAmount} excluding tax.`)
  }
}
