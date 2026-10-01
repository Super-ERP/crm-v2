"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, SortableHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"

import { listAuditPage, type AuditRow } from "./actions"

const RECORD_LABEL: Record<string, string> = {
  opportunity: "Funnel",
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
    entityType.charAt(0).toUpperCase() + entityType.slice(1)
  )
}

export function AuditTable({ initialPage, filterOptions }: {
  initialPage: { rows: AuditRow[]; total: number }
  filterOptions: { actions: string[]; records: string[] }
}) {
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
            {recordLabel(row.original.entityType)}
          </Badge>
        ),
      },
      {
        id: "entityId",
        accessorKey: "entityId",
        header: "Entity ID",
        cell: ({ row }) => (
          <span className="block max-w-[12rem] truncate font-mono text-xs text-muted-foreground">
            {row.original.entityId}
          </span>
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
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    []
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
