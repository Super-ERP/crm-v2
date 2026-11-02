import { asc, desc, type SQL, type SQLWrapper } from 'drizzle-orm'
import { datasetFieldExpressions } from './dataset-fields'
import { OPTIONAL_TABLE_FIELDS } from '@/lib/table-controls/fields'
import { getTableFields } from '@/lib/table-controls/registry'
import type { FilterGroup } from '@/lib/table-controls/types'
import { compileFilterTree, type SqlFieldRegistry } from './compile'
export function recordFilter(listKey:string,tree:FilterGroup|undefined,expressions:Record<string,SQLWrapper>,options:{currency?:SQLWrapper;moneyBuckets?:Record<string,SQLWrapper>;dateOnly?:readonly string[];arrays?:readonly string[];relationNames?:Record<string,SQLWrapper>}={},related:SqlFieldRegistry={}) {
 if(!tree)return undefined
 expressions={...datasetFieldExpressions(listKey),...expressions}
 options={...options,dateOnly:[...(options.dateOnly??[]),...(OPTIONAL_TABLE_FIELDS[listKey]??[]).filter(field=>field.dateOnly).map(field=>field.id)]}
 const registry:SqlFieldRegistry=Object.fromEntries(getTableFields(listKey,Object.keys(expressions)).map(field=>[field.id,{field,expression:expressions[field.id],searchExpression:options.relationNames?.[field.id],currency:options.currency,moneyBuckets:options.moneyBuckets?.[field.id],dateOnly:options.dateOnly?.includes(field.id),array:options.arrays?.includes(field.id)}]))
 return compileFilterTree(tree,{...registry,...related},{now:new Date(),timezone:process.env.TZ||'UTC'})
}
export function recordSort(sorting:{id:string;desc:boolean}[]|undefined,columns:Record<string,SQLWrapper>,fallback:SQL,listKey?:string):SQL[] {
 columns={...(listKey?datasetFieldExpressions(listKey):{}),...columns}
 if(!sorting?.length)return [fallback]
 if(sorting.length>5)throw new Error('Use at most five sort fields.')
 return sorting.map(sort=>{const column=columns[sort.id];if(!column)throw new Error('Unavailable sort field');return sort.desc?desc(column):asc(column)})
}

export function recordFilterRelated(listKey:string,tree:FilterGroup|undefined,expressions:Record<string,SQLWrapper>,related:SqlFieldRegistry,options:Parameters<typeof recordFilter>[3]={}){return recordFilter(listKey,tree,expressions,options,related)}
