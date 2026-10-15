import { asc, desc, type SQL, type SQLWrapper } from 'drizzle-orm'
import { getTableFields } from '@/lib/table-controls/registry'
import type { FilterGroup } from '@/lib/table-controls/types'
import { compileFilterTree, type SqlFieldRegistry } from './compile'
export function recordFilter(listKey:string,tree:FilterGroup|undefined,expressions:Record<string,SQLWrapper>,options:{currency?:SQLWrapper;moneyBuckets?:Record<string,SQLWrapper>;dateOnly?:readonly string[];arrays?:readonly string[];relationNames?:Record<string,SQLWrapper>}={}) {
 if(!tree)return undefined
 const registry:SqlFieldRegistry=Object.fromEntries(getTableFields(listKey,Object.keys(expressions)).map(field=>[field.id,{field,expression:expressions[field.id],searchExpression:options.relationNames?.[field.id],currency:options.currency,moneyBuckets:options.moneyBuckets?.[field.id],dateOnly:options.dateOnly?.includes(field.id),array:options.arrays?.includes(field.id)}]))
 return compileFilterTree(tree,registry,{now:new Date(),timezone:process.env.TZ||'UTC'})
}
export function recordSort(sorting:{id:string;desc:boolean}[]|undefined,columns:Record<string,SQLWrapper>,fallback:SQL):SQL[] {
 if(!sorting?.length)return [fallback]
 if(sorting.length>5)throw new Error('Use at most five sort fields.')
 return sorting.map(sort=>{const column=columns[sort.id];if(!column)throw new Error('Unavailable sort field');return sort.desc?desc(column):asc(column)})
}
