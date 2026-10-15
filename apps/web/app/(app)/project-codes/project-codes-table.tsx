"use client"

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

export function ProjectCodesTable({ initialPage }: { initialPage: CodeDirectory }) {
  const columns = React.useMemo<ColumnDef<CodeSummary>[]>(() => [
    { accessorKey: "code", header: ({ column }) => <SortableHeader column={column} title="Project code" />, cell: ({ row }) => <ProjectCodeLink code={row.original.code} /> },
    { id: "relationship", header: "Used as", enableSorting: false, cell: ({ row }) => <CodeRoles primary={row.original.primaryCount > 0} crossDeal={row.original.crossDealCount > 0} crm={row.original.crmCount > 0} /> },
    { accessorKey: "funnelCount", header: ({ column }) => <SortableHeader column={column} title="Linked funnels" />, cell: ({ row }) => <Badge variant="secondary" className="tabular-nums">{row.original.funnelCount}</Badge> },
  ], [])
  return <DataTable columns={columns} data={initialPage.rows}
    server={{ total: initialPage.total, loadPage: listProjectCodeTablePage }}
    tableId="project-codes" searchColumn="code" searchPlaceholder="Search project codes…"
    emptyIcon={HashIcon} emptyMessage="No active project codes"
    emptyDescription="Codes appear for accessible funnels at Commit (4A) or Closed Won. Try another search if no code matches."
  />
}
