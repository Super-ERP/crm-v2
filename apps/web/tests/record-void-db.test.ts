import { readFileSync } from 'node:fs'
import { randomUUID,randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import postgres,{type Sql} from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest'
import type { Tx } from '@/db'
import type { ServerContext } from '@/lib/server-context'
import { ALL_PERMISSION_KEYS,PERMISSIONS as P } from '@/lib/permissions'
vi.mock('@/lib/modules.server',()=>({requireEntitledModule:vi.fn(),getEntitledModuleMap:vi.fn(async()=>({finance:false,projects:true,salesOrders:true}))}))
import { getRecordVoidImpact,requestRecordVoid,decideRecordVoid } from '@/server/services/record-void'
import { VOID_ENTITY_TYPES } from '@/lib/record-void'
const url=process.env.TEST_DATABASE_ADMIN_URL
const integration=url?describe.sequential:describe.skip
integration('universal void with actual migrations and PostgreSQL lifecycle guards',()=>{
 let server:Sql,pg:Sql,db:ReturnType<typeof drizzle>,database:string,rlsRole:string
 const tenant='void-universal',account=randomUUID(),opp=randomUUID(),funnel=randomUUID(),pipeline=randomUUID(),stage=randomUUID(),quote=randomUUID(),project=randomUUID(),milestone=randomUUID(),cost=randomUUID(),year=randomUUID(),contract=randomUUID(),so=randomUUID(),invoice=randomUUID(),contact=randomUUID(),product=randomUUID(),lead=randomUUID()
 const repKeys=[P.OPPORTUNITY_VIEW,P.OPPORTUNITY_UPDATE,P.QUOTATION_VIEW,P.QUOTATION_UPDATE,P.PROJECT_VIEW,P.PROJECT_UPDATE,P.PAYMENT_MILESTONE_VIEW,P.PAYMENT_MILESTONE_MANAGE,P.SALES_ORDER_VIEW,P.SALES_ORDER_SUBMIT,P.FINANCE_VIEW,P.ACCOUNT_VIEW,P.ACCOUNT_UPDATE,P.PERSON_VIEW,P.PERSON_UPDATE,P.LEAD_VIEW,P.LEAD_UPDATE,P.PRODUCT_VIEW,P.PRODUCT_UPDATE]
 function context(memberId:string,keys:string[]):ServerContext {const permissions=new Set(keys);return {tenantId:tenant,memberId,userId:memberId,userName:memberId,userEmail:`${memberId}@test.invalid`,isSuperadmin:false,status:'active',tenantSuspended:false,subscriptionInactive:false,tierLevel:20,roleName:'test',permissions,can:(p:string)=>permissions.has(p)}}
 const rep=context('sales',repKeys),admin=context('admin',ALL_PERMISSION_KEYS)
 const target={type:'funnel' as const,id:funnel}
 const work=<T>(fn:(tx:Tx)=>Promise<T>)=>db.transaction(async tx=>{await tx.execute(sql`select set_config('app.current_tenant',${tenant},true)`);return fn(tx as unknown as Tx)})
 beforeAll(async()=>{
  if(!url)throw new Error('TEST_DATABASE_ADMIN_URL required')
  const uri=new URL(url);uri.pathname='/postgres';server=postgres(uri.toString(),{max:1});database=`crm_void_universal_${randomBytes(5).toString('hex')}`;rlsRole=`void_rls_${randomBytes(5).toString('hex')}`
  await server.unsafe(`create database "${database}"`);uri.pathname=`/${database}`;pg=postgres(uri.toString(),{max:5});db=drizzle(pg)
  await migrate(db,{migrationsFolder:resolve(process.cwd(),'db/migrations')})
  await server.unsafe(`create role "${rlsRole}" nologin`)
  await pg.unsafe(`grant usage on schema public to "${rlsRole}"; grant select on record_void_requests to "${rlsRole}"`)
  await pg`insert into organization(id,name,slug) values (${tenant},'Void tests',${tenant})`
  for(const id of ['sales','admin']) {
   await pg`insert into "user"(id,name,email) values (${id},${id},${`${id}@test.invalid`})`
   await pg`insert into member(id,organization_id,user_id) values (${id},${tenant},${id})`
   await pg`insert into membership_profiles(member_id,tenant_id,status) values (${id},${tenant},'active')`
   const [role]=await pg`insert into roles(tenant_id,name) values (${tenant},${id}) returning id`
   await pg`insert into member_roles(tenant_id,member_id,role_id) values (${tenant},${id},${role.id})`
   for(const key of id==='admin'?ALL_PERMISSION_KEYS:repKeys) {
    const [permission]=await pg`insert into permissions(key) values (${key}) on conflict(key) do update set key=excluded.key returning id`
    await pg`insert into role_permissions(tenant_id,role_id,permission_id) values (${tenant},${role.id},${permission.id})`
   }
  }
  await pg`insert into accounts(id,tenant_id,name,owner_member_id) values (${account},${tenant},'Customer','sales')`
  await pg`insert into persons(id,tenant_id,account_id,first_name,owner_member_id) values (${contact},${tenant},${account},'Contact','sales')`
  await pg`insert into products(id,tenant_id,name) values (${product},${tenant},'Product')`
  await pg`insert into leads(id,tenant_id,name,owner_member_id) values (${lead},${tenant},'Lead','sales')`
  await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name) values (${opp},${tenant},${account},'sales',2026,1,'OPP-26-1','Pursuit')`
  await pg`insert into pipelines(id,tenant_id,name) values (${pipeline},${tenant},'Pipeline')`
  await pg`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,sort_order,kind) values (${stage},${tenant},${pipeline},'Open','1d',1,'OPEN')`
  await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,status,estimated_amount) values (${funnel},${tenant},${opp},'General nonduplicate',${account},${pipeline},${stage},'sales','open',100)`
  await pg`insert into quotations(id,tenant_id,funnel_id,quote_number) values (${quote},${tenant},${funnel},'Q-VOID-1')`
  await pg`insert into projects(id,tenant_id,project_code,name,account_id,funnel_id,quotation_id,owner_member_id) values (${project},${tenant},'P-VOID-1','Project',${account},${funnel},${quote},'sales')`
  await pg`insert into payment_milestones(id,tenant_id,funnel_id,quotation_id,project_id,title,amount) values (${milestone},${tenant},${funnel},${quote},${project},'Schedule',100)`
  await pg`insert into deal_costs(id,tenant_id,funnel_id,supplier_name,amount) values (${cost},${tenant},${funnel},'Supplier',20)`
  await pg`insert into contract_years(id,tenant_id,funnel_id,year,amount) values (${year},${tenant},${funnel},2026,100)`
  await pg`insert into contracts(id,tenant_id,funnel_id,account_id,name,owner_member_id) values (${contract},${tenant},${funnel},${account},'Contract','sales')`
  await pg`insert into sales_orders(id,tenant_id,project_id,status,so_number) values (${so},${tenant},${project},'approved','SO-VOID-1')`
  await pg`insert into finance_docs(id,tenant_id,kind,number,project_id,sales_order_id,status,amount) values (${invoice},${tenant},'invoice','INV-VOID-1',${project},${so},'draft',100)`
 },60000)
 afterAll(async()=>{await pg?.end();if(database)await server.unsafe(`drop database "${database}" with (force)`);if(rlsRole)await server.unsafe(`drop role if exists "${rlsRole}"`);await server?.end()})
 const targets={lead,account,person:contact,product,opportunity:opp,funnel,quotation:quote,project,payment_milestone:milestone,sales_order:so,finance_doc:invoice,contract,contract_year:year,deal_cost:cost}
 it('previews every registered module against real schema without leaking foreign records',async()=>{
  for(const type of VOID_ENTITY_TYPES)expect((await work(tx=>getRecordVoidImpact(tx,admin,{type,id:targets[type]}))).target.id).toBe(targets[type])
  const foreign={...rep,tenantId:'other-tenant'}
  await expect(work(tx=>getRecordVoidImpact(tx,foreign,target))).rejects.toThrow(/not available/)
 })
 it('allows blocked requests but never executes unresolved dependencies or stale impacts',async()=>{
  const impact=await work(tx=>getRecordVoidImpact(tx,rep,target))
  expect(impact.blockers.length).toBeGreaterThan(0)
  const id=await work(tx=>requestRecordVoid(tx,rep,{target,reason:'Wrong deal',fingerprint:impact.fingerprint}))
  await expect(work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/Resolve/)
  await expect(work(tx=>requestRecordVoid(tx,rep,{target,reason:'Duplicate request',fingerprint:impact.fingerprint}))).rejects.toThrow(/already awaiting/)
  await expect(work(tx=>decideRecordVoid(tx,{...admin,memberId:'sales'},{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/own request/)
  await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:false,note:'Resolve linked records first'}))
  expect((await pg`select deleted_at from funnels where id=${funnel}`)[0].deleted_at).toBeNull()
 })
 it('rejects stale previews, owner changes and inactive requesters without changing records',async()=>{
  const value={type:'lead' as const,id:lead}
  let impact=await work(tx=>getRecordVoidImpact(tx,rep,value))
  let id=await work(tx=>requestRecordVoid(tx,rep,{target:value,reason:'Mistaken source',fingerprint:impact.fingerprint}))
  await pg`update leads set name='Changed source',updated_at=now() where id=${lead}`
  await expect(work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/Impact changed/)
  impact=await work(tx=>getRecordVoidImpact(tx,admin,value,'review'))
  await pg`update leads set owner_member_id='admin' where id=${lead}`
  impact=await work(tx=>getRecordVoidImpact(tx,admin,value,'review'))
  await expect(work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/owner changed/)
  await pg`update leads set owner_member_id='sales' where id=${lead}`
  await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:false,note:'Resubmit current source'}))
  impact=await work(tx=>getRecordVoidImpact(tx,rep,value))
  id=await work(tx=>requestRecordVoid(tx,rep,{target:value,reason:'Current source',fingerprint:impact.fingerprint}))
  await pg`update membership_profiles set status='disabled' where member_id='sales'`
  await expect(work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/Requester is no longer active/)
  await pg`update membership_profiles set status='active' where member_id='sales'`
  await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:false,note:'Confirmed still needed'}))
 })
 it('resolves leaves first, preserves history and amounts, recalculates parent totals and forbids reuse',async()=>{
  for(const type of ['finance_doc','sales_order','payment_milestone','project','quotation','contract_year','contract','deal_cost','funnel','opportunity'] as const) {
   const value={type,id:targets[type]},impact=await work(tx=>getRecordVoidImpact(tx,rep,value))
   expect(impact.blockers,`${type} blockers`).toEqual([])
   const id=await work(tx=>requestRecordVoid(tx,rep,{target:value,reason:'Correct mistaken records',fingerprint:impact.fingerprint}))
   await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'Reviewed',fingerprint:impact.fingerprint}))
  }
  expect((await pg`select amount,deleted_at from payment_milestones where id=${milestone}`)[0]).toMatchObject({amount:'100.00',deleted_at:expect.anything()})
  expect((await pg`select so_number,status from sales_orders where id=${so}`)[0]).toMatchObject({so_number:'SO-VOID-1',status:'void'})
  expect((await pg`select total_estimated_funnel_amount from opportunities where id=${opp}`)[0].total_estimated_funnel_amount).toBe('0.00')
  await expect(pg`update funnels set name='Changed' where id=${funnel}`).rejects.toThrow(/read-only/)
  await expect(pg`insert into quotations(tenant_id,funnel_id,quote_number) values (${tenant},${funnel},'BAD')`).rejects.toThrow(/inactive/)
 })
 it('lets sales request a posted financial reversal and atomically reopens its settled parent',async()=>{
  const p=randomUUID(),order=randomUUID(),inv=randomUUID(),receipt=randomUUID()
  await pg`insert into projects(id,tenant_id,project_code,name,account_id,owner_member_id) values (${p},${tenant},'P-VOID-2','Finance reversal',${account},'sales')`
  await pg`insert into sales_orders(id,tenant_id,project_id,status,so_number) values (${order},${tenant},${p},'approved','SO-VOID-2')`
  await pg`insert into finance_docs(id,tenant_id,kind,number,project_id,sales_order_id,status,amount) values (${inv},${tenant},'invoice','INV-VOID-2',${p},${order},'settled',100)`
  await pg`insert into finance_docs(id,tenant_id,kind,number,project_id,sales_order_id,parent_id,status,amount) values (${receipt},${tenant},'receipt','RCT-VOID-2',${p},${order},${inv},'issued',100)`
  const value={type:'finance_doc' as const,id:receipt}
  const impact=await work(tx=>getRecordVoidImpact(tx,rep,value))
  expect(impact.blockers).toEqual([])
  expect(impact.requiredPermissions).toContain('finance.reverse')
  const id=await work(tx=>requestRecordVoid(tx,rep,{target:value,reason:'Reverse mistaken receipt posting; no external money movement',fingerprint:impact.fingerprint}))
  const noReverse={...admin,can:(key:string)=>key!=='finance.reverse'&&admin.can(key)}
  await expect(work(tx=>decideRecordVoid(tx,noReverse,{requestId:id,approve:true,note:'',fingerprint:impact.fingerprint}))).rejects.toThrow(/permissions/)
  await expect(work(tx=>decideRecordVoid(tx,noReverse,{requestId:id,approve:false,note:'Unauthorised rejection'}))).rejects.toThrow(/permissions/)
  await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'Reconciled source records',fingerprint:impact.fingerprint}))
  expect((await pg`select status,amount from finance_docs where id=${receipt}`)[0]).toMatchObject({status:'cancelled',amount:'100.00'})
  expect((await pg`select status from finance_docs where id=${inv}`)[0].status).toBe('issued')
  const [audit]=await pg`select "before","after" from audit_log where action='finance.settlement_reopened' and entity_id=${inv}`
  expect(audit.before).toMatchObject({status:'settled'})
  expect(audit.after).toMatchObject({status:'issued'})
 })

 it('allows reviewed archive of an already cancelled project, then archives all master record types',async()=>{
  const p=randomUUID()
  await pg`insert into projects(id,tenant_id,project_code,name,account_id,owner_member_id,status) values (${p},${tenant},'P-CANCELLED','Cancelled project',${account},'sales','cancelled')`
  const target={type:'project' as const,id:p},impact=await work(tx=>getRecordVoidImpact(tx,rep,target))
  expect(impact.blockers).toEqual([])
  const id=await work(tx=>requestRecordVoid(tx,rep,{target,reason:'Archive cancelled correction',fingerprint:impact.fingerprint}))
  await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'Confirmed',fingerprint:impact.fingerprint}))
  for(const type of ['person','product','lead'] as const) {
   const target={type,id:targets[type]},impact=await work(tx=>getRecordVoidImpact(tx,rep,target))
   expect(impact.blockers).toEqual([])
   const id=await work(tx=>requestRecordVoid(tx,rep,{target,reason:'Archive master correction',fingerprint:impact.fingerprint}))
   await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'Confirmed',fingerprint:impact.fingerprint}))
  }
  expect((await work(tx=>getRecordVoidImpact(tx,rep,{type:'account',id:account}))).blockers.length).toBeGreaterThan(0)
  const [invoice]=await pg`select id,project_id,sales_order_id from finance_docs where number='INV-VOID-2'`
  for(const target of [{type:'finance_doc' as const,id:invoice.id},{type:'sales_order' as const,id:invoice.sales_order_id},{type:'project' as const,id:invoice.project_id},{type:'account' as const,id:account}]) {
   const impact=await work(tx=>getRecordVoidImpact(tx,rep,target))
   expect(impact.blockers).toEqual([])
   const id=await work(tx=>requestRecordVoid(tx,rep,{target,reason:'Resolve final references',fingerprint:impact.fingerprint}))
   await work(tx=>decideRecordVoid(tx,admin,{requestId:id,approve:true,note:'Confirmed',fingerprint:impact.fingerprint}))
  }
  expect((await pg`select deleted_at from accounts where id=${account}`)[0].deleted_at).not.toBeNull()
 })

 it('enforces request-history RLS for an actual non-superuser database role',async()=>{
  await pg.begin(async tx=>{
   await tx.unsafe(`set local role "${rlsRole}"`)
   await tx`select set_config('app.current_tenant',${tenant},true)`
   expect((await tx`select id from record_void_requests`).length).toBeGreaterThan(0)
   await tx`select set_config('app.current_tenant','another-tenant',true)`
   expect(await tx`select id from record_void_requests`).toHaveLength(0)
  })
 })

 it('backfills existing Manager review permission idempotently without financial reversal',async()=>{
  const [manager]=await pg`insert into roles(tenant_id,name) values (${tenant},'Manager') returning id`
  const migration=readFileSync(resolve(process.cwd(),'db/migrations/0104_manager_record_void_approval.sql'),'utf8')
  await pg.unsafe(migration)
  await pg.unsafe(migration)
  const grants=await pg`select p.key from role_permissions rp join permissions p on p.id=rp.permission_id where rp.role_id=${manager.id}`
  expect(grants.map(row=>row.key)).toEqual(['record.void.approve'])
 })

})
