"use client"

import * as React from "react"
import { Briefcase } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { formatMoney } from "@/lib/format"
import type { OpportunityContainerRow } from "./actions"

function relationOptions(
  rows: OpportunityContainerRow[],
  getId: (row: OpportunityContainerRow) => string | null,
  getLabel: (row: OpportunityContainerRow) => string | null
) {
  const options = new Map<string, string>()
  for (const row of rows) {
    const id = getId(row)
    const label = getLabel(row)
    if (id && label) options.set(id, label)
  }
  return Array.from(options, ([value, label]) => ({ value, label }))
}

export function OpportunitiesTable({ data }: { data: OpportunityContainerRow[] }) {
  const columns = React.useMemo<ColumnDef<OpportunityContainerRow>[]>(
    // Opportunity name and code are identical system-generated values, so the
    // list renders one identifier column instead of duplicating it.
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Opportunity" />,
        cell: linkCell(
          (r) => `/opportunities/${r.id}`,
          (r) => r.name
        ),
      },
      {
        id: "accountId",
        accessorFn: (row) => ({
          id: row.accountId,
          label: [row.accountCode, row.accountName].filter(Boolean).join(" — "),
        }),
        header: ({ column }) => <SortableHeader column={column} title="Account" />,
        cell: ({ row }) => row.original.accountName ?? "—",
        sortingFn: (a, b) => a.original.accountName.localeCompare(b.original.accountName),
      },
      {
        accessorKey: "totalEstimatedFunnelAmount",
        header: ({ column }) => (
          <SortableHeader column={column} title="Total est. funnel amount" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.totalEstimatedFunnelAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "funnelCount",
        header: ({ column }) => <SortableHeader column={column} title="Funnels" />,
        cell: ({ row }) => (
          <Badge variant="secondary" className="tabular-nums">
            {row.original.funnelCount}
          </Badge>
        ),
      },
      {
        id: "accountOwnerMemberId",
        accessorFn: (row) => row.accountOwnerMemberId
          ? { id: row.accountOwnerMemberId, label: row.accountOwnerName ?? "Unknown" }
          : null,
        header: "Account owner",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.accountOwnerName ?? "—"}</span>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="opportunities"
      cap={2000}
      filters={[
        {
          type: "relation",
          columnId: "accountId",
          title: "Account",
          options: relationOptions(
            data,
            (row) => row.accountId,
            (row) => [row.accountCode, row.accountName].filter(Boolean).join(" — ")
          ),
        },
        {
          type: "relation",
          columnId: "accountOwnerMemberId",
          title: "Account owner",
          options: relationOptions(
            data,
            (row) => row.accountOwnerMemberId,
            (row) => row.accountOwnerName ?? "Unknown"
          ),
        },
      ]}
      searchColumn="name"
      searchPlaceholder="Search opportunities…"
      emptyIcon={Briefcase}
      emptyMessage="No opportunities yet"
      emptyDescription="An opportunity is created automatically when you add a funnel or convert a lead."
    />
  )
}
