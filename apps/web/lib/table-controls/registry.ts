import catalog from "./catalog.json"
import { FIELD_TYPES } from "./field-types"
import type { FilterOperator, TableFieldDefinition, TableFieldType } from "./types"
export const TABLE_CATALOG = catalog
const empty: FilterOperator[] = ["empty", "not-empty"]
export const FIELD_OPERATORS: Record<TableFieldType, readonly FilterOperator[]> = {
  text: ["contains", "not-contains", "equals", "not-equals", "starts-with", "ends-with", ...empty],
  number: ["equals", "not-equals", "greater-than", "greater-or-equal", "less-than", "less-or-equal", "between", ...empty],
  money: ["equals", "not-equals", "greater-than", "greater-or-equal", "less-than", "less-or-equal", "between", ...empty],
  date: ["on", "before", "after", "between", "year", "relative", ...empty],
  boolean: ["equals", ...empty], enum: ["any-of", "none-of", ...empty], relation: ["contains", "equals", "any-of", "none-of", ...empty], action: [],
}
export function tableExists(listKey: string) { return catalog.some(entry => entry.keys.includes(listKey)) }
export function getTableFields(listKey: string, columnIds?: readonly string[]): TableFieldDefinition[] {
  const entry = catalog.find(entry => entry.keys.includes(listKey))
  if (!entry) throw new Error("Unknown table")
  const ids = columnIds ?? entry.fields
  return ids.map(id => {
    const type = FIELD_TYPES[id]
    if (!entry.fields.includes(id) || !type) throw new Error(`Unavailable table field: ${id}`)
    return { id, label: id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()), type, operators: FIELD_OPERATORS[type],
      required: id === entry.fields[0] || type === "action", sortable: type !== "action", defaultVisible: true, minWidth: 48, defaultWidth: type === "action" ? 80 : 160 }
  })
}
