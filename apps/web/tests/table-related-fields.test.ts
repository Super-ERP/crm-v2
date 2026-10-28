import { describe,it,expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type {Tx} from '@/db'
import { datasetFieldExpressions,enrichTableRows } from '@/server/services/table-controls/dataset-fields'
import { recordFilter,recordSort } from '@/server/services/table-controls/record-filter'
import { normalizeRecordListQuery } from '@/lib/record-list-query'
import { getTableFields } from '@/lib/table-controls/registry'
import { OPTIONAL_TABLE_FIELDS } from '@/lib/table-controls/fields'
const dialect=new PgDialect()
const tree={kind:'group' as const,id:'root',logic:'and' as const,children:[{kind:'condition' as const,id:'stage',fieldId:'funnelStageName',operator:'any-of' as const,value:['4A','Closed Won']}]}
describe('approved server relationship fields',()=>{
 it('projects the existing lead Stage label for filtering and exports',()=>{
  const stage=datasetFieldExpressions('leads').stage
  expect(stage).toBeDefined()
  expect(dialect.sqlToQuery(stage).sql).toContain('current_stage_id')
 })
 it('provides one expression for each supported root addition and no arbitrary dataset',()=>{
  for(const key of ['leads','accounts','persons','opportunities','funnel','quotations','products','projects','payment-milestones','sales-orders','finance-sale','finance-purchase']){
   expect(Object.keys(datasetFieldExpressions(key))).toEqual(OPTIONAL_TABLE_FIELDS[key].map(f=>f.id))
  }
  expect(datasetFieldExpressions('private_users')).toEqual({})
 })
 it('filters 4a and won using a correlated tenant-bound stage, including project fallback',()=>{
  const query=dialect.sqlToQuery(recordFilter('payment-milestones',tree,{status:sql`payment_milestones.status`})!)
  expect(query.sql).toContain('pipeline_stages tf_s')
  expect(query.sql).toContain('coalesce("payment_milestones"."funnel_id",')
  expect(query.sql).toContain('tf_s.tenant_id="payment_milestones"."tenant_id"')
  expect(query.params).toContain('4a')
  expect(query.params).toContain('closed won')
  expect(()=>recordFilter('payment-milestones',{...tree,children:[{...tree.children[0],fieldId:'password'}]},{})).toThrow()
 })
 it('uses the same related expression for sort and accepts it at the paging boundary',()=>{
  const input={pageIndex:0,pageSize:25,search:'',sorting:[{id:'funnelStageName',desc:false}],filters:[],filterTree:tree}
  const q=normalizeRecordListQuery(input, ['title'], [],getTableFields('payment-milestones'))
  expect(q.query.sorting).toEqual(input.sorting)
  expect(dialect.sqlToQuery(recordSort(q.query.sorting,{},sql`payment_milestones.id`,'payment-milestones')[0]).sql).toContain('pipeline_stages tf_s')
 })
 it('only enriches authorised ids and leaves source rows intact',async()=>{
  let captured:ReturnType<PgDialect['sqlToQuery']>|undefined
  const tx={execute:async(query:Parameters<PgDialect['sqlToQuery']>[0])=>{captured=dialect.sqlToQuery(query);return [{id:'visible',funnelStageName:'4A'}]}} as unknown as Tx
  const rows=await enrichTableRows(tx,'payment-milestones',[{id:'visible',title:'Deposit'}],'entity-a')
  expect(rows).toEqual([{id:'visible',title:'Deposit',tableFields:{id:'visible',funnelStageName:'4A'}}])
  expect(captured?.params).toEqual(['visible','entity-a'])
  expect(captured?.sql).toContain('"payment_milestones"."tenant_id"=')
  await expect(enrichTableRows(tx,'payment-milestones',[],'entity-a')).resolves.toEqual([])
 })
})
