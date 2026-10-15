import type { FilterCondition, FilterGroup, FilterNode, TableFieldDefinition } from "./types"
export const RELATIVE_PERIODS = ["today", "this-month", "last-month", "this-year", "last-year", "last-30-days"] as const
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4))===0) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value
}
function record(input: unknown): input is Record<string, unknown> { return typeof input === 'object' && input !== null && !Array.isArray(input) }
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export function validateFilterTree(input: unknown, fields: readonly TableFieldDefinition[]): FilterGroup {
  const serialized = JSON.stringify(input)
  if (!serialized || new TextEncoder().encode(serialized).length > 32768) throw new Error('Filter exceeds the 32 KiB limit')
  const byId = new Map(fields.map(f => [f.id,f])), ids = new Set<string>()
  let conditions=0
  function visit(node: unknown, depth: number): FilterNode {
    if (!record(node) || typeof node.id !== 'string' || !node.id || node.id.length > 100 || ids.has(node.id)) throw new Error('Invalid or duplicate filter identifier')
    ids.add(node.id)
    if (node.kind === 'group') {
      if (depth > 5 || !['and','or'].includes(String(node.logic)) || !Array.isArray(node.children) || (depth > 1 && !node.children.length)) throw new Error('Invalid group: use AND/OR and at most five nested levels')
      if (Object.keys(node).some(key => !['kind','id','logic','children'].includes(key))) throw new Error('Unknown group setting')
      return { kind:'group',id:node.id,logic:node.logic as 'and'|'or',children:node.children.map(child=>visit(child,depth+1)) }
    }
    if (node.kind !== 'condition' || ++conditions > 50 || Object.keys(node).some(key=>!['kind','id','fieldId','operator','value'].includes(key))) throw new Error('Invalid condition or more than 50 conditions')
    const field=byId.get(String(node.fieldId)), op=String(node.operator), v=node.value
    if (!field || !field.operators.includes(op as FilterCondition['operator'])) throw new Error(`Unavailable field or operator: ${String(node.fieldId)}`)
    const fail=()=>{throw new Error(`Invalid ${field.label} filter value`)}
    if (op !== 'empty' && op !== 'not-empty') {
      if (field.type === 'money') {
        if (!record(v) || typeof v.currency!=='string' || !/^[A-Z]{3}$/.test(v.currency)) fail()
        const money=v as Record<string,unknown>
        if (op==='between' ? !finite(money.min)||!finite(money.max)||money.min>money.max : !finite(money.amount)) fail()
      } else if (field.type === 'number') {
        if (op==='between' ? !Array.isArray(v)||v.length!==2||!finite(v[0])||!finite(v[1])||v[0]>v[1] : !finite(v)) fail()
      } else if (field.type === 'date') {
        if (op==='year') { if (!Number.isInteger(v) || Number(v)<1 || Number(v)>9999) fail() }
        else if (op==='relative') { if (!RELATIVE_PERIODS.includes(v as typeof RELATIVE_PERIODS[number])) fail() }
        else if (op==='between') { if (!Array.isArray(v)||v.length!==2||!isCalendarDate(v[0])||!isCalendarDate(v[1])||v[0]>v[1]) fail() }
        else if (!isCalendarDate(v)) fail()
      } else if (field.type === 'boolean') { if (typeof v!=='boolean') fail() }
      else if (op==='any-of'||op==='none-of') {
        if (!Array.isArray(v)||!v.length||v.length>100||v.some(x=>typeof x!=='string'||!x.trim()||x.length>1000)) fail()
      } else if (typeof v!=='string'||!v.trim()||v.length>1000) fail()
    }
    return {kind:'condition',id:node.id,fieldId:field.id,operator:op as FilterCondition['operator'],...(v===undefined?{}:{value:v})}
  }
  const result=visit(input,1)
  if(result.kind!=='group') throw new Error('The filter root must be a group')
  return result
}
