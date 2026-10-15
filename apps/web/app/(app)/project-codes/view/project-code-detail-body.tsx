"use client"

import * as React from "react"
import Link from "next/link"
import { BriefcaseIcon, FilterIcon, FileTextIcon, Building2Icon, UsersIcon, FolderKanbanIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader, moneyCell } from "@/components/data-table"
import { DetailAside, DetailCardHeader, DetailTabs, RelatedCard, CountTab, FieldRow } from "@/components/detail-page"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { TabsContent, TabsList } from "@/components/ui/tabs"
import { ObjectTile, type ObjectKind } from "@/components/object-tile"
import { formatDate } from "@/lib/format"
import type { ServerTableQuery } from "@/lib/table-pagination"
import type { CodeDetail, CodeRelatedRecord } from "@/server/services/project-codes"
import { getProjectCodeTablePage, listCodeRelatedTablePage } from "../actions"
import { CodeRoles } from "../project-codes-table"

type FunnelRow = CodeDetail["funnels"][number]
type Tab = "funnels" | "opportunities" | "quotations" | "accounts" | "contacts" | "projects"
const VALID_TABS: Tab[] = ["funnels", "opportunities", "quotations", "accounts", "contacts", "projects"]
function objectLink(kind: ObjectKind, href: string, name: string) {
  return <Link href={href} title={name} className="flex w-full min-w-0 items-start gap-2 link"><ObjectTile kind={kind} className="size-5" iconClassName="size-3" /><span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{name}</span></Link>
}

