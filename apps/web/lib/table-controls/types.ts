export type TableFieldType = "text" | "number" | "money" | "date" | "boolean" | "enum" | "relation" | "action"
export type FilterOperator = "contains" | "not-contains" | "equals" | "not-equals" | "starts-with" | "ends-with" | "greater-than" | "greater-or-equal" | "less-than" | "less-or-equal" | "between" | "on" | "before" | "after" | "year" | "relative" | "any-of" | "none-of" | "empty" | "not-empty"
export type FilterCondition = { kind: "condition"; id: string; fieldId: string; operator: FilterOperator; value?: unknown }
export type FilterGroup = { kind: "group"; id: string; logic: "and" | "or"; children: FilterNode[] }
export type FilterNode = FilterCondition | FilterGroup
export type TableLayout = { visibility: Record<string, boolean>; order: string[]; widths: Record<string, number>; pinning: { left: string[]; right: string[] } }
export type TableStateV2 = { version: 2; filterTree: FilterGroup; layout: TableLayout }
export type FilterContext = { now: Date; timezone: string }
export type TableFieldDefinition = {
  id: string; label: string; type: TableFieldType; operators: readonly FilterOperator[]
  sortable: boolean; defaultVisible: boolean; minWidth: number; defaultWidth: number; required?: boolean
  options?: readonly { value: string; label: string }[]
}
export type ValidatedTableQuery = { tree: FilterGroup; pageIndex: number; pageSize: number; sorting: { id: string; desc: boolean }[]; search: string; context: FilterContext }
export const EMPTY_FILTER_TREE: FilterGroup = { kind: "group", id: "root", logic: "and", children: [] }
export const EMPTY_LAYOUT: TableLayout = { visibility: {}, order: [], widths: {}, pinning: { left: [], right: [] } }
