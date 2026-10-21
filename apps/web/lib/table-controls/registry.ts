import catalog from "./catalog.json"
import { FIELD_TYPES } from "./field-types"
import type { FilterOperator, TableFieldDefinition, TableFieldType } from "./types"
export const TABLE_CATALOG = catalog
const REQUIRED_IDENTIFIERS:Record<string,string>={'account-quotations':'quoteNumber','opp-quotations':'quoteNumber','funnel-quotes':'quoteNumber','opp-products':'description','product-usage':'quoteNumber','product-deals':'opportunityName','so-milestones':'title','so-finance-docs':'number','funnel-costs':'supplierName','settings-funnel-stages':'name'}
const FIELD_LABELS:Record<string,string>={accountId:'Account',accountOwnerMemberId:'Account owner',opportunityId:'Opportunity',funnelId:'Funnel',ownerName:'Owner',primary:'Primary',totalEstimatedFunnelAmount:'Estimated funnel amount',recordCode:'Code',crmProjectCode:'CRM code',crossDealProjectCode:'Cross-deal reference',crossDealProjectCodes:'Cross-deal references',relationship:'Relationship',from:'From',amountBase:'Amount in base currency'}
/** Use the same labels in headers, column selection, filters and saved views. */
const TABLE_FIELD_LABELS: Record<string, Record<string, string>> = {
  "project-codes": { code: "Project code", relationship: "Used as", funnelCount: "Linked funnels", accountName: "Account", funnelName: "Funnel", ownerName: "Owner", stageName: "Stage", totalEstimatedFunnelAmount: "Est. amount", expectedCloseDate: "Earliest expected close date" },
  "project-code-funnels": { name: "Funnel", stageName: "Stage", estimatedAmount: "Est. amount" },
  "code-opportunities": { name: "Opportunity" },
  "code-quotations": { name: "Quotation" },
  "code-accounts": { name: "Account", role: "Relationship", status: "Type" },
  "code-contacts": { name: "Contact", title: "Designation" },
  "code-projects": { name: "Project" },
}
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
    return { id, label: TABLE_FIELD_LABELS[listKey]?.[id] ?? (listKey === "funnel" && id === "id" ? "Funnel" : FIELD_LABELS[id] ?? id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())), type, operators: id === "order" ? [] : FIELD_OPERATORS[type],
      required: id === (REQUIRED_IDENTIFIERS[listKey] ?? (entry.fields.includes("name") ? "name" : entry.fields[0])) || type === "action", sortable: type !== "action", defaultVisible: !["crossDealProjectCode", "crossDealProjectCodes"].includes(id) && !(listKey === "project-code-funnels" && ["relationship", "account", "opportunity"].includes(id)), minWidth: 48, defaultWidth: type === "action" ? 56 : id === "description" ? 260 : id === "subcategory" ? 220 : id === "productCode" ? 200 : ["name", "title", "id"].includes(id) ? 280 : ["uom", "unit"].includes(id) ? 88 : type === "relation" ? 200 : type === "money" || type === "date" ? 168 : type === "boolean" ? 96 : type === "enum" ? 120 : 160 }
  })
}
