"use client"

import { ProjectCodeLinks, ProjectCodeSummary } from "@/components/project-code-link"
import { RecordReference } from "@/components/record-reference"
import * as React from "react"
import { Briefcase } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { formatOpportunityEstimatedTotals } from "@/lib/opportunity-currency"
import { listOpportunityPage, type OpportunityContainerRow } from "./actions"

export function OpportunitiesTable({ initialPage, filterOptions }: {
  initialPage: { rows: OpportunityContainerRow[]; total: number }
  filterOptions: { accounts: Array<{ value: string; label: string }>; owners: Array<{ value: string; label: string }> }
}) {
  const columns = React.useMemo<ColumnDef<OpportunityContainerRow>[]>(
    // Opportunity name and code are identical system-generated values, so the
    // list renders one identifier column instead of duplicating it.
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column} title="Opportunity number" />,
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
        header: ({ column }) => <SortableHeader column={column} title="End customer" />,
        cell: ({ row }) => <RecordReference href={`/accounts/${row.original.accountId}`} label={row.original.accountName} available={row.original.accountCanView} />,
        sortingFn: (a, b) => a.original.accountName.localeCompare(b.original.accountName),
      },
      {
        accessorKey: "totalEstimatedFunnelAmount",
        header: "Child estimate total (excl. tax)",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums" title="All non-deleted child estimates, by currency, including Won/Lost; excludes quote fallback and list filters.">
            {formatOpportunityEstimatedTotals(row.original.estimatedTotalsByCurrency, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "projectCodes",
        header: "Project code",
        enableSorting: false,
        cell: ({ row }) => <ProjectCodeSummary codes={row.original.projectCodes} crossDealCodes={row.original.crossDealProjectCodes} />,
      },
      {
        accessorKey: "crossDealProjectCodes",
        header: "Cross-deal reference",
        enableSorting: false,
        cell: ({ row }) => <ProjectCodeLinks codes={row.original.crossDealProjectCodes?.filter(code => !row.original.projectCodes?.includes(code))} />,
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
        sortingFn: (a, b) =>
          (a.original.accountOwnerName ?? "").localeCompare(b.original.accountOwnerName ?? ""),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={initialPage.rows}
      server={{ total: initialPage.total, loadPage: listOpportunityPage }}
      tableId="opportunities"
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
          options: filterOptions.owners,
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
