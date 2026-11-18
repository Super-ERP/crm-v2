import Link from "next/link"
import { dealValue } from "@/lib/deal-value"
import { formatMoney } from "@/lib/format"

export function DealValue({ row }: { row: {
  estimatedAmount: string | null
  amount: string | null
  currency: string
  primaryQuotationId?: string | null
  primaryQuotationNumber?: string | null
} }) {
  const value = dealValue(row)
  return <span className="flex min-w-0 flex-col gap-0.5">
    <span className="tabular-nums">{value.amount === null ? "Not set" : formatMoney(value.amount, row.currency)}</span>
    {value.amount !== null ? <span className="text-xs font-normal text-muted-foreground">
      {row.estimatedAmount === null && row.primaryQuotationId && row.primaryQuotationNumber ?
        <Link href={`/quotations/${row.primaryQuotationId}`} className="link">{value.source}</Link> : value.source}
    </span> : null}
  </span>
}
