"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { Plus } from "lucide-react"
import { formatMoney, formatDate } from "@/lib/format"
import type { QuotationListItem } from "./actions"

function relationOptions(
  rows: QuotationListItem[],
  getId: (row: QuotationListItem) => string | null,
  getLabel: (row: QuotationListItem) => string | null
) {
  const options = new Map<string, string>()
  for (const row of rows) {
    const id = getId(row)
    const label = getLabel(row)
    if (id && label) options.set(id, label)
  }
  return Array.from(options, ([value, label]) => ({ value, label }))
}

export function QuotationsTable({
  data,
  canCreate,
}: {
  data: QuotationListItem[]
  canCreate: boolean
}) {
  const columns: ColumnDef<QuotationListItem>[] = [
    {
      accessorKey: "quoteNumber",
      header: ({ column }) => <SortableHeader column={column} title="Number" />,
      cell: linkCell(
        (r) => `/quotations/${r.id}`,
        (r) => r.quoteNumber
      ),
    },
    {
      id: "accountId",
      header: ({ column }) => (
        <SortableHeader column={column} title="Account" />
      ),
      accessorFn: (row) =>
        row.accountId && row.accountName
          ? {
              id: row.accountId,
              label: [row.accountCode, row.accountName].filter(Boolean).join(" — "),
            }
          : null,
      cell: ({ row }) => row.original.accountName ?? "—",
      sortingFn: (a, b) =>
        (a.original.accountName ?? "").localeCompare(b.original.accountName ?? ""),
    },
    {
      id: "opportunityId",
      header: ({ column }) => (
        <SortableHeader column={column} title="Opportunity" />
      ),
      accessorFn: (row) =>
        row.opportunityId && row.opportunityName
          ? {
              id: row.opportunityId,
              label: [row.opportunityCode, row.opportunityName]
                .filter(Boolean)
                .join(" — "),
            }
          : null,
      cell: ({ row }) => row.original.opportunityName ?? "—",
      sortingFn: (a, b) =>
        (a.original.opportunityName ?? "").localeCompare(b.original.opportunityName ?? ""),
    },
    {
      id: "funnelId",
      header: ({ column }) => (
        <SortableHeader column={column} title="Funnel" />
      ),
      accessorFn: (row) => ({ id: row.funnelId, label: row.funnelName ?? "" }),
      cell: ({ row }) => row.original.funnelName ?? "—",
      sortingFn: (a, b) =>
        (a.original.funnelName ?? "").localeCompare(b.original.funnelName ?? ""),
    },
    // Keep the line and financial columns together after the related records.
    {
      accessorKey: "lineItemCount",
      header: ({ column }) => (
        <SortableHeader column={column} title="Line items" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.lineItemCount}</span>
      ),
    },
    {
      accessorKey: "subtotal",
      header: ({ column }) => (
        <SortableHeader column={column} title="Total excl. tax" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMoney(row.original.subtotal, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "taxTotal",
      header: ({ column }) => <SortableHeader column={column} title="Tax amount" />,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMoney(row.original.taxTotal, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <SortableHeader column={column} title="Total incl. tax" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMoney(row.original.total, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} className="capitalize" />
      ),
    },
    {
      id: "primary",
      header: "Primary",
      cell: ({ row }) =>
        row.original.isPrimary ? <Badge variant="secondary">Primary</Badge> : null,
    },
    {
      accessorKey: "validUntil",
      header: "Valid until",
      cell: ({ row }) => formatDate(row.original.validUntil),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="quotations"
      cap={500}
      filters={[
        {
          type: "relation",
          columnId: "accountId",
          title: "Account",
          options: relationOptions(
            data,
            (row) => row.accountId,
            (row) =>
              row.accountName
                ? [row.accountCode, row.accountName].filter(Boolean).join(" — ")
                : null
          ),
        },
        {
          type: "relation",
          columnId: "opportunityId",
          title: "Opportunity",
          options: relationOptions(
            data,
            (row) => row.opportunityId,
            (row) =>
              row.opportunityName
                ? [row.opportunityCode, row.opportunityName]
                    .filter(Boolean)
                    .join(" — ")
                : null
          ),
        },
        {
          type: "relation",
          columnId: "funnelId",
          title: "Funnel",
          options: relationOptions(
            data,
            (row) => row.funnelId,
            (row) =>
              row.funnelName
                ? [row.opportunityCode, row.funnelName]
                    .filter(Boolean)
                    .join(" — ")
                : null
          ),
        },
        {
          type: "enum",
          columnId: "status",
          title: "Status",
          options: Array.from(
            new Set(data.map((row) => row.status).filter(Boolean))
          ).map((value) => ({ value, label: value })),
        },
      ]}
      searchColumn="quoteNumber"
      searchPlaceholder="Search by number…"
      emptyMessage="No quotations yet."
      toolbar={
        canCreate ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/quotations/new" />}
          >
            <Plus className="size-4" />
            New quotation
          </Button>
        ) : undefined
      }
    />
  )
}
