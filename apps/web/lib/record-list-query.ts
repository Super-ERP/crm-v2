import { validateFilterValue } from "@/lib/data-table-filters"
import { normalizeTablePageSize, type ServerTableQuery } from "@/lib/table-pagination"

export type RecordListQuery = {
  search: string
  sort?: { id: string; desc: boolean }
  selections: Record<string, string[]>
}

/** Bounds client-controlled paging, sorting, and selection values for list readers. */
export function normalizeRecordListQuery(
  input: ServerTableQuery,
  allowedSorts: readonly string[],
  allowedSelections: readonly string[]
) {
  const limit = normalizeTablePageSize(input.pageSize)
  const pageIndex = Number.isSafeInteger(input.pageIndex)
    ? Math.max(0, Math.min(input.pageIndex, 100_000))
    : 0
  const query: RecordListQuery = {
    search: typeof input.search === "string" ? input.search.trim().slice(0, 100) : "",
    selections: {},
  }
  const sort = Array.isArray(input.sorting) ? input.sorting[0] : undefined
  if (sort && allowedSorts.includes(sort.id)) query.sort = { id: sort.id, desc: sort.desc === true }
  for (const filter of Array.isArray(input.filters) ? input.filters : []) {
    if (!allowedSelections.includes(filter.id)) continue
    const parsed = validateFilterValue(filter.value)
    if (!parsed.success) continue
    if (parsed.value.type === "boolean") {
      if (parsed.value.value != null) query.selections[filter.id] = [String(parsed.value.value)]
      continue
    }
    if (!["enum", "relation"].includes(parsed.value.type)) continue
    const raw = parsed.value.type === "enum" || parsed.value.type === "relation"
      ? parsed.value.value
      : null
    query.selections[filter.id] = (Array.isArray(raw) ? raw : [raw])
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .slice(0, 100)
  }
  return { limit, offset: pageIndex * limit, query }
}
