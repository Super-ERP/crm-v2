"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FunnelWithStages } from "@/lib/lookups"
import type { CustomFunnelField } from "@/lib/stage-gate"
import type { OpportunityListRow } from "./actions"
import { filterFunnelRows, type FunnelViewFilters } from "./funnel-view-filter"
import { OpportunitiesBoard } from "./funnels-board"
import { OpportunitiesTable } from "./funnels-table"

export function FunnelViews({ rows, pipelines, canAdvance, customFieldDefs, memberId, newButton }: {
  rows: OpportunityListRow[]
  pipelines: FunnelWithStages[]
  canAdvance: boolean
  customFieldDefs: CustomFunnelField[]
  memberId: string | null
  newButton?: React.ReactNode
}) {
  const [filters, setFilters] = React.useState<FunnelViewFilters>({ ownerId: "", stageId: "", status: "", search: "" })
  const visibleRows = React.useMemo(() => filterFunnelRows(rows, filters), [rows, filters])
  const owners = React.useMemo(() => [...new Map(rows.map((row) => [row.ownerMemberId, row.ownerName ?? "Unassigned"])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows])
  const stages = React.useMemo(() => [...new Map(rows.map((row) => [row.stageId, row.stageName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows])
  const statuses = React.useMemo(() => [...new Set(rows.map((row) => row.status))].sort(), [rows])

  function setFilter(key: keyof FunnelViewFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-sm"
  return (
    <Tabs defaultValue="board" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList><TabsTrigger value="board">Board</TabsTrigger><TabsTrigger value="list">List</TabsTrigger></TabsList>
        {newButton ? <TabsContent value="board" className="contents">{newButton}</TabsContent> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Funnel filters">
        <Input className="w-52" aria-label="Search funnels" placeholder="Search funnels or accounts…" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
        <label className="flex items-center gap-1 text-sm">Owner
          <select className={selectClass} value={filters.ownerId} onChange={(event) => setFilter("ownerId", event.target.value)}>
            <option value="">All owners</option>
            {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        {memberId ? <Button type="button" size="sm" variant={filters.ownerId === memberId ? "secondary" : "outline"} onClick={() => setFilter("ownerId", filters.ownerId === memberId ? "" : memberId)}>My funnels</Button> : null}
        <label className="flex items-center gap-1 text-sm">Stage
          <select className={selectClass} value={filters.stageId} onChange={(event) => setFilter("stageId", event.target.value)}>
            <option value="">All stages</option>
            {stages.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">Status
          <select className={selectClass} value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        {(filters.ownerId || filters.stageId || filters.status || filters.search) ? <Button type="button" size="sm" variant="ghost" onClick={() => setFilters({ ownerId: "", stageId: "", status: "", search: "" })}>Clear filters</Button> : null}
      </div>
      <TabsContent value="board" className="pt-2"><OpportunitiesBoard data={visibleRows} pipelines={pipelines} canAdvance={canAdvance} customFieldDefs={customFieldDefs} /></TabsContent>
      <TabsContent value="list" className="pt-2"><OpportunitiesTable data={visibleRows} toolbar={newButton} /></TabsContent>
    </Tabs>
  )
}
