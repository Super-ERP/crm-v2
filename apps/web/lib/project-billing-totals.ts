/** Finance amounts retain their recorded tax basis. Never combine currencies. */
export function projectBillingTotals(docs: readonly { kind: string; status: string; amount: string; currency: string }[], currency: string) {
  const sum = (kind: string) => docs.filter(d => d.currency === currency && d.kind === kind && (d.status === "issued" || d.status === "settled")).reduce((total, d) => total + Math.round(Number(d.amount) * 100), 0) / 100
  const invoiced = sum("invoice")
  const paid = sum("receipt")
  const creditNotes = sum("credit_note")
  const purchaseCost = sum("purchase_invoice")
  return { invoiced, paid, creditNotes, purchaseCost, outstanding: invoiced - creditNotes - paid, margin: invoiced - creditNotes - purchaseCost }
}
