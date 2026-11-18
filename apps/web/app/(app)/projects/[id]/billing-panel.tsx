"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { formatMoney, formatDate } from "@/lib/format"
import { FINANCE_KINDS, type FinanceDocKind } from "@/lib/finance-kinds"
import type { ProjectBillingSummary } from "@/app/(app)/billing/actions"

/**
 * Project → Billing tab: read-only finance document rollup and margin. Payment
 * milestones are intentionally not an invoice entry point.
 */
export function BillingPanel({
  summary,
}: {
  summary: ProjectBillingSummary
}) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Billing progress</CardTitle>
          <CardDescription>
            {formatMoney(summary.invoiced, summary.currency)} invoiced ·{" "}
            {formatMoney(summary.paid, summary.currency)} received

          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {summary.projectValue != null ? <p className="text-sm">Current project value (excl. tax): {formatMoney(summary.projectValue, summary.currency)}</p> : null}
          <p className="text-xs text-muted-foreground">Received counts issued receipts. An invoice marked settled without a receipt does not count as received.</p>
          <p className="text-sm text-muted-foreground">Document totals as recorded in {summary.currency}; historical tax basis is not separately recorded. Current project value excludes tax, so no completion percentage is calculated. Other currencies appear only in the document list.</p>
          <p className="text-sm">Balance after receipts and credit notes (negative means credit): {formatMoney(summary.outstanding, summary.currency)}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {Number(summary.creditNotes) > 0 ? (
              <span>
                Credit notes −{formatMoney(summary.creditNotes, summary.currency)}
              </span>
            ) : null}
            <span>
              Purchase cost {formatMoney(summary.purchaseCost, summary.currency)}
            </span>
            <span className="font-medium text-foreground">
              Document revenue less credit notes and purchase cost {formatMoney(summary.margin, summary.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {summary.docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No billing documents yet.
            </p>
          ) : (
            summary.docs.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Link href={`/billing/${d.id}`} className="font-mono link">
                    {d.number}
                  </Link>
                  <Badge variant="outline">
                    {FINANCE_KINDS[d.kind as FinanceDocKind].label}
                  </Badge>
                  {d.docDate ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(d.docDate)}
                    </span>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="tabular-nums">
                    {formatMoney(d.amount, d.currency)}
                  </span>
                  <StatusBadge status={d.status} />
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
