"use client"

import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import * as React from "react"
import Link from "next/link"
import { CreditCard } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { formatMoney } from "@/lib/format"
import { listPaymentMilestonePage, type PaymentMilestoneListItem } from "./actions"
import { MILESTONE_STATUS_OPTIONS } from "@/lib/status-meta"

export function PaymentMilestonesTable({
  initialPage,
}: {
  initialPage: { rows: PaymentMilestoneListItem[]; total: number }
}) {
  const permissions = usePermissions()
  const canViewQuote = permissions.has(PERMISSIONS.QUOTATION_VIEW)
  const columns = React.useMemo<ColumnDef<PaymentMilestoneListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortableHeader column={column} title="Payment Milestone Name" />
        ),
        cell: ({ row }) => (
          <Link
            href={`/payment-milestones/${row.original.id}`}
            className="font-medium link"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <SortableHeader column={column} title="Planned amount (excl. tax)" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.currency ? formatMoney(row.original.amount, row.original.currency) : `${row.original.amount} (currency unavailable)`}
          </span>
        ),
      },
      {
        accessorKey: "quoteNumber",
        header: "Quotation",
        cell: ({ row }) =>
          canViewQuote && row.original.quotationId && row.original.quoteNumber ? (
            <Link href={`/quotations/${row.original.quotationId}`} className="link">
              <span className="font-mono text-xs">{row.original.quoteNumber}</span>
            </Link>
          ) : (
            <span className="text-muted-foreground">Not linked</span>
          ),
      },
      { accessorKey: "expectedInvoiceMonth", header: "Expected invoice month" },
      { accessorKey: "expectedInvoiceYear", header: "Expected invoice year" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "funnelName",
        header: "Funnel",
        cell: ({ row }) =>
          row.original.funnelId && row.original.funnelName ? (
            <Link href={`/funnel/${row.original.funnelId}`} className="link">
              {row.original.funnelName}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [canViewQuote]
  )

  return (
    <DataTable
      columns={columns}
      data={initialPage.rows}
      server={{ total: initialPage.total, loadPage: listPaymentMilestonePage }}
      tableId="payment-milestones"
      filters={[{
        type: "enum",
        columnId: "status",
        title: "Status",
        options: MILESTONE_STATUS_OPTIONS,
      }]}
      searchColumn="title"
      searchPlaceholder="Search payment milestones…"
      emptyIcon={CreditCard}
      emptyMessage="No payment milestones yet"
      emptyDescription="Payment milestones attached to funnels appear here."
    />
  )
}
