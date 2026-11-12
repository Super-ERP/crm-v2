import { describe, expect, it } from 'vitest'
import { quotations, funnels } from '@/db/schema'
import { getAvailableTableFields } from '@/lib/table-controls/registry'
import { recordFilterRelated } from '@/server/services/table-controls/record-filter'
import type { FilterGroup } from '@/lib/table-controls/types'
const fields={quoteNumber:quotations.quoteNumber,funnelName:funnels.name,status:quotations.status,total:quotations.total,createdAt:quotations.createdAt}
describe('product quotation usage filter catalogue',()=>{
 it('compiles the empty filter tree sent on the first table load',()=>{
  const tree:FilterGroup={id:'root',kind:'group',logic:'and',children:[]}
  expect(()=>recordFilterRelated('product-usage',tree,fields,{}, {currency:quotations.currency})).not.toThrow()
 })
 it('registers the server timestamp without adding a default visible column',()=>{
  const columns=getAvailableTableFields('product-usage',['quoteNumber','funnelName','status','total'])
  expect(columns.find(field=>field.id==='createdAt')).toMatchObject({type:'date',optional:true,defaultVisible:false})
 })
})
