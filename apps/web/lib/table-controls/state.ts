import { EMPTY_FILTER_TREE, EMPTY_LAYOUT, type FilterGroup, type TableStateV2 } from './types'
import type { DataTableFilterValue } from '@/lib/data-table-filters'
export function legacyFiltersToTree(filters: Record<string,DataTableFilterValue|readonly string[]>):FilterGroup {
  return {...EMPTY_FILTER_TREE,children:Object.entries(filters).flatMap(([fieldId,raw])=>{
    const value=Array.isArray(raw)?{type:'enum' as const,value:raw}:raw as DataTableFilterValue
    let operand:unknown=('value' in value)?value.value:undefined
    let operator:string='operator' in value?String(value.operator):'equals'
    if(value.type==='enum'||value.type==='relation') {operator='any-of';operand=Array.isArray(operand)?operand:operand==null?[]:[operand]}
    if(operator==='between')operand=value.type==='date'?[value.from,value.to]:value.type==='number'||value.type==='money'?[value.min,value.max]:operand
    if(operand==null||operand===''||(Array.isArray(operand)&&(!operand.length||operand.some(v=>v==null||v===''))))return []
    return [{kind:'condition' as const,id:`legacy-${fieldId}`,fieldId,operator:operator as import('./types').FilterOperator,value:operand}]
  })}
}
/** Compatibility preserves old filters; field-aware validation happens before application. */
export function readLegacyTableState(input: { tableState?: TableStateV2; filters?: {columns?:Record<string,DataTableFilterValue|readonly string[]>}; visibility?:Record<string,boolean> }):TableStateV2 {
  return input.tableState??{version:2,filterTree:legacyFiltersToTree(input.filters?.columns??{}),layout:{...EMPTY_LAYOUT,visibility:input.visibility??{}}}
}

import { z } from 'zod'
import { validateFilterTree } from './filter-tree'
import type { TableFieldDefinition, TableLayout } from './types'

const ids = z.array(z.string().min(1).max(100)).max(500)
export const tableLayoutSchema = z.object({
  visibility: z.record(z.string().min(1).max(100), z.boolean()).default({}),
  order: ids.default([]),
  widths: z.record(z.string().min(1).max(100), z.number().finite()).default({}),
  pinning: z.object({left: ids, right: ids}).strict().default({left:[],right:[]}),
}).strict()

/** Reconcile obsolete layout columns; filters deliberately use stricter validation. */
export function normalizeTableLayout(input: unknown, fields: readonly TableFieldDefinition[]): TableLayout {
  const parsed = tableLayoutSchema.parse(input)
  const known = new Set(fields.map(field=>field.id))
  const uniqueKnown = (values: string[]) => [...new Set(values)].filter(id=>known.has(id))
  const order = uniqueKnown(parsed.order)
  for (const field of fields) if (!order.includes(field.id)) order.push(field.id)
  const left = uniqueKnown(parsed.pinning.left)
  return {
    visibility: Object.fromEntries(Object.entries(parsed.visibility).filter(([id])=>known.has(id)).map(([id,visible])=>[id,fields.find(f=>f.id===id)?.required ? true : visible])),
    order,
    widths: Object.fromEntries(Object.entries(parsed.widths).filter(([id])=>known.has(id)).map(([id,width])=>[id,Math.max(48,Math.min(800,width))])),
    pinning: {left,right:uniqueKnown(parsed.pinning.right).filter(id=>!left.includes(id))},
  }
}

export function validateTableState(input: unknown, fields: readonly TableFieldDefinition[]): TableStateV2 {
  const parsed = z.object({version:z.literal(2),filterTree:z.unknown(),layout:tableLayoutSchema}).strict().parse(input)
  return {version:2,filterTree:validateFilterTree(parsed.filterTree,fields),layout:normalizeTableLayout(parsed.layout,fields)}
}

/** Quick controls and legacy views become conditions in the same nested model. */
export function mergeQuickFilterTree(tree:FilterGroup,filters:Record<string,DataTableFilterValue|readonly string[]>,fields:readonly TableFieldDefinition[]):FilterGroup {
  let sequence=0
  const nodes:import('./types').FilterNode[]=[]
  const condition=(fieldId:string,operator:import('./types').FilterOperator,value:unknown):import('./types').FilterCondition=>({kind:'condition',id:`quick-condition-${sequence++}`,fieldId,operator,value})
  for(const [fieldId,raw] of Object.entries(filters)) {
    const field=fields.find(f=>f.id===fieldId)
    if(!field)continue // Unregistered legacy shortcuts retain their separate server predicate.
    const source=legacyFiltersToTree({[fieldId]:raw}).children[0]
    if(!source||source.kind!=='condition')continue
    const value=source.value
    const choices=Array.isArray(value)?value:[]
    if(source.operator==='any-of'&&field.type==='date') {
      nodes.push({kind:'group',id:`quick-group-${sequence++}`,logic:'or',children:choices.map(year=>condition(fieldId,'year',Number(year)))})
    }else if(source.operator==='any-of'&&field.type==='boolean') {
      nodes.push({kind:'group',id:`quick-group-${sequence++}`,logic:'or',children:choices.map(choice=>condition(fieldId,'equals',choice==='true'||choice==='Primary'||choice==='Yes'))})
    }else if(source.operator==='any-of'&&field.type==='text') {
      nodes.push({kind:'group',id:`quick-group-${sequence++}`,logic:'or',children:choices.map(choice=>condition(fieldId,'equals',choice))})
    }else if(field.type==='money') {
      if(!field.currency)throw new Error(`Choose an explicit currency for the ${field.label} filter in Advanced filters.`)
      nodes.push(condition(fieldId,source.operator,source.operator==='between'?{currency:field.currency,min:choices[0],max:choices[1]}:{currency:field.currency,amount:value}))
    }else nodes.push(condition(fieldId,source.operator,value))
  }
  if(!nodes.length)return tree
  // IDs are internal identifiers only; preserve structure while avoiding collisions with saved IDs.
  const reidentify=(node:import('./types').FilterNode):import('./types').FilterNode=>node.kind==='group'?{...node,id:`merged-${sequence++}`,children:node.children.map(reidentify)}:{...node,id:`merged-${sequence++}`}
  return validateFilterTree(reidentify({kind:'group',id:'combined',logic:'and',children:[...(tree.children.length?[tree]:[]),...nodes]}) as FilterGroup,fields)
}
