import { describe, expect, it } from "vitest"
import { filterFunnelRows } from "@/app/(app)/funnel/funnel-view-filter"
import type { OpportunityListRow } from "@/app/(app)/funnel/actions"

const rows = [
  { id: "a", name: "Renewal", accountName: "Acme", ownerMemberId: "rep-a", stageId: "prospect", status: "open" },
  { id: "b", name: "Expansion", accountName: "Beta", ownerMemberId: "rep-b", stageId: "prospect", status: "open" },
  { id: "c", name: "License", accountName: "Acme", ownerMemberId: "rep-a", stageId: "won", status: "closed" },
] as OpportunityListRow[]

describe("shared funnel view filter", () => {
  it("combines owner, stage and status by stable IDs", () => {
    expect(filterFunnelRows(rows, { ownerId: "rep-a", stageId: "prospect", status: "open", search: "acme" }).map((row) => row.id)).toEqual(["a"])
    expect(filterFunnelRows(rows, { ownerId: "rep-a", stageId: "", status: "", search: "" }).map((row) => row.id)).toEqual(["a", "c"])
  })
})
