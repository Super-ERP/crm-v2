import type { ServerTableQuery } from '@/lib/table-pagination'
import { formatTableField } from './values'
import type { TableFieldDefinition } from './types'
export const MAX_TABLE_EXPORT_ROWS=100_000
export type ExportColumn<T>={field:TableFieldDefinition;value:(row:T)=>unknown;currency?:(row:T)=>string|undefined}
function cell(value:string,numeric=false):string {
  const plainNumber=numeric&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)
  const safe=!plainNumber&&/^[\s\u0000-\u001f]*[=+@-]/.test(value)?`'${value}`:value
  return `"${safe.replaceAll('"','""')}"`
}
export function tableCsv<T>(rows:readonly T[],columns:readonly ExportColumn<T>[],timezone:string):string {
  const output=columns.filter(column=>column.field.type!=='action')
  const headers=output.flatMap(column=>column.field.type==='money'?[column.field.label,`${column.field.label} currency`]:[column.field.label])
  const lines=rows.map(row=>output.flatMap(column=>{
    const raw=column.value(row)
    let value=formatTableField(raw,column.field,timezone)
    if(column.field.type==='money'){
      let currency=column.field.currency??column.currency?.(row)??''
      if(Array.isArray(raw)&&raw.length===1&&raw[0]&&typeof raw[0]==='object'&&'total' in raw[0]){value=String(raw[0].total);currency=String(raw[0].currency??'')}
      else if(Array.isArray(raw))currency=raw.length?'Multiple':''
      return [cell(value,true),cell(value?currency:'')]
    }
    return [cell(value,column.field.type==='number')]
  }).join(','))
  return '\uFEFF'+[headers.map(value=>cell(value)).join(','),...lines].join('\r\n')
}
/** Reuse the panel loader, including parent scope, auth, filters and order. Fail closed on partial results. */
export async function collectTableExport<T>(query:ServerTableQuery,loadPage:(query:ServerTableQuery)=>Promise<{rows:T[];total:number}>):Promise<T[]> {
  const rows:T[]=[]
  let total:number|undefined
  const identities=new Set<string>()
  for(let pageIndex=0;;pageIndex++){
    const page=await loadPage({...query,pageIndex,pageSize:100})
    if(!Number.isSafeInteger(page.total)||page.total<0)throw new Error('The export returned an invalid record count.')
    if(total===undefined){total=page.total;if(total>MAX_TABLE_EXPORT_ROWS)throw new Error(`This export exceeds ${MAX_TABLE_EXPORT_ROWS.toLocaleString()} rows. Add filters and try again.`)}
    if(total!==page.total)throw new Error('Records changed during export. Please try again.')
    if(rows.length+page.rows.length>total)throw new Error('Records changed during export. Please try again.')
    for(const row of page.rows){
      const record=row as {id?:unknown;quotationId?:unknown;code?:unknown}
      const id=record.id??record.quotationId??record.code
      if(typeof id==='string'){
        if(identities.has(id))throw new Error('Records changed during export. Please try again.')
        identities.add(id)
      }
    }
    rows.push(...page.rows)
    if(rows.length===total)return rows
    if(!page.rows.length)throw new Error('The export stopped before all matching rows were loaded. Please try again.')
  }
}
