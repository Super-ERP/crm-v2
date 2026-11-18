"use client"

import { DealValue } from "@/components/deal-value"
import { ProjectCodeLink, ProjectCodeSummary } from "@/components/project-code-link"
import { RecordReference } from "@/components/record-reference"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { formatDate } from "@/lib/format"
import { StageBadge } from "./stage-badge"
import { listFunnelPage, type OpportunityListRow } from "./actions"
import type { ServerTableQuery } from "@/lib/table-pagination"

const columns: ColumnDef<OpportunityListRow>[] = [
  {
    id: "id",
    accessorFn: (row) => ({ id: row.id, label: row.name }),
    header: ({ column }) => <SortableHeader column={column} title="Funnel / deal name" />,
    cell: linkCell(
      (r) => `/funnel/${r.id}`,
      (r) => r.name
    ),
    sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
  },
  {
    id: "accountId",
    accessorFn: (row) => ({ id: row.accountId, label: row.accountName }),
    header: ({ column }) => <SortableHeader column={column} title="End customer" />,
    cell: ({ row }) => (
      <RecordReference href={`/accounts/${row.original.accountId}`} label={row.original.accountName} available={row.original.accountCanView} />
    ),
  },
  {
    accessorKey: "projectCode",
    header: "Project code",
    enableSorting: false,
    cell: ({ row }) => <ProjectCodeSummary code={row.original.projectCode} crossDealCode={row.original.crossDealProjectCode} />,
  },
  {
    accessorKey: "crossDealProjectCode",
    header: "Cross-deal reference",
    enableSorting: false,
    cell: ({ row }) => <ProjectCodeLink code={row.original.crossDealProjectCode !== row.original.projectCode ? row.original.crossDealProjectCode : null} />,
  },
  {
    id: "opportunityId",
    accessorFn: (row) => ({ id: row.opportunityId, label: row.opportunityName }),
    header: "Parent Opportunity",
    cell: ({row}) => <RecordReference href={`/opportunities/${row.original.opportunityId}`} label={row.original.opportunityName} available={row.original.opportunityCanView} />,
  },
  {
    id: "accountOwnerMemberId",
    accessorFn: (row) => row.accountOwnerMemberId ? { id: row.accountOwnerMemberId, label: row.accountOwnerName ?? "Unknown" } : null,
    header: "Account owner",
    cell: ({ row }) => row.original.accountOwnerName ?? "—",
  },
  {
    id: "amount",
    accessorFn: (row) => row.estimatedAmount ?? row.amount,
    header: ({ column }) => (
      <SortableHeader column={column} title="Deal value (excl. tax)" />
    ),
    cell: ({ row }) => <DealValue row={row.original} />,
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
      emptyMessage="No deals yet."
      toolbar={toolbar}
      renderFilteredView={renderBoard}
      tableId="funnel"
      searchColumn="name"
      searchPlaceholder="Search funnels…"
      filters={[
        { type: "relation", columnId: "accountId", title: "End customer", options: filterOptions.accounts },
        { type: "relation", columnId: "opportunityId", title: "Parent Opportunity", options: filterOptions.opportunities },
        { type: "enum", columnId: "expectedCloseDate", title: "Expected close year", options: filterOptions.expectedCloseYears },
        { type: "relation", columnId: "accountOwnerMemberId", title: "Account owner", options: filterOptions.accountOwners },
        { type: "relation", columnId: "stageId", title: "Stage", options: filterOptions.stages },
        { type: "enum", columnId: "status", title: "Status", options: ["open", "won", "lost", "on_hold"].map((value) => ({ value, label: value })) },
      ]}
    />
  )
}
