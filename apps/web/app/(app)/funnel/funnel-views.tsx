"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FunnelWithStages } from "@/lib/lookups"
import type { CustomFunnelField } from "@/lib/stage-gate"
import type { OpportunityListRow } from "./actions"
import { OpportunitiesBoard } from "./funnels-board"
import { OpportunitiesTable } from "./funnels-table"

export function FunnelViews({ rows, pipelines, canAdvance, customFieldDefs, newButton }: {
  rows: OpportunityListRow[]
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
        data={rows}
        toolbar={newButton}
        renderBoard={view === "board" ? (filteredRows) => (
          <OpportunitiesBoard
            data={filteredRows}
            pipelines={pipelines}
            canAdvance={canAdvance}
            customFieldDefs={customFieldDefs}
          />
        ) : undefined}
      />
    </div>
  )
}
