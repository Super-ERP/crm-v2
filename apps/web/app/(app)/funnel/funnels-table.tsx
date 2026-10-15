"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import { StageBadge } from "./stage-badge"
import { listFunnelPage, type OpportunityListRow } from "./actions"
import type { ServerTableQuery } from "@/lib/table-pagination"

const columns: ColumnDef<OpportunityListRow>[] = [
  {
    id: "id",
    accessorFn: (row) => ({ id: row.id, label: row.name }),
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    cell: linkCell(
      (r) => `/funnel/${r.id}`,
      (r) => r.name
    ),
    sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
  },
  {
    id: "accountId",
    accessorFn: (row) => ({ id: row.accountId, label: row.accountName }),
    header: ({ column }) => <SortableHeader column={column} title="Account" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.accountName}</span>
    ),
  },
  {
    id: "opportunityId",
    accessorFn: (row) => ({ id: row.opportunityId, label: row.opportunityName }),
    header: "Opportunity",
    cell: ({ row }) => row.original.opportunityName,
  },
  {
    id: "accountOwnerMemberId",
    accessorFn: (row) => row.accountOwnerMemberId ? { id: row.accountOwnerMemberId, label: row.accountOwnerName ?? "Unknown" } : null,
    header: "Account owner",
    cell: ({ row }) => row.original.accountOwnerName ?? "—",
  },
  {
    id: "amount",
    accessorFn: (row) => Number(row.estimatedAmount ?? row.amount ?? 0),
    header: ({ column }) => (
      <SortableHeader column={column} title="Est. funnel amount" />
    ),
    cell: ({ row }) => {
      const value = row.original.estimatedAmount ?? row.original.amount
      return (
        <span className="tabular-nums">
          {value ? formatMoney(value, row.original.currency) : "—"}
        </span>
      )
    },
    sortingFn: (a, b) =>
      Number(a.original.estimatedAmount ?? a.original.amount ?? 0) -
      Number(b.original.estimatedAmount ?? b.original.amount ?? 0),
  },
  {
    accessorKey: "expectedCloseDate",
    header: ({ column }) => (
      <SortableHeader column={column} title="Est. close date" />
    ),
    cell: ({ row }) => formatDate(row.original.expectedCloseDate),
  },
  {
    id: "stageId",
    accessorFn: (row) => ({ id: row.stageId, label: row.stageName }),
    header: "Sales stage",
    cell: ({ row }) => (
      <StageBadge
        name={row.original.stageName}
        kind={row.original.stageKind}
        probability={row.original.stageProbability}
      />
    ),
  },
  {
    accessorKey: "status",
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export function OpportunitiesTable({
  initialPage,
  filterOptions,
  toolbar,
  renderBoard,
}: {
  initialPage: { rows: OpportunityListRow[]; total: number }
  filterOptions: {
    expectedCloseYears: Array<{ value: string; label: string }>;
    accounts: Array<{ value: string; label: string }>; opportunities: Array<{ value: string; label: string }>;
    funnels: Array<{ value: string; label: string }>; accountOwners: Array<{ value: string; label: string }>;
    owners: Array<{ value: string; label: string }>; stages: Array<{ value: string; label: string }>;
  }
  toolbar?: React.ReactNode
  renderBoard?: (rows: OpportunityListRow[], query: ServerTableQuery) => React.ReactNode
}) {
  return (
    <DataTable
      columns={columns}
      data={initialPage.rows}
      server={{ total: initialPage.total, loadPage: listFunnelPage }}
      emptyMessage="No pipelines yet."
      toolbar={toolbar}
      renderFilteredView={renderBoard}
      tableId="funnel"
      searchColumn="name"
      searchPlaceholder="Search funnels…"
      filters={[
        { type: "relation", columnId: "accountId", title: "Account", options: filterOptions.accounts },
        { type: "relation", columnId: "opportunityId", title: "Opportunity", options: filterOptions.opportunities },
        { type: "enum", columnId: "expectedCloseDate", title: "Expected close year", options: filterOptions.expectedCloseYears },
        { type: "relation", columnId: "accountOwnerMemberId", title: "Account owner", options: filterOptions.accountOwners },
        { type: "relation", columnId: "stageId", title: "Stage", options: filterOptions.stages },
        { type: "enum", columnId: "status", title: "Status", options: ["open", "won", "lost", "on_hold"].map((value) => ({ value, label: value })) },
      ]}
    />
  )
}
