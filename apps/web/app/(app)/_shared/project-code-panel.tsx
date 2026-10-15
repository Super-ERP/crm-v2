"use client"

import * as React from "react"
import Link from "next/link"
import { HashIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, SortableHeader, linkCell } from "@/components/data-table"
import { DetailCardHeader } from "@/components/detail-page"
import { ProjectCodeLink } from "@/components/project-code-link"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { listRelatedProjectCodeTablePage, type RelatedProjectCodePage, type RelatedProjectCodeRow } from "./project-code-actions"

export function ProjectCodePanel({ kind, recordId, initialPage }: { kind: "account" | "person"; recordId: string; initialPage: RelatedProjectCodePage }) {
  const loadPage = React.useCallback((query: ServerTableQuery) => listRelatedProjectCodeTablePage(kind, recordId, query), [kind, recordId])
  const columns = React.useMemo<ColumnDef<RelatedProjectCodeRow>[]>(() => [
    { accessorKey: "projectCode", header: ({ column }) => <SortableHeader column={column} title="Project code" />, cell: ({ row }) => <ProjectCodeLink code={row.original.projectCode} /> },
    { accessorKey: "crossDealProjectCode", header: "Cross-deal project code", enableSorting: false, cell: ({ row }) => <ProjectCodeLink code={row.original.crossDealProjectCode} /> },
    { accessorKey: "crmProjectCode", header: "CRM project code", enableSorting: false, cell: ({ row }) => <ProjectCodeLink code={row.original.crmProjectCode} /> },
    { accessorKey: "funnelName", header: ({ column }) => <SortableHeader column={column} title="Funnel" />, cell: linkCell(row => `/funnel/${row.funnelId}`, row => row.funnelName) },
    { accessorKey: "opportunityName", header: "Opportunity", enableSorting: false, cell: ({ row }) => row.original.opportunityId ? <Link className="link" href={`/opportunities/${row.original.opportunityId}`}>{row.original.opportunityName}</Link> : "—" },
  ], [])
  return <Card><DetailCardHeader kind="projectCode" eyebrow="Related" title="Project codes" /><CardContent className="grid gap-4">
    <p className="text-sm text-muted-foreground">Open a code to explore connected sales records at Commit (4A) and Closed Won.</p>
    <DataTable columns={columns} data={initialPage.rows} server={{ total: initialPage.total, loadPage }}
      tableId={`${kind}-project-codes`} searchPlaceholder="Search project codes or funnels…" emptyIcon={HashIcon}
      emptyMessage="No active project codes" emptyDescription="Only active sales records you can access contribute project codes." />
  </CardContent></Card>
}
