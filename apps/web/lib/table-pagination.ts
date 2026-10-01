import type { DataTableFilterValue } from "@/lib/data-table-filters"

export const TABLE_PAGE_SIZES = [25, 50, 100] as const
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number]

export function normalizeTablePageSize(value: unknown): TablePageSize {
  const size = Number(value)
  return TABLE_PAGE_SIZES.find((option) => option === size) ?? 25
}

export type ServerTableQuery = {
  pageIndex: number
  pageSize: number
  search: string
  sorting: Array<{ id: string; desc: boolean }>
  filters: Array<{ id: string; value: DataTableFilterValue }>
}
