"use client"

import Link from "next/link"
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useBusinessTimezone } from "@/components/table-controls/business-timezone"

import { listAuditPage, type AuditRow } from "./actions"

const RECORD_LABEL: Record<string, string> = {
  opportunity: "Opportunity / legacy Funnel",
  opportunity_container: "Opportunity",
  funnel: "Funnel",
  stage_approval_request: "Approval",
  person: "Contact",
  account: "Account",
  lead: "Lead",
  quotation: "Quotation",
  project: "Project",
  quotation_line_item: "Quotation",
  tax_setting: "Tax",
}

function recordLabel(entityType: string): string {
  return (
    RECORD_LABEL[entityType] ??
    entityType.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
  )
}

export function AuditTable({ initialPage, filterOptions }: {
  initialPage: { rows: AuditRow[]; total: number }
  filterOptions: { actions: string[]; records: string[] }
}) {
  const timezone = useBusinessTimezone()
  const columns = React.useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        accessorKey: "action",
        header: ({ column }) => <SortableHeader column={column} title="Action" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.action}</span>
        ),
      },
      {
        id: "record",
        accessorFn: (row) => row.entityType,
        header: ({ column }) => <SortableHeader column={column} title="Record" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.recordHref?.startsWith("/funnel/") ? "Funnel" : row.original.recordHref?.startsWith("/opportunities/") ? "Opportunity" : recordLabel(row.original.entityType)}
          </Badge>
        ),
      },
      {
        id: "entityId",
        accessorKey: "entityId",
        header: "Record identity",
        cell: ({ row }) => (
          <div className="grid gap-1">
            {row.original.recordHref ? <Link href={row.original.recordHref} className="text-primary underline underline-offset-4">{row.original.recordName}</Link> : <span className="text-xs text-muted-foreground">Historical record · name/link unavailable</span>}
            <span className="select-all break-all font-mono text-xs text-muted-foreground">{row.original.entityId}</span>
          </div>
        ),
      },
      {
        id: "actor",
        accessorKey: "actorName",
        header: ({ column }) => <SortableHeader column={column} title="Actor" />,
        cell: ({ row }) => (
          <span>{row.original.actorName ?? "System"}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column} title="When" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "long", timeZone: timezone }).format(new Date(row.original.createdAt))} ({timezone})
          </span>
        ),
      },
    ],
    [timezone]
  )

  return (
    <DataTable
      columns={columns}
      data={initialPage.rows}
      server={{ total: initialPage.total, loadPage: listAuditPage }}
      searchColumn="action"
      searchPlaceholder="Search by action…"
      emptyMessage="No audit events yet."
      filters={[
        { type: "enum", columnId: "action", title: "Action", options: filterOptions.actions.map((value) => ({ value, label: value })) },
        { type: "enum", columnId: "record", title: "Record", options: filterOptions.records.map((value) => ({ value, label: recordLabel(value) })) },
      ]}
      tableId="audit"
    />
  )
}
