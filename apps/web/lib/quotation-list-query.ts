import { getTableFields } from "@/lib/table-controls/registry"
import { validateFilterTree } from "@/lib/table-controls/filter-tree"
import { validateFilterValue } from "@/lib/data-table-filters"
import type { QuotationListQuery } from "@/lib/api-readers"
import { normalizeTablePageSize, type ServerTableQuery } from "@/lib/table-pagination"
import type { QuotationStatus } from "@/lib/quotation-transitions"

const SORT_COLUMNS = new Set([
  "quoteNumber", "accountId", "accountOwnerMemberId", "opportunityId", "funnelId",
  "lineItemCount", "subtotal", "taxTotal", "total", "status", "validUntil",
])
const STATUSES = new Set<QuotationStatus>([
  "draft", "pending_approval", "approved", "sent", "accepted", "rejected", "expired", "void",
])

export function normalizeQuotationListQuery(input: ServerTableQuery) {
  if (input.sorting?.length > 5) throw new Error("Use at most five sort fields.")
  const limit = normalizeTablePageSize(input.pageSize)
  const pageIndex = Number.isSafeInteger(input.pageIndex)
    ? Math.max(0, Math.min(input.pageIndex, 100_000))
    : 0
  const query: QuotationListQuery = {
    ...(input.filterTree ? {filterTree:validateFilterTree(input.filterTree,getTableFields("quotations"))} : {}),
    sorting: (Array.isArray(input.sorting)?input.sorting:[]).filter(sort=>SORT_COLUMNS.has(sort.id)).map(sort=>({id:sort.id,desc:sort.desc===true})),
    search: typeof input.search === "string" ? input.search.trim().slice(0, 100) : "",
  }
  const firstSort = Array.isArray(input.sorting) ? input.sorting[0] : undefined
  if (firstSort && SORT_COLUMNS.has(firstSort.id)) {
    query.sort = { id: firstSort.id, desc: firstSort.desc === true }
  }

  for (const filter of Array.isArray(input.filters) ? input.filters : []) {
    const parsed = validateFilterValue(filter.value)
    if (!parsed.success) continue
    const value = parsed.value
    if (value.type === "relation" && ["accountId", "accountOwnerMemberId", "opportunityId", "funnelId"].includes(filter.id)) {
      const ids = (Array.isArray(value.value) ? value.value : [value.value])
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 100)
      if (filter.id === "accountId") query.accountIds = ids
      if (filter.id === "accountOwnerMemberId") query.accountOwnerIds = ids
      if (filter.id === "opportunityId") query.opportunityIds = ids
      if (filter.id === "funnelId") query.funnelIds = ids
    }
    if (filter.id === "status" && value.type === "enum") {
      query.statuses = (value.value ?? [])
        .filter((status): status is QuotationStatus => STATUSES.has(status as QuotationStatus))
        .slice(0, 8)
    }
  }
  return { limit, offset: pageIndex * limit, query }
}
