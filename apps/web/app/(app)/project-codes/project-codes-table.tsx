"use client"

import Link from "next/link"
import { StageBadge } from "../funnel/stage-badge"
import { formatDate } from "@/lib/format"
import { formatOpportunityEstimatedTotals } from "@/lib/opportunity-currency"
import * as React from "react"
import { HashIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { ProjectCodeLink } from "@/components/project-code-link"
import type { CodeDirectory, CodeSummary } from "@/server/services/project-codes"
import { listProjectCodeTablePage } from "./actions"

export function CodeRoles({ primary, crossDeal, crm }: { primary: boolean; crossDeal: boolean; crm: boolean }) {
  return <div className="flex flex-wrap gap-1.5">
    {primary ? <Badge variant="secondary">Primary</Badge> : null}
    {crossDeal && !primary ? <Badge variant="outline">Cross-deal reference</Badge> : null}
    {crm && !primary && !crossDeal ? <Badge variant="outline">CRM</Badge> : null}
  </div>
}

function LinkedRecords({ records, base }: { records: { id: string; name: string }[]; base: string }) {
  return records?.length ? <div className="grid gap-1">{records.map(record => <Link key={record.id} href={`${base}/${record.id}`} className="link">{record.name}</Link>)}</div> : <span className="text-muted-foreground">—</span>
}

export function ProjectCodesTable({ initialPage }: { initialPage: CodeDirectory }) {
  const columns = React.useMemo<ColumnDef<CodeSummary>[]>(() => [
    { accessorKey: "code", header: ({ column }) => <SortableHeader column={column} title="Project code" />, cell: ({ row }) => <ProjectCodeLink code={row.original.code} className="text-sm font-medium" /> },
    { id: "relationship", header: "Used as", enableSorting: false, cell: ({ row }) => <CodeRoles primary={row.original.primaryCount > 0} crossDeal={row.original.crossDealCount > 0} crm={row.original.crmCount > 0} /> },
    { accessorKey: "funnelCount", header: ({ column }) => <SortableHeader column={column} title="Linked funnels" />, cell: ({ row }) => <Badge variant="secondary" className="tabular-nums">{row.original.funnelCount}</Badge> },
    { accessorKey: "accountName", header: "Account", cell: ({ row }) => <LinkedRecords records={row.original.linkedAccounts} base="/accounts" /> },
    { accessorKey: "funnelName", header: "Funnel", cell: ({ row }) => <LinkedRecords records={row.original.linkedFunnels} base="/funnel" /> },
    { accessorKey: "ownerName", header: "Owner", cell: ({ row }) => row.original.ownerName?.join(", ") || "—" },
    { accessorKey: "stageName", header: "Stage", cell: ({ row }) => <div className="flex flex-wrap gap-1.5">{row.original.stages?.map(stage => <StageBadge key={`${stage.kind}:${stage.name}`} {...stage} />)}</div> },
    { id: "totalEstimatedFunnelAmount", header: "Est. amount", enableSorting: false, cell: ({ row }) => <span className="tabular-nums">{row.original.estimatedTotalsByCurrency?.length ? formatOpportunityEstimatedTotals(row.original.estimatedTotalsByCurrency, "MYR") : "—"}</span> },
    { accessorKey: "expectedCloseDate", header: "Earliest expected close date", cell: ({ row }) => formatDate(row.original.expectedCloseDate) },
  ], [])
  return <DataTable columns={columns} data={initialPage.rows}
    server={{ total: initialPage.total, loadPage: listProjectCodeTablePage }}
    tableId="project-codes" searchColumn="code" searchPlaceholder="Search project codes…"
    emptyIcon={HashIcon} emptyMessage="No active project codes"
    emptyDescription="Codes appear for accessible funnels at Commit (4A) or Closed Won. Try another search if no code matches."
  />
}
