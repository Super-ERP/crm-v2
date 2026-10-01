import { formatMoney } from "@/lib/format"

export type OpportunityCurrencyTotal = { currency: string; total: string }

/** Display each currency separately; an empty Opportunity is zero in its configured currency. */
export function formatOpportunityEstimatedTotals(
  totals: OpportunityCurrencyTotal[],
  fallbackCurrency: string
): string {
  if (totals.length === 0) return `${fallbackCurrency} ${formatMoney("0", fallbackCurrency)}`
  return totals
    .map(({ currency, total }) => `${currency} ${formatMoney(total, currency)}`)
    .join(" · ")
}
