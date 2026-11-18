import {randomUUID,randomBytes} from 'node:crypto'
import {resolve} from 'node:path'
import postgres from 'postgres'
import {drizzle} from 'drizzle-orm/postgres-js'
import {migrate} from 'drizzle-orm/postgres-js/migrator'
import {describe,beforeAll,afterAll,it,expect,vi} from 'vitest'
import type {ServerContext} from '@/lib/server-context'
import type {Tx} from '@/db'
const runtime=vi.hoisted(()=>({run:vi.fn()}))
vi.mock('@/db',()=>({runInTenant:runtime.run}))
vi.mock('@/server/audit',()=>({writeAudit:vi.fn()}))
vi.mock('@/server/services/activity',()=>({logActivity:vi.fn()}))
vi.mock('@/lib/modules.server',()=>({getEntitledModuleMap:async()=>({finance:false})}))
import {updateQuotationLines} from '@/server/services/quotation-lines'
import {computeQuotation} from '@/server/services/quotation-math'
import {requestStageAdvance} from '@/server/services/stage'
import {assignFunnelProjectCode,sharedProjectCodeImpact,renameSharedProjectCode} from '@/server/services/project-code-assignment'
const url=process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!url)('commit setup transaction',()=>{
 let admin:ReturnType<typeof postgres>,pg:ReturnType<typeof postgres>,name:string
 const tenant=randomUUID(),account=randomUUID(),parent=randomUUID(),pipeline=randomUUID(),early=randomUUID(),commit=randomUUID(),won=randomUUID(),funnel=randomUUID(),quote=randomUUID(),other=randomUUID(),quote2=randomUUID()
 const ctx={tenantId:tenant,memberId:'commit-owner',userId:'commit-owner',isSuperadmin:true,can:()=>true} as unknown as ServerContext
 beforeAll(async()=>{
  const uri=new URL(url!);uri.pathname='/postgres';admin=postgres(uri.toString(),{max:1});name='crm_commit_'+randomBytes(5).toString('hex');await admin.unsafe(`create database "${name}"`);uri.pathname='/'+name;pg=postgres(uri.toString(),{max:2});await migrate(drizzle(pg),{migrationsFolder:resolve(process.cwd(),'db/migrations')})
  await pg`insert into organization(id,name,slug) values(${tenant},'Commit test',${tenant})`
  await pg`insert into "user"(id,name,email) values('commit-owner','Owner','commit@example.invalid')`
  await pg`insert into member(id,organization_id,user_id) values('commit-owner',${tenant},'commit-owner')`
  await pg`insert into tenant_settings(organization_id,entity_code,product_types) values(${tenant},'QM','[{"code":"L","name":"License"}]')`
  await pg`insert into accounts(id,tenant_id,name,code,owner_member_id) values(${account},${tenant},'Customer','ACME','commit-owner')`
  await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name) values(${parent},${tenant},${account},'commit-owner',2026,1,'QMOPP-1','QMOPP-1')`
  const contact=randomUUID()
  await pg`insert into persons(id,tenant_id,account_id,first_name,owner_member_id) values(${contact},${tenant},${account},'Contact','commit-owner')`
  await pg`update opportunities set owner_contact_id=${contact} where id=${parent}`
  await pg`insert into pipelines(id,tenant_id,name) values(${pipeline},${tenant},'Sales')`
  await pg`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,kind,sort_order) values(${early},${tenant},${pipeline},'Start','0e','OPEN',0),(${commit},${tenant},${pipeline},'Commit','4a','OPEN',4),(${won},${tenant},${pipeline},'Won','won','WON',5)`
  for(const [id,q] of [[funnel,quote],[other,quote2]]){
   await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,currency,product_type_code,project_natures) values(${id},${tenant},${parent},'Deal',${account},${pipeline},${early},'commit-owner','MYR','L','["L"]')`
   await pg`insert into quotations(id,tenant_id,funnel_id,quote_number,subtotal,tax_total,total,currency) values(${q},${tenant},${id},${q},100,8,108,'MYR')`
   await pg`update funnels set primary_quotation_id=${q} where id=${id}`
  }
  runtime.run.mockImplementation(async(_tenant:string,work:(tx:Tx)=>unknown)=>drizzle(pg).transaction(async tx=>work(tx as unknown as Tx)))
 },60000)
 afterAll(async()=>{await pg?.end();if(name)await admin.unsafe(`drop database "${name}" with(force)`);await admin?.end()})
 it('blocks bypasses and atomically applies dated schedule with an explicit new code',async()=>{
  await expect(requestStageAdvance(ctx,{funnelId:funnel,targetStageId:commit})).rejects.toThrow('Choose Generate')
  const choice={mode:'new' as const}
  await expect(requestStageAdvance(ctx,{funnelId:funnel,targetStageId:commit,projectCodeChoice:choice,billingSchedule:[{title:'Deposit',amount:'100',expectedInvoiceMonth:'',expectedInvoiceYear:2026}]})).rejects.toThrow('month and year')
  expect((await pg`select project_code from funnels where id=${funnel}`)[0].project_code).toBeNull()
  await expect(requestStageAdvance(ctx,{funnelId:funnel,targetStageId:commit,projectCodeChoice:choice,billingSchedule:[{title:'Deposit',amount:'40',expectedInvoiceMonth:'November',expectedInvoiceYear:2026},{title:'Balance',amount:'60',expectedInvoiceMonth:'December',expectedInvoiceYear:2026}]})).resolves.toEqual({moved:true})
  const [saved]=await pg`select project_code,current_stage_id,expected_invoice_month from funnels where id=${funnel}`
  expect(saved.project_code).toMatch(/^2026-QM-ACME-L-/);expect(saved.current_stage_id).toBe(commit);expect(saved.expected_invoice_month).toBe('November')
  expect(await pg`select id from payment_milestones where funnel_id=${funnel} and deleted_at is null`).toHaveLength(2)
 })
 it('reuses one code across Funnels and edits only the selected Funnel',async()=>{
  const [source]=await pg`select project_code from funnels where id=${funnel}`
  await requestStageAdvance(ctx,{funnelId:other,targetStageId:won,projectCodeChoice:{mode:'existing',code:source.project_code},billingSchedule:[{title:'Full',amount:'100',expectedInvoiceMonth:'January',expectedInvoiceYear:2027}]})
  expect((await pg`select project_code from funnels where id=${other}`)[0].project_code).toBe(source.project_code)
  await drizzle(pg).transaction(tx=>assignFunnelProjectCode(tx as unknown as Tx,ctx,other,{mode:'manual',code:'26-QM-CUSTOM-L-999'}))
  expect((await pg`select project_code from funnels where id=${funnel}`)[0].project_code).toBe(source.project_code)
  expect((await pg`select project_code from funnels where id=${other}`)[0].project_code).toBe('26-QM-CUSTOM-L-999')
 })
 it('rejects clearing nature and unavailable or malicious codes',async()=>{
  await pg`update funnels set current_stage_id=${early},status='open',product_type_code=null where id=${other}`
  await expect(requestStageAdvance(ctx,{funnelId:other,targetStageId:commit,projectCodeChoice:{mode:'new'}})).rejects.toThrow('Project Nature')
  await expect(drizzle(pg).transaction(tx=>assignFunnelProjectCode(tx as unknown as Tx,ctx,other,{mode:'existing',code:'NOT-FOUND'}))).rejects.toThrow('unavailable')
 })
 it('preserves product line identities through draft saves and rejects removing a billed source',async()=>{
  const lineId=randomUUID()
  await pg`insert into quotation_line_items(id,tenant_id,quotation_id,description,quantity,unit_price,line_subtotal,line_total) values(${lineId},${tenant},${quote},'License',1,100,100,108)`
  await pg`update payment_milestones set quotation_line_item_id=${lineId} where funnel_id=${funnel} and deleted_at is null`
  const line={lineId,description:'License renewed',quantity:'1',unitPrice:'100',discountAmount:'0'}
  const totals=computeQuotation({lines:[line],ratePercent:8})
  const save=(lines:typeof line[])=>drizzle(pg).transaction(tx=>updateQuotationLines(tx as unknown as Tx,tenant,quote,lines,totals,null))
  expect(await save([line])).toEqual([lineId])
  expect((await pg`select distinct quotation_line_item_id from payment_milestones where funnel_id=${funnel} and deleted_at is null`)[0].quotation_line_item_id).toBe(lineId)
  await expect(save([])).rejects.toThrow('used by the billing schedule')
  expect((await pg`select id from quotation_line_items where quotation_id=${quote}`)[0].id).toBe(lineId)
 })

 it('links the exact existing legacy code including spaces and punctuation',async()=>{
  const code='2025/QM A&B #1%'
  await pg`update funnels set project_code=${code} where id=${funnel}`
  await drizzle(pg).transaction(tx=>assignFunnelProjectCode(tx as unknown as Tx,ctx,other,{mode:'existing',code}))
  expect((await pg`select project_code from funnels where id=${other}`)[0].project_code).toBe(code)
  const preview=await drizzle(pg).transaction(tx=>sharedProjectCodeImpact(tx as unknown as Tx,ctx,code))
  await drizzle(pg).transaction(tx=>renameSharedProjectCode(tx as unknown as Tx,ctx,code,'26-QM-LEGACY-RENAMED',preview.version))
  expect((await pg`select project_code from funnels where id=${other}`)[0].project_code).toBe('26-QM-LEGACY-RENAMED')
 })
 it('previews and renames a shared code without merging, leaking tenants or rewriting quotations',async()=>{
  const original='26-QM-SHARED-001', renamed='26-QM-SHARED-EDITED'
  await pg`update funnels set project_code=${original},cross_deal_project_code=null where id in (${funnel},${other})`
  await pg`update opportunities set project_code=${original} where id=${parent}`
  const quoteBefore=await pg`select quote_number,status from quotations where id=${quote}`
  const restricted={...ctx,isSuperadmin:false,can:()=>false} as unknown as ServerContext
  await expect(drizzle(pg).transaction(tx=>sharedProjectCodeImpact(tx as unknown as Tx,restricted,original))).rejects.toThrow('FORBIDDEN')
  const salesAdmin={...ctx,isSuperadmin:false,can:(key:string)=>['records.manage_all','opportunity.update'].includes(key)} as unknown as ServerContext
  await expect(drizzle(pg).transaction(tx=>sharedProjectCodeImpact(tx as unknown as Tx,salesAdmin,original))).rejects.toThrow('only administrators')
  await expect(drizzle(pg).transaction(tx=>renameSharedProjectCode(tx as unknown as Tx,salesAdmin,original,renamed,'anything'))).rejects.toThrow('only administrators')
  await expect(drizzle(pg).transaction(tx=>assignFunnelProjectCode(tx as unknown as Tx,salesAdmin,funnel,{mode:'manual',code:renamed}))).rejects.toThrow('only administrators')
  await expect(drizzle(pg).transaction(tx=>assignFunnelProjectCode(tx as unknown as Tx,salesAdmin,funnel,{mode:'bypass',code:renamed} as never))).rejects.toThrow('Invalid Project Code assignment mode')
  const preview=await drizzle(pg).transaction(tx=>sharedProjectCodeImpact(tx as unknown as Tx,ctx,original))
  expect(preview.funnels).toBe(2);expect(preview.opportunities).toBe(1)
  await pg`update funnels set updated_at=updated_at+interval '1 second' where id=${other}`
  await expect(drizzle(pg).transaction(tx=>renameSharedProjectCode(tx as unknown as Tx,ctx,original,renamed,preview.version))).rejects.toThrow('changed')
  await pg`update funnels set cross_deal_project_code='ALREADY-USED' where id=${other}`
  const current=await drizzle(pg).transaction(tx=>sharedProjectCodeImpact(tx as unknown as Tx,ctx,original))
  await expect(drizzle(pg).transaction(tx=>renameSharedProjectCode(tx as unknown as Tx,ctx,original,'ALREADY-USED',current.version))).rejects.toThrow('already exists')
  const foreignTenant=randomUUID(),foreignAccount=randomUUID(),foreignParent=randomUUID()
  await pg`insert into organization(id,name,slug) values(${foreignTenant},'Other tenant',${foreignTenant})`
  await pg`insert into member(id,organization_id,user_id) values(${foreignTenant},${foreignTenant},'commit-owner')`
  await pg`insert into accounts(id,tenant_id,name) values(${foreignAccount},${foreignTenant},'Other account')`
  await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name,project_code) values(${foreignParent},${foreignTenant},${foreignAccount},${foreignTenant},2026,1,'OTHER-1','Other',${original})`
  await drizzle(pg).transaction(tx=>renameSharedProjectCode(tx as unknown as Tx,ctx,original,renamed,current.version))
  expect((await pg`select project_code from funnels where id in (${funnel},${other})`).every(row=>row.project_code===renamed)).toBe(true)
  expect((await pg`select project_code from opportunities where id=${parent}`)[0].project_code).toBe(renamed)
  expect((await pg`select project_code from opportunities where id=${foreignParent}`)[0].project_code).toBe(original)
  expect(await pg`select quote_number,status from quotations where id=${quote}`).toEqual(quoteBefore)
 })

})
