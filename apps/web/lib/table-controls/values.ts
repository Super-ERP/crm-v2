import { computedTableValue } from './client-values'
import { tableScalar } from './evaluate'
import type { TableFieldDefinition } from './types'

export function optionalTableValue(row:unknown,id:string):unknown {
  const data=row as Record<string,unknown> & {tableFields?:Record<string,unknown>}
  return data.tableFields && id in data.tableFields ? data.tableFields[id] : data[id]
}
/** Readable values for exports; relationship IDs are never presented as names. */
export function displayTableValue(row:unknown,field:TableFieldDefinition,value:unknown,listKey?:string):unknown {
  const data=row as Record<string,unknown>
  const related:Record<string,string>={accountId:'accountName',opportunityId:'opportunityName',funnelId:'funnelName',accountOwnerMemberId:'accountOwnerName'}
  if(related[field.id])return data[related[field.id]]??tableScalar(value)
  if(listKey==='funnel'&&field.id==='id')return data.name??value
  if(field.optional)return optionalTableValue(row,field.id)
  return value
}
export function formatTableField(value:unknown,field:TableFieldDefinition,timezone:string):string {
  if(value==null||value==='')return ''
  if(Array.isArray(value))return value.map(item=>{
    if(item&&typeof item==='object'&&'currency' in item&&'total' in item)return `${String(item.currency)} ${String(item.total)}`
    const value=String(tableScalar(item)??'')
    return field.options?.find(option=>option.value===value)?.label??value
  }).join('; ')
  if(field.type==='boolean')return value===true?'Yes':value===false?'No':String(value)
  if(field.type==='date'){
    const str=String(value)
    if(/^\d{4}-\d{2}-\d{2}$/.test(str))return str
    const date=value instanceof Date?value:new Date(str)
    if(Number.isNaN(date.getTime()))return str
    return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)
  }
  const option=field.options?.find(option=>option.value===String(value))
  return option?.label??String(tableScalar(value)??'')
}
/** The same semantic getter feeds client filters, observed choices and exports. */
export function resolveTableValue(row:unknown,id:string,accessor?:()=>unknown,listKey?:string):unknown {
 const data=row as Record<string,unknown>
 if(data.tableFields && id in (data.tableFields as Record<string,unknown>))return optionalTableValue(row,id)
 if(listKey==='settings-api-keys'&&id==='status')return data.revokedAt?'Revoked':data.expiresAt&&new Date(String(data.expiresAt))<=new Date()?'Expired':'Active'
 if(['totalEstimatedFunnelAmount','primary','converted','roles','lastActive','manager','relationship','stage','default','active','approval','forecast'].includes(id))return computedTableValue(data,id)
 return accessor?accessor():data[id]
}
export function completeTableFieldOptions(rows:readonly unknown[],value:(row:unknown)=>unknown):{value:string;label:string}[] {
 const result=new Map<string,string>()
 for(const row of rows){const raw=value(row);for(const item of Array.isArray(raw)?raw:[raw]){
  if(item==null||item==='')continue
  const object=typeof item==='object'?item as Record<string,unknown>:null
  const id=String(object?.value??object?.id??tableScalar(item))
  result.set(id,String(tableScalar(item)))
 }}
 return [...result].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label))
}