function RecordTable({ rows, kind, base, tableId, code }: { code:string; rows: CodeRelatedRecord[]; kind: Exclude<Tab, "funnels">; base: string; tableId: string }) {
  const loadPage=React.useCallback((query:ServerTableQuery)=>listCodeRelatedTablePage(code,kind,query),[code,kind])
  const meta = {
    opportunities: { label: "Opportunity", plural: "opportunities", object: "opportunity" as const, Icon: BriefcaseIcon },
    quotations: { label: "Quotation", plural: "quotations", object: "quotation" as const, Icon: FileTextIcon },
    accounts: { label: "Account", plural: "accounts", object: "account" as const, Icon: Building2Icon },
    contacts: { label: "Contact", plural: "contacts", object: "contact" as const, Icon: UsersIcon },
    projects: { label: "Project", plural: "projects", object: "project" as const, Icon: FolderKanbanIcon },
  }[kind]
  const columns = React.useMemo<ColumnDef<CodeRelatedRecord>[]>(() => {
    const result: ColumnDef<CodeRelatedRecord>[] = [
      { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title={meta.label} />, cell: ({ row }) => objectLink(meta.object, `${base}/${row.original.id}`, row.original.name) },
    ]
    if (kind === "accounts" || kind === "projects") result.push({ accessorKey: "recordCode", header: "Code", cell: ({ row }) => row.original.recordCode ?? "—" })
    if (kind === "accounts") result.push({ accessorKey: "role", header: "Relationship", cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge> })
    if (kind === "quotations" || kind === "accounts" || kind === "projects") result.push({ accessorKey: "status", header: kind === "accounts" ? "Type" : "Status", cell: ({ row }) => row.original.status ? <StatusBadge status={row.original.status} className="capitalize" /> : "—" })
    if (kind === "quotations" || kind === "projects") result.push({ accessorKey: "amount", header: "Amount", cell: moneyCell(r => r.amount, r => r.currency ?? "MYR") })
    if (kind === "contacts") result.push({ accessorKey: "title", header: "Designation", cell: ({ row }) => row.original.title ?? "—" }, { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" })
    return result
  }, [base, kind, meta.label, meta.object])
  return <DataTable columns={columns} data={rows} tableId={tableId} server={{total:rows.length,loadPage}} searchColumn="name"
    searchPlaceholder={`Search ${meta.plural}…`} emptyIcon={meta.Icon}
    emptyMessage={`No linked ${meta.plural}`} emptyDescription="Accessible records connected to this project code appear here." />
}

export function ProjectCodeDetailBody({ initialDetail, initialTab }: { initialDetail: CodeDetail; initialTab?: string }) {
  const [loaded, setLoaded] = React.useState<{ source: CodeDetail; detail: CodeDetail } | null>(null)
  const detail = loaded?.source === initialDetail ? loaded.detail : initialDetail
  const [tab, setTab] = React.useState<Tab>(VALID_TABS.includes(initialTab as Tab) ? initialTab as Tab : "funnels")
  const request = React.useRef(0)
  const loadFunnels = React.useCallback(async (query: ServerTableQuery) => {
    const currentRequest = ++request.current
    const result = await getProjectCodeTablePage(initialDetail.code, query)
    if (!result) throw new Error("This project code is no longer active or accessible. Refresh the page.")
    if (request.current === currentRequest) setLoaded({ source: initialDetail, detail: result })
    return { rows: result.funnels, total: result.total }
  }, [initialDetail])
  const opportunities = detail.opportunities
  const accounts = React.useMemo(() => new Map(detail.accounts.map(account => [account.id, account])), [detail.accounts])
  const funnelColumns = React.useMemo<ColumnDef<FunnelRow>[]>(() => [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Funnel" />, cell: ({ row }) => objectLink("funnel", `/funnel/${row.original.id}`, row.original.name) },
    { id: "relationship", header: "Relationship", enableSorting: false, cell: ({ row }) => <CodeRoles {...row.original} /> },
    { accessorKey: "stageName", header: ({ column }) => <SortableHeader column={column} title="Stage" />, cell: ({ row }) => <Badge variant={row.original.stageKind === "WON" ? "default" : "secondary"}>{row.original.stageName ?? row.original.status}</Badge> },
    { accessorKey: "estimatedAmount", header: ({ column }) => <SortableHeader column={column} title="Est. amount" />, cell: moneyCell(r => r.estimatedAmount, r => r.currency) },
    { accessorKey: "expectedCloseDate", header: ({ column }) => <SortableHeader column={column} title="Expected close date" />, cell: ({ row }) => formatDate(row.original.expectedCloseDate) },
    { id: "account", header: "Account", enableSorting: false, cell: ({ row }) => { const a = accounts.get(row.original.accountId); return a ? objectLink("account", `/accounts/${a.id}`, a.name) : "—" } },
    { id: "opportunity", header: "Opportunity", enableSorting: false, cell: ({ row }) => { const o = row.original.opportunity; return o ? objectLink("opportunity", `/opportunities/${o.id}`, o.name) : "—" } },
    { accessorKey: "ownerName", header: "Owner", enableSorting: false, cell: ({ row }) => row.original.ownerName ?? "—" },
  ], [accounts])
  const groups: Array<{ tab: Tab; label: string; kind: ObjectKind; count: number }> = [
    { tab: "funnels", label: "Funnels", kind: "funnel", count: detail.total },
    { tab: "opportunities", label: "Opportunities", kind: "opportunity", count: opportunities.length },
    { tab: "quotations", label: "Quotations", kind: "quotation", count: detail.quotations.length },
    { tab: "accounts", label: "Accounts", kind: "account", count: detail.accounts.length },
    { tab: "contacts", label: "Contacts", kind: "contact", count: detail.contacts.length },
    ...(detail.projects.length ? [{ tab: "projects" as const, label: "Projects", kind: "project" as const, count: detail.projects.length }] : []),
  ]
  return <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
    <DetailAside>
      <Card><DetailCardHeader kind="projectCode" eyebrow="Project code" /><CardContent className="grid gap-3 text-sm">
        <FieldRow inline label="Code"><span className="break-all font-mono font-medium">{detail.code}</span></FieldRow>
        <FieldRow inline label="Availability">Commit (4A) and Closed Won</FieldRow>
        <FieldRow inline label="Funnels"><Badge variant="secondary" className="tabular-nums">{detail.total}</Badge></FieldRow>
        <p className="text-xs text-muted-foreground">Historical codes remain stored when funnels move to an earlier stage.</p>
      </CardContent></Card>
      <RelatedCard items={groups.map(group => ({ kind: group.kind, label: group.label, count: group.count, onSelect: () => setTab(group.tab) }))} />
    </DetailAside>
    <DetailTabs value={groups.some(group => group.tab === tab) ? tab : "funnels"} onValueChange={value => setTab(value as Tab)}>
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">{groups.map(group => <CountTab key={group.tab} value={group.tab} count={group.count}>{group.label}</CountTab>)}</TabsList>
      {/* DataTable owns fetched rows; stable initial props prevent a refresh loop. */}
      <TabsContent value="funnels" className="mt-4"><DataTable columns={funnelColumns} data={initialDetail.funnels}
        server={{ total: initialDetail.total, loadPage: loadFunnels }} tableId="project-code-funnels" searchColumn="name" searchPlaceholder="Search funnels…"
        emptyIcon={FilterIcon} emptyMessage="No matching funnels" emptyDescription="Try another name or clear the search. Only active funnels you can access appear here." /></TabsContent>
      <TabsContent value="opportunities" className="mt-4"><RecordTable code={detail.code} rows={opportunities} kind="opportunities" base="/opportunities" tableId="code-opportunities" /></TabsContent>
      <TabsContent value="quotations" className="mt-4"><RecordTable code={detail.code} rows={detail.quotations} kind="quotations" base="/quotations" tableId="code-quotations" /></TabsContent>
      <TabsContent value="accounts" className="mt-4"><RecordTable code={detail.code} rows={detail.accounts} kind="accounts" base="/accounts" tableId="code-accounts" /></TabsContent>
      <TabsContent value="contacts" className="mt-4"><RecordTable code={detail.code} rows={detail.contacts} kind="contacts" base="/persons" tableId="code-contacts" /></TabsContent>
      {detail.projects.length ? <TabsContent value="projects" className="mt-4"><RecordTable code={detail.code} rows={detail.projects} kind="projects" base="/projects" tableId="code-projects" /></TabsContent> : null}
      <p className="mt-4 text-xs text-muted-foreground">Related lists include accessible records across all active funnels linked to this code.</p>
    </DetailTabs>
  </div>
}
