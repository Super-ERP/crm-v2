import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { getTableFields } from '@/lib/table-controls/registry'
import { compileFilterTree } from '@/server/services/table-controls/compile'
import { evaluateFilterTree } from '@/lib/table-controls/evaluate'
import { validateFilterTree } from '@/lib/table-controls/filter-tree'
import type { FilterCondition, FilterGroup } from '@/lib/table-controls/types'
const url=process.env.TEST_DATABASE_ADMIN_URL
;(url?describe:describe.skip)('filter SQL/client parity',()=>{
 it('keeps access scope outside nested OR and matches money, dates, empty and literal wildcards',async()=>{
  const client=postgres(url!,{max:1})
  const fields=[...getTableFields('project-code-funnels',['name','estimatedAmount','expectedCloseDate','status']),...getTableFields('accounts',['createdAt']),...getTableFields('quotations',['primary'])]
  const context={now:new Date('2026-10-15T10:00:00Z'),timezone:'Asia/Kuala_Lumpur'}
  const rows=[
   {id:'a',tenant:'qm',owner:'me',name:"literal %_\\'",estimatedAmount:'0',currency:'MYR',expectedCloseDate:'2026-01-01',status:'won'},
   {id:'b',tenant:'qm',owner:'me',name:null,estimatedAmount:null,currency:'MYR',expectedCloseDate:null,status:'open'},
   {id:'c',tenant:'qm',owner:'me',name:'Other',estimatedAmount:'100',currency:'USD',expectedCloseDate:'2025-12-31',status:'open'},
   {id:'d',tenant:'qa',owner:'me',name:"literal %_\\'",estimatedAmount:'0',currency:'MYR',expectedCloseDate:'2026-01-01',status:'won'},
   {id:'e',tenant:'qm',owner:'other',name:"literal %_\\'",estimatedAmount:'0',currency:'MYR',expectedCloseDate:'2026-01-01',status:'won'},
  ].map((row,index)=>({...row,createdAt:index===0?'2025-12-31T16:00:00Z':null,primary:index===0?false:null}))
  let sequence=0
  const rule=(fieldId:string,operator:FilterCondition['operator'],value?:unknown):FilterCondition=>({kind:'condition',id:`c${sequence++}`,fieldId,operator,value})
  const group=(children:FilterGroup['children'],logic:'and'|'or'='and'):FilterGroup=>({kind:'group',id:`g${sequence++}`,logic,children})
  const registry=Object.fromEntries(fields.map(field=>[field.id,{field,expression:sql`${sql.identifier(field.id)}`,dateOnly:field.id==='expectedCloseDate',currency:sql`currency`}]))
  try {
   await client.begin(async tx=>{
    await tx.unsafe('create temporary table filter_parity (id text, tenant text, owner text, name text, "estimatedAmount" numeric, currency text, "expectedCloseDate" date, status text, "createdAt" timestamptz, "primary" boolean) on commit drop')
    for(const row of rows)await tx`insert into filter_parity values (${row.id},${row.tenant},${row.owner},${row.name},${row.estimatedAmount},${row.currency},${row.expectedCloseDate},${row.status},${row.createdAt},${row.primary})`
    for(const tree of [group([]),group([rule('primary','equals',false)]),group([rule('createdAt','year',2026)]),group([rule('primary','empty')]),group([rule('name','contains',"%_\\'")]),group([rule('name','not-contains','other')]),group([rule('estimatedAmount','equals',{amount:0,currency:'MYR'})]),group([rule('expectedCloseDate','year',2026)]),group([rule('expectedCloseDate','relative','this-year')]),group([rule('name','empty'),rule('status','any-of',['won'])],'or'),group([group([rule('status','any-of',['won']),rule('status','any-of',['open'])],'or'),rule('expectedCloseDate','year',2026)])]) {
     const validated=validateFilterTree(tree,fields)
     const query=new PgDialect().sqlToQuery(sql`select id from filter_parity where tenant = ${'qm'} and owner = ${'me'} and (${compileFilterTree(validated,registry,context)}) order by id`)
     const result=await tx.unsafe(query.sql,query.params as never[])
     expect(result.map(r=>r.id)).toEqual(rows.filter(r=>r.tenant==='qm'&&r.owner==='me'&&evaluateFilterTree(r,validated,fields,context)).map(r=>r.id).sort())
    }
   })
  } finally {await client.end()}
 })
})
