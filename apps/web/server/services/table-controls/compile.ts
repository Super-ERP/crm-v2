import 'server-only'
import { and, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm'
import { validateFilterTree } from '@/lib/table-controls/filter-tree'
import { filterDateRange } from '@/lib/table-controls/date-range'
import type { FilterContext, FilterNode, TableFieldDefinition } from '@/lib/table-controls/types'
export type SqlTableField = { field: TableFieldDefinition; expression: SQLWrapper; searchExpression?: SQLWrapper; currency?: SQLWrapper; moneyBuckets?: SQLWrapper; dateOnly?: boolean; array?: boolean }
export type SqlFieldRegistry = Record<string, SqlTableField>
export function compileFilterTree(input: unknown, registry: SqlFieldRegistry, context: FilterContext): SQL {
  const tree=validateFilterTree(input,Object.values(registry).map(v=>v.field))
  function compile(node:FilterNode):SQL {
    if(node.kind==='group'){
      if(!node.children.length)return sql`true`
      return (node.logic==='and'?and(...node.children.map(compile)):or(...node.children.map(compile)))!
    }
    const f=registry[node.fieldId], op=node.operator, v=node.value
    const e = f.searchExpression && ["contains","not-contains","starts-with","ends-with"].includes(op) ? f.searchExpression : f.expression
    const text=sql`${e}::text`
    const notEmpty=f.moneyBuckets?sql`(${e} IS NOT NULL OR jsonb_array_length(coalesce(${f.moneyBuckets},'[]'::jsonb))>0)`:f.field.type==='text'||f.field.type==='enum'||f.field.type==='relation'
      ? f.array?sql`EXISTS (SELECT 1 FROM unnest(${e}) filter_value WHERE filter_value IS NOT NULL AND filter_value::text <> '')`:sql`nullif(${text},'') IS NOT NULL`:sql`${e} IS NOT NULL`
    if(op==='empty')return sql`NOT (${notEmpty})`
    if(op==='not-empty')return notEmpty
    let predicate:SQL
    if(f.field.type==='date'){
      const date=f.dateOnly?sql`${e}::date`:sql`(${e}::timestamptz AT TIME ZONE ${context.timezone})::date`
      if(op==='year')predicate=sql`extract(year from ${date})=${v}`
      else if(op==='on')predicate=sql`${date}=${String(v)}::date`
      else if(op==='before')predicate=sql`${date}<${String(v)}::date`
      else if(op==='after')predicate=sql`${date}>${String(v)}::date`
      else if(op==='between'){const [from,to]=v as string[];predicate=sql`${date}>=${from}::date AND ${date}<=${to}::date`}
      else {const [from,to]=filterDateRange(node,context);predicate=and(from?sql`${date}>=${from}::date`:undefined,to?sql`${date}<${to}::date`:undefined)!}
    } else if(f.field.type==='number'||f.field.type==='money'){
      const m=v as {amount:number;min:number;max:number;currency:string}
      const expected=f.field.type==='money'?m.amount:v
      const n=f.moneyBuckets ? sql`CASE WHEN jsonb_array_length(coalesce(${f.moneyBuckets},'[]'::jsonb))>0 THEN
        (SELECT (bucket->>'total')::numeric FROM jsonb_array_elements(${f.moneyBuckets}) bucket WHERE bucket->>'currency'=${m.currency} LIMIT 1)
        ELSE CASE WHEN ${f.currency}=${m.currency} THEN ${e}::numeric END END` : sql`${e}::numeric`
      if(op==='between'){
        const [min,max]=f.field.type==='money'?[m.min,m.max]:v as number[];predicate=sql`${n}>=${min} AND ${n}<=${max}`
      } else if(op==='equals')predicate=sql`${n}=${expected}`
      else if(op==='not-equals')predicate=sql`${n}<>${expected}`
      else if(op==='greater-than')predicate=sql`${n}>${expected}`
      else if(op==='greater-or-equal')predicate=sql`${n}>=${expected}`
      else if(op==='less-than')predicate=sql`${n}<${expected}`
      else predicate=sql`${n}<=${expected}`
      if(f.field.type==='money'){
        if(!f.currency)throw new Error(`Currency is unavailable for ${f.field.label}`)
        if(!f.moneyBuckets)predicate=and(sql`${f.currency}=${m.currency}`,predicate)!
      }
    } else if(f.field.type==='boolean')predicate=sql`${e}=${v}`
    else {
      if(f.array){
        const arrayExpression=sql`ARRAY(SELECT lower(filter_value::text) FROM unnest(${e}) filter_value WHERE filter_value IS NOT NULL AND filter_value::text <> '')`
        const choices=op==='any-of'||op==='none-of'?v as string[]:[String(v)]
        if(['any-of','none-of','equals','not-equals'].includes(op)){
          const items=sql.join(choices.map(x=>sql`${x.toLocaleLowerCase()}`),sql`, `)
          const match=sql`${arrayExpression} && ARRAY[${items}]::text[]`
          predicate=op==='none-of'||op==='not-equals'?sql`NOT (${match})`:match
        }else{
          const escaped=String(v).replace(/[\\%_]/g,'\\$&')
          const pattern=op==='starts-with'?escaped+'%':op==='ends-with'?'%'+escaped:'%'+escaped+'%'
          const match=sql`EXISTS (SELECT 1 FROM unnest(${e}) filter_value WHERE filter_value::text ILIKE ${pattern})`
          predicate=op==='not-contains'?sql`NOT (${match})`:match
        }
      } else if(op==='any-of'||op==='none-of'){
        const items=sql.join((v as string[]).map(x=>sql`${x.toLocaleLowerCase()}`),sql`, `)
        const match=sql`lower(${text}) IN (${items})`;predicate=op==='none-of'?sql`NOT (${match})`:match
      } else if(op==='equals')predicate=sql`lower(${text})=lower(${String(v)})`
      else if(op==='not-equals')predicate=sql`lower(${text})<>lower(${String(v)})`
      else {
        const escaped=String(v).replace(/[\\%_]/g,'\\$&')
        const pattern=op==='starts-with'?escaped+'%':op==='ends-with'?'%'+escaped:'%'+escaped+'%'
        const match=sql`${text} ILIKE ${pattern}`;predicate=op==='not-contains'?sql`NOT (${match})`:match
      }
    }
    return and(notEmpty,predicate)!
  }
  return compile(tree)
}
