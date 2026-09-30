import type { OpportunityListRow } from "./actions"

export type FunnelViewFilters = { ownerId: string; stageId: string; status: string; search: string }

export function filterFunnelRows(rows: OpportunityListRow[], filters: FunnelViewFilters) {
  const query = filters.search.trim().toLocaleLowerCase()
  return rows.filter((row) =>
    (!filters.ownerId || row.ownerMemberId === filters.ownerId) &&
    (!filters.stageId || row.stageId === filters.stageId) &&
    (!filters.status || row.status === filters.status) &&
    (!query || `${row.name} ${row.accountName ?? ""}`.toLocaleLowerCase().includes(query))
  )
}
