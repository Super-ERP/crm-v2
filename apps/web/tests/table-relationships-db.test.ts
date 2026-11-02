import {randomUUID} from 'node:crypto'
import postgres from 'postgres'
import {drizzle} from 'drizzle-orm/postgres-js'
import {getTableConfig,PgTable} from 'drizzle-orm/pg-core'
import {is,sql} from 'drizzle-orm'
import {describe,it,expect,vi} from 'vitest'
import * as schema from '@/db/schema'
import type {Tx} from '@/db'
import type {ServerContext} from '@/lib/server-context'
import type {FilterGroup} from '@/lib/table-controls/types'
import {RELATION_ENTITIES,type RelationEntity} from '@/lib/table-controls/relationships'
import {relationshipRegistry,relationshipScope,relationshipSource,projectRelationships} from '@/server/services/table-controls/relationships'
import {compileFilterTree} from '@/server/services/table-controls/compile'
import {accountsList} from '@/lib/api-readers'
vi.mock('@/lib/modules.server',()=>({getEntitledModuleMap:async()=>({projects:true,salesOrders:true,finance:true,forecast:true,audit:true})}))
const url=process.env.TEST_DATABASE_ADMIN_URL
const condition=(fieldId:string,operator:string,value?:unknown)=>({kind:'condition',id:randomUUID(),fieldId,operator,value})
const group=(...children:unknown[])=>({kind:'group',id:randomUUID(),logic:'and',children}) as FilterGroup
;(url?describe:describe.skip)('authorized relationship SQL',()=>{
 it('compiles every registered relationship, preserves same-child filters, ownership, currencies, bridges and parent paging',async()=>{
  const client=postgres(url!,{max:1,onnotice:()=>{}}),namespace='relationships_'+randomUUID().replaceAll('-','')
  const ctx={tenantId:'entity',memberId:'rep',isSuperadmin:false,can:(permission:string)=>!permission.startsWith('records.')} as ServerContext
  try{
   await client.unsafe(`create schema "${namespace}";set search_path to "${namespace}"`)
   for(const value of Object.values(schema))if(is(value,PgTable)){
    const config=getTableConfig(value)
    await client.unsafe(`create table "${config.name}" (${config.columns.map(column=>`"${column.name}" ${'enumValues' in column&&column.enumValues?.length?'text':column.getSQLType()}`).join(',')})`)
   }
   const tx=drizzle(client) as unknown as Tx,scope=await relationshipScope(tx,ctx)
   for(const entity of Object.keys(RELATION_ENTITIES) as RelationEntity[]){
    const registry=relationshipRegistry(entity,sql`root.id`,scope)
    const projections=Object.values(registry).map(entry=>entry.moneyBuckets??entry.expression)
    if(projections.length)await tx.execute(sql`select ${sql.join(projections,sql`, `)} from ${relationshipSource(entity,'root')} where false`)
    for(const entry of Object.values(registry).filter(entry=>entry.related)){
     const child=Object.values(entry.related!.fields).find(field=>field.field.type!=='collection')!
     const predicate=compileFilterTree(group(condition(entry.field.id,'some',group(condition(child.field.id,'empty')))),registry,{now:new Date(),timezone:'UTC'})
     await tx.execute(sql`select root.id from ${relationshipSource(entity,'root')} where false and ${predicate}`)
    }
   }
   const accountA=randomUUID(),accountB=randomUUID(),pipeline=randomUUID(),stage=randomUUID(),opp=randomUUID(),funnelA=randomUUID(),funnelB=randomUUID(),hiddenFunnel=randomUUID(),quoteA=randomUUID(),quoteB=randomUUID(),quoteUSD=randomUUID(),product=randomUUID()
   for(const [id,name] of [[accountA,'A'],[accountB,'B']])await client`insert into accounts(id,tenant_id,name,owner_member_id,account_type,currency) values(${id},'entity',${name},'rep','customer','MYR')`
   await client`insert into opportunities(id,tenant_id,name,account_id,owner_member_id,currency) values(${opp},'entity','Opportunity',${accountA},'rep','MYR')`
   await client`insert into pipelines(id,tenant_id,name) values(${pipeline},'entity','Sales')`
   await client`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,kind) values(${stage},'entity',${pipeline},'Commit','4a','OPEN')`
   for(const [id,account,owner] of [[funnelA,accountA,'rep'],[funnelB,accountB,'rep'],[hiddenFunnel,accountB,'other']])await client`insert into funnels(id,tenant_id,name,account_id,opportunity_id,owner_member_id,current_stage_id,pipeline_id,status,currency) values(${id},'entity','Funnel',${account},${opp},${owner},${stage},${pipeline},'open','MYR')`
   for(const [id,funnel,currency] of [[quoteA,funnelA,'MYR'],[quoteB,funnelB,'MYR'],[quoteUSD,funnelA,'USD']])await client`insert into quotations(id,tenant_id,quote_number,funnel_id,status,currency,total) values(${id},'entity','Quote',${funnel},'accepted',${currency},100)`
   for(const [funnel,quote,status,date,amount,tenant] of [
    [funnelA,quoteA,'pending_invoicing','2025-01-01',10,'entity'],[funnelA,quoteA,'invoiced','2026-01-01',20,'entity'],[funnelA,quoteUSD,'invoiced','2027-01-01',50,'entity'],
    [funnelB,quoteB,'pending_invoicing','2026-02-01',30,'entity'],[hiddenFunnel,quoteB,'invoiced','2026-01-01',9999,'entity'],[funnelB,quoteB,'invoiced','2026-01-01',8888,'other'],
   ])await client`insert into payment_milestones(id,tenant_id,funnel_id,quotation_id,title,status,due_date,amount) values(${randomUUID()},${tenant},${funnel},${quote},'Deposit',${status},${date},${amount})`
   const sameChild=group(condition('related.milestones','some',group(condition('status','any-of',['pending_invoicing']),condition('dueDate','year',2026))))
   const registry=relationshipRegistry('accounts',sql`root.id`,scope)
   const rows=await tx.execute(sql`select root.id from accounts root where root.tenant_id='entity' and ${compileFilterTree(sameChild,registry,{now:new Date(),timezone:'UTC'})}`)
   expect(Array.from(rows).map(row=>row.id)).toEqual([accountB])
   const projected=await projectRelationships(tx,ctx,'accounts',[accountA,accountB],['related.milestones.count','related.milestones.amount.sum','related.milestones.dueDate.min'],sameChild)
   expect(projected[accountA][`match:${sameChild.children[0].id}`]).toBe(false)
   expect(projected[accountB][`match:${sameChild.children[0].id}`]).toBe(true)
   expect(projected[accountA]['related.milestones.count']).toBe(3)
   expect(projected[accountB]['related.milestones.count']).toBe(1)
   expect(projected[accountA]['related.milestones.amount.sum']).toEqual([{currency:'MYR',total:'30.00'},{currency:'USD',total:'50.00'}])
   expect(projected[accountA]['related.milestones.dueDate.min']).toBe('2025-01-01')
   for(let index=0;index<35;index++)await client`insert into accounts(id,tenant_id,name,owner_member_id,currency) values(${randomUUID()},'entity',${`Account ${index}`},'rep','MYR')`
   const page=await accountsList(tx,ctx,{limit:25,offset:0,query:{search:'',selections:{},filterTree:sameChild,sorting:[{id:'name',desc:false}]}})
   expect(page.total).toBe(1);expect(page.rows.map(row=>row.id)).toEqual([accountB])
   const all2026=group(condition('related.milestones','every',group(condition('dueDate','year',2026))))
   const everyRows=await tx.execute(sql`select root.id from accounts root where root.tenant_id='entity' and ${compileFilterTree(all2026,registry,{now:new Date(),timezone:'UTC'})}`)
   expect(Array.from(everyRows).map(row=>row.id)).toEqual([accountB])
   const moneyTree=group(condition('related.milestones.amount.sum','equals',{currency:'USD',amount:50}))
   const moneyRows=await tx.execute(sql`select root.id from accounts root where root.tenant_id='entity' and ${compileFilterTree(moneyTree,registry,{now:new Date(),timezone:'UTC'})}`)
   expect(Array.from(moneyRows).map(row=>row.id)).toEqual([accountA])
   const denied={...ctx,can:(permission:string)=>permission!=='payment_milestone.view'&&ctx.can(permission)}
   const deniedValues=await projectRelationships(tx,denied,'accounts',[accountB],['related.milestones.count'],group())
   expect(deniedValues[accountB]['related.milestones.count']).toBe(0)
   await client`insert into products(id,tenant_id,name,currency) values(${product},'entity','Product','MYR')`
   for(let index=0;index<2;index++)await client`insert into quotation_line_items(id,tenant_id,quotation_id,product_id) values(${randomUUID()},'entity',${quoteA},${product})`
   const bridge=await projectRelationships(tx,ctx,'products',[product],['related.quotations.count','related.quotations.total.sum'],group())
   expect(bridge[product]['related.quotations.count']).toBe(1)
   expect(bridge[product]['related.quotations.total.sum']).toEqual([{currency:'MYR',total:'100.00'}])
   const settingsOnly={...ctx,can:(p:string)=>p==='tenant.settings'}
   const settingsProjection=await projectRelationships(tx,settingsOnly,'settings-funnel-stages',[stage],['related.funnels.count'],group())
   expect(settingsProjection[stage]['related.funnels.count']).toBe(0)
   const longRule=group({...condition('related.milestones','some',group(condition('status','any-of',['pending_invoicing']))),id:'r'.repeat(100)})
   const longValues=await projectRelationships(tx,ctx,'accounts',[accountB],[],longRule)
   expect(longValues[accountB][`match:${'r'.repeat(100)}`]).toBe(true)
   const person=randomUUID()
   await client`insert into persons(id,tenant_id,account_id,first_name) values(${person},'entity',${accountA},'Contact')`
   const parent=await projectRelationships(tx,ctx,'persons',[person],['related.account.name','related.account.count'],group())
   expect(parent[person]['related.account.name']).toBe('A')
   expect(parent[person]['related.account.count']).toBe(1)
   const parentDenied=await projectRelationships(tx,{...ctx,can:(p:string)=>p!=='account.view'&&ctx.can(p)},'persons',[person],['related.account.name'],group())
   expect(parentDenied[person]['related.account.name']).toBeNull()
   await client`update funnels set project_code='VISIBLE' where id=${funnelA}`
   await client`update opportunities set project_code='PRIVATE-CRM',owner_member_id='other' where id=${opp}`
   const codes=await projectRelationships(tx,ctx,'project-codes',['VISIBLE','PRIVATE-CRM'],['related.funnels.count'],group())
   expect(codes.VISIBLE['related.funnels.count']).toBe(1)
   expect(codes['PRIVATE-CRM']).toBeUndefined()
   const forecastBefore=await projectRelationships(tx,ctx,'funnel',[funnelA],['related.forecastRows.count'],group())
   expect(forecastBefore[funnelA]['related.forecastRows.count']).toBe(0)
   await client`update pipeline_stages set include_in_forecast=true where id=${stage}`
   const forecastAfter=await projectRelationships(tx,ctx,'funnel',[funnelA],['related.forecastRows.count'],group())
   expect(forecastAfter[funnelA]['related.forecastRows.count']).toBe(1)
   const forecast=await projectRelationships(tx,ctx,'forecast',[`own:${funnelA}`],['related.funnel.name'],group())
   expect(forecast[`own:${funnelA}`]['related.funnel.name']).toBe('Funnel')
   const project=randomUUID()
   await client`insert into projects(id,tenant_id,name,account_id,funnel_id,owner_member_id,value,currency) values(${project},'entity','Delivery',${accountA},${funnelA},'rep',123,'USD')`
   const projectScope={...scope,modules:{...scope.modules,projects:false}}
   const projectRegistry=relationshipRegistry('accounts',sql`root.id`,projectScope)
   const projectCount=await tx.execute(sql`select ${projectRegistry['related.projects.count'].expression} as count from accounts root where root.id=${accountA}`)
   expect(projectCount[0].count).toBe(0)
   const one=await projectRelationships(tx,ctx,'payment-milestones',[],['related.funnel.name'],group())
   expect(one).toEqual({})
   const foreign=await projectRelationships(tx,{...ctx,tenantId:'other'},'accounts',[accountA],['related.milestones.count'],group())
   expect(foreign).toEqual({})
  }finally{await client.unsafe(`drop schema if exists "${namespace}" cascade`);await client.end()}
 },60000)
})
