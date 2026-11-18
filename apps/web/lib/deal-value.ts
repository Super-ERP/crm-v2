/** The existing Funnel headline: a manual estimate takes precedence over quoted net. */
export function dealValue(row: {
  estimatedAmount: string | null
  amount: string | null
  primaryQuotationId?: string | null
  primaryQuotationNumber?: string | null
}) {
  if (row.estimatedAmount !== null) return {amount: row.estimatedAmount, source: "Estimated"}
  if (row.amount !== null) return {amount: row.amount, source: row.primaryQuotationId ? (row.primaryQuotationNumber ? `From ${row.primaryQuotationNumber}` : "Primary quote net") : "Stored deal value"}
  return {amount: null, source: "Not set"}
}
