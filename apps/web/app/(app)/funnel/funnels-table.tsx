"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import { StageBadge } from "./stage-badge"
import type { OpportunityListRow } from "./actions"

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
    id: "ownerMemberId",
    accessorFn: (row) => ({ id: row.ownerMemberId, label: row.ownerName ?? "Unassigned" }),
    header: "Owner",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.ownerName ?? "—"}
      </span>
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
  data,
  toolbar,
  renderBoard,
}: {
  data: OpportunityListRow[]
  toolbar?: React.ReactNode
  renderBoard?: (rows: OpportunityListRow[]) => React.ReactNode
}) {
  const options = (id: (row: OpportunityListRow) => string | null, label: (row: OpportunityListRow) => string | null) =>
    Array.from(new Map(data.map((row) => [id(row), label(row)]).filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))), ([value, label]) => ({ value, label }))
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No pipelines yet."
      toolbar={toolbar}
      renderFilteredView={renderBoard}
      tableId="funnel"
      cap={1000}
      searchColumn="name"
      searchPlaceholder="Search funnels…"
      filters={[
        { type: "relation", columnId: "accountId", title: "Account", options: options((row) => row.accountId, (row) => row.accountName) },
        { type: "relation", columnId: "opportunityId", title: "Opportunity", options: options((row) => row.opportunityId, (row) => [row.opportunityCode, row.opportunityName].filter(Boolean).join(" — ")) },
        { type: "relation", columnId: "id", title: "Funnel", options: options((row) => row.id, (row) => row.name) },
        { type: "relation", columnId: "accountOwnerMemberId", title: "Account owner", options: options((row) => row.accountOwnerMemberId, (row) => row.accountOwnerName) },
        { type: "relation", columnId: "ownerMemberId", title: "Funnel owner", options: options((row) => row.ownerMemberId, (row) => row.ownerName) },
        { type: "relation", columnId: "stageId", title: "Stage", options: options((row) => row.stageId, (row) => row.stageName) },
        { type: "enum", columnId: "status", title: "Status", options: [...new Set(data.map((row) => row.status))].map((value) => ({ value, label: value })) },
      ]}
    />
  )
}
