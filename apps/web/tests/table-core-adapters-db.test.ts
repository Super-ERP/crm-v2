import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import type { Tx, ServerContext } from '@/lib/actions'
import type { FilterGroup } from '@/lib/table-controls/types'
const runtime=vi.hoisted(()=>({tx:null as unknown as Tx,ctx:null as unknown as ServerContext}))
vi.mock('@/db',()=>({db:{},runInTenant:async(_tenant:string,work:(tx:Tx)=>unknown)=>work(runtime.tx)}))
vi.mock('@/lib/actions',()=>({withTenant:async(_permission:string,work:(tx:Tx,ctx:ServerContext)=>unknown)=>work(runtime.tx,runtime.ctx),withModule:async(_module:string,_permission:string,work:(tx:Tx,ctx:ServerContext)=>unknown)=>work(runtime.tx,runtime.ctx)}))
vi.mock('@/lib/modules.server',()=>({getEntitledModuleMap:async()=>({finance:false,projects:false})}))
vi.mock('@/lib/access-scope',async original=>({...await original<typeof import('@/lib/access-scope')>(),visibleMemberIds:async()=>['rep']}))
import { listProductPage } from '@/app/(app)/products/actions'
import { listProjectPage } from '@/app/(app)/projects/actions'
import { listPaymentMilestonePage } from '@/app/(app)/payment-milestones/actions'
import { listFinanceDocPage } from '@/app/(app)/billing/actions'
import { listAuditPage } from '@/app/(app)/audit/actions'
import { listInboundIntercompanyDealPage } from '@/app/(app)/intercompany/actions'
import { listSalesOrderPage } from '@/app/(app)/sales-orders/actions'
import { leadsList, accountsList, personsList, opportunitiesList, funnelsList, quotationsList } from '@/lib/api-readers'
const url=process.env.TEST_DATABASE_ADMIN_URL
;(url?describe:describe.skip)('core advanced table adapters',()=>{
 it('filters and counts the complete authorized result set before paging',async()=>{
  const client=postgres(url!,{max:1}),namespace='table_core_'+randomUUID().replaceAll('-','')
  const ctx={tenantId:'qm',memberId:'rep'} as ServerContext
  const tableList=[schema.leads,schema.accounts,schema.persons,schema.pipelines,schema.pipelineStages,schema.funnels,schema.opportunities,schema.quotations,schema.quotationLineItems,schema.projects,schema.member,schema.user,schema.organization,schema.products,schema.paymentMilestones,schema.financeDocs,schema.salesOrders,schema.attachments,schema.auditLog,schema.intercompanyDeals,schema.intercompanyDealResponses]
  const account=randomUUID(),opp=randomUUID(),funnel=randomUUID(),stage=randomUUID(),pipeline=randomUUID(),person=randomUUID(),quote=randomUUID()
  const tree=(fieldId:string,value:unknown,operator='contains'):FilterGroup=>({kind:'group',id:'root',logic:'and',children:[{kind:'condition',id:'c',fieldId,operator:operator as never,value}]})
  try {
   await client.unsafe(`create schema "${namespace}";set search_path to "${namespace}"`)
   for(const table of tableList){const config=getTableConfig(table);await client.unsafe(`create table "${config.name}" (${config.columns.map(c=>{let type=c.getSQLType();if('enumValues' in c&&c.enumValues?.length)type='text';return `"${c.name}" ${type}`}).join(',')})`)}
   await client`insert into "user" (id,name) values ('rep-user','Representative')`
   await client`insert into member (id,user_id,organization_id) values ('rep','rep-user','qm')`
   await client`insert into accounts (id,tenant_id,name,owner_member_id,account_type,currency) values (${account},'qm','Target account','rep','customer','MYR')`
   await client`insert into persons (id,tenant_id,first_name,last_name,account_id,is_primary) values (${person},'qm','Target','Contact',${account},true)`
   await client`insert into opportunities (id,tenant_id,name,account_id,owner_member_id,currency,total_estimated_funnel_amount) values (${opp},'qm','Target opportunity',${account},'rep','MYR',100)`
   await client`insert into pipelines (id,tenant_id,name,is_default) values (${pipeline},'qm','Default',true)`
   await client`insert into pipeline_stages (id,tenant_id,pipeline_id,name,code,kind) values (${stage},'qm',${pipeline},'4A','4a','OPEN')`
   await client`insert into funnels (id,tenant_id,name,opportunity_id,account_id,pipeline_id,current_stage_id,owner_member_id,status,currency,estimated_amount,expected_close_date,project_code) values (${funnel},'qm','Target funnel',${opp},${account},${pipeline},${stage},'rep','open','MYR',100,'2026-12-31','CODE-1')`
   await client`insert into quotations (id,tenant_id,quote_number,funnel_id,status,currency,total,is_primary) values (${quote},'qm','Target quote',${funnel},'draft','MYR',100,true)`
   for(let index=0;index<60;index++)await client`insert into leads (id,tenant_id,name,owner_member_id,status) values (${randomUUID()},'qm',${`Lead ${String(index).padStart(2,'0')}`},${index<50?'rep':'hidden'},'new')`
   const tx=drizzle(client) as unknown as Tx;runtime.tx=tx;runtime.ctx=ctx
   const query={search:'',selections:{},filterTree:tree('name','Lead')}
   const page=await leadsList(tx,ctx,{limit:25,offset:25,query:{...query,sorting:[{id:'name',desc:false}]}})
   expect(page.total).toBe(50);expect(page.rows).toHaveLength(25);expect(page.rows[0].name).toBe('Lead 25')
   const cases=[
    ()=>accountsList(tx,ctx,{limit:25,offset:0,query:{...query,filterTree:tree('parentAccountName',undefined,'empty')}}),
    ()=>personsList(tx,ctx,{limit:25,offset:0,query:{...query,filterTree:tree('primary',true,'equals')}}),
    ()=>opportunitiesList(tx,ctx,{limit:25,offset:0,query:{...query,filterTree:tree('projectCodes','CODE-1')}}),
    ()=>funnelsList(tx,ctx,{limit:25,offset:0,query:{...query,filterTree:tree('expectedCloseDate',2026,'year')}}),
    ()=>quotationsList(tx,ctx,{limit:25,offset:0,query:{filterTree:tree('primary',true,'equals')}}),
   ]
   for(const run of cases){const result=await run();expect(result.total).toBe(1);expect(result.rows).toHaveLength(1)}
   const input={pageIndex:0,pageSize:25,search:'',sorting:[],filters:[],filterTree:tree('name','No match')}
   // Execute every operational adapter with a real predicate, exercising count joins too.
   const operational=[
    ()=>listProductPage({...input,filterTree:tree('standardPrice',{currency:'MYR',amount:0},'equals')}),
    ()=>listProjectPage({...input,filterTree:tree('accountName','Target')}),
    ()=>listPaymentMilestonePage({...input,filterTree:tree('amount',{currency:'MYR',amount:0},'equals')}),
    ()=>listFinanceDocPage('sale',{...input,filterTree:tree('from','SO')}),
    ()=>listAuditPage({...input,filterTree:tree('actorName','Representative')}),
    ()=>listInboundIntercompanyDealPage({...input,filterTree:tree('project','CODE')}),
    ()=>listSalesOrderPage({...input,filterTree:tree('submittedByName','Representative')}),
   ]
   for(const run of operational){const result=await run();expect(result.total).toBe(0);expect(result.rows).toHaveLength(0)}

  } finally {await client.unsafe(`drop schema if exists "${namespace}" cascade`);await client.end()}
 })
})
