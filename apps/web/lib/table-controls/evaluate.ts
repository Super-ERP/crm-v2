import type { FilterContext, FilterGroup, FilterNode, TableFieldDefinition } from "./types"
import { filterDateRange } from "./date-range"
export function tableScalar(value: unknown): unknown {
  if (value && typeof value==='object' && !(value instanceof Date) && !Array.isArray(value)) {
    const v=value as Record<string,unknown>; return v.label??v.name??v.id??null
  }
  return value
}
export function evaluateFilterTree(row: unknown, tree: FilterGroup, fields: readonly TableFieldDefinition[], context: FilterContext, valueFor?: (row:unknown,field:string)=>unknown): boolean {
  const byId=new Map(fields.map(f=>[f.id,f]))
  function match(node:FilterNode):boolean {
    if(node.kind==='group')return !node.children.length|| (node.logic==='and'?node.children.every(match):node.children.some(match))
    const field=byId.get(node.fieldId);if(!field)throw new Error('Unavailable filter field')
    const raw=valueFor?valueFor(row,node.fieldId):(row as Record<string,unknown>)[node.fieldId]
    const value=tableScalar(raw), empty=value==null||value===''||(Array.isArray(value)&&!value.length)
    const op=node.operator,v=node.value
    if(op==='empty')return empty
    if(op==='not-empty')return !empty
    if(empty)return false
    if(field.type==='date'){
      let date:string
      if(value instanceof Date || String(value).includes('T') || String(value).includes(' ')){
        const d=new Date(value as string|Date);if(Number.isNaN(d.getTime()))return false
        const p=new Intl.DateTimeFormat('en-CA',{timeZone:context.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d)
        const get=(type:string)=>p.find(x=>x.type===type)!.value;date=`${get('year')}-${get('month')}-${get('day')}`
      } else date=String(value).slice(0,10)
      const [from,to]=filterDateRange(node,context);return (!from||date>=from)&&(!to||date<to)
    }
    if(field.type==='number'||field.type==='money'){
      const n=Number(value);if(!Number.isFinite(n))return false
      const money=v as {currency:string;amount:number;min:number;max:number}
      if(field.type==='money'&&String((row as Record<string,unknown>).currency??'')!==money.currency)return false
      const expected=field.type==='money'?money.amount:Number(v)
      if(op==='between'){const range=field.type==='money'?[money.min,money.max]:v as number[];return n>=range[0]&&n<=range[1]}
      if(op==='equals')return n===expected;if(op==='not-equals')return n!==expected
      if(op==='greater-than')return n>expected;if(op==='greater-or-equal')return n>=expected
      if(op==='less-than')return n<expected;return n<=expected
    }
    if(field.type==='boolean')return value===v
    const values=(Array.isArray(value)?value:[value]).map(x=>String(tableScalar(x)).toLocaleLowerCase())
    const target=String(v).toLocaleLowerCase()
    if(op==='any-of'||op==='none-of'){
      const choices=(v as string[]).map(x=>x.toLocaleLowerCase())
      const found=values.some(x=>choices.includes(x));return op==='any-of'?found:!found
    }
    if(op==='equals')return values.some(x=>x===target)
    if(op==='not-equals')return values.every(x=>x!==target)
    if(op==='contains')return values.some(x=>x.includes(target))
    if(op==='not-contains')return values.every(x=>!x.includes(target))
    if(op==='starts-with')return values.some(x=>x.startsWith(target))
    return values.some(x=>x.endsWith(target))
  }
  return match(tree)
}
