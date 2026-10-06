"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FunnelWithStages } from "@/lib/lookups"
import type { CustomFunnelField } from "@/lib/stage-gate"
import type { OpportunityListRow } from "./actions"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { OpportunitiesBoard } from "./funnels-board"
import { OpportunitiesTable } from "./funnels-table"

export function FunnelViews({ initialPage, filterOptions, pipelines, canAdvance, customFieldDefs, newButton }: {
  initialPage: { rows: OpportunityListRow[]; total: number }
  filterOptions: {
    expectedCloseYears: Array<{ value: string; label: string }>;
    accounts: Array<{ value: string; label: string }>; opportunities: Array<{ value: string; label: string }>;
    funnels: Array<{ value: string; label: string }>; accountOwners: Array<{ value: string; label: string }>;
    owners: Array<{ value: string; label: string }>; stages: Array<{ value: string; label: string }>;
  }
  pipelines: FunnelWithStages[]
  canAdvance: boolean
  customFieldDefs: CustomFunnelField[]
  memberId: string | null
  newButton?: React.ReactNode
}) {
  const [view, setView] = React.useState("board")

  return (
    <div className="space-y-3">
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>
      <OpportunitiesTable
        initialPage={initialPage}
        filterOptions={filterOptions}
        toolbar={newButton}
        renderBoard={view === "board" ? (_filteredRows, query: ServerTableQuery) => (
          <OpportunitiesBoard
            key={JSON.stringify({ search: query.search, sorting: query.sorting, filters: query.filters })}
            query={query}
            pipelines={pipelines}
            canAdvance={canAdvance}
            customFieldDefs={customFieldDefs}
          />
        ) : undefined}
      />
    </div>
  )
}
