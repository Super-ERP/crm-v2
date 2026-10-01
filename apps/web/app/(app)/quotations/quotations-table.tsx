"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { Plus } from "lucide-react"
import { formatMoney, formatDate } from "@/lib/format"
import { QUOTATION_STATUSES } from "@/lib/quotation-transitions"
import type { QuotationFilterOptions } from "@/lib/api-readers"
import { listQuotationPage, type QuotationListItem } from "./actions"

export function QuotationsTable({
  initialPage,
  filterOptions,
  canCreate,
}: {
  initialPage: { rows: QuotationListItem[]; total: number }
  filterOptions: QuotationFilterOptions
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
      id: "accountOwnerMemberId",
      header: "Account owner",
      accessorFn: (row) => row.accountOwnerMemberId
        ? { id: row.accountOwnerMemberId, label: row.accountOwnerName ?? "Unknown" }
        : null,
      cell: ({ row }) => row.original.accountOwnerName ?? "—",
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
      data={initialPage.rows}
      server={{ total: initialPage.total, loadPage: listQuotationPage }}
      tableId="quotations"
      filters={[
        {
          type: "relation",
          columnId: "accountId",
          title: "Account",
          options: filterOptions.accounts,
        },
        {
          type: "relation",
          columnId: "accountOwnerMemberId",
          title: "Account owner",
          options: filterOptions.accountOwners,
        },
        {
          type: "relation",
          columnId: "opportunityId",
          title: "Opportunity",
          options: filterOptions.opportunities,
        },
        {
          type: "relation",
          columnId: "funnelId",
          title: "Funnel",
          options: filterOptions.funnels,
        },
        {
          type: "enum",
          columnId: "status",
          title: "Status",
          options: QUOTATION_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") })),
        },
      ]}
      searchColumn="quoteNumber"
      searchPlaceholder="Search quotations…"
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
