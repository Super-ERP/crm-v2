import {randomUUID} from 'node:crypto'
import postgres from 'postgres'
import {drizzle} from 'drizzle-orm/postgres-js'
import {sql} from 'drizzle-orm'
import {describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({runInTenant:vi.fn(),requireContext:vi.fn()}))
vi.mock('@/db',()=>({runInTenant:mocks.runInTenant}))
vi.mock('@/lib/server-context',()=>({requireContext:mocks.requireContext,assertCan:vi.fn()}))
vi.mock('@/lib/access-scope',()=>({canAccessAttachable:vi.fn()}))
vi.mock('@/server/services/stage',()=>({decideApproval:vi.fn()}))
vi.mock('@/lib/action-result',()=>({runAction:vi.fn()}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import {listIncomingApprovals} from '@/app/(app)/approvals/actions'
const databaseUrl=process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)('stage approval queue SQL projection',()=>{
 it('searches scoped requests, preserves microseconds and full totals after an exhausted cursor',async()=>{
  const client=postgres(databaseUrl!,{max:1}),schema=`queue_${randomUUID().replaceAll('-','')}`
  const first='ffffffff-ffff-4fff-8fff-ffffffffffff',second='00000000-0000-4000-8000-000000000000'
  try{
   await client.unsafe(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}";
    CREATE TABLE stage_approval_requests(id uuid,funnel_id uuid,requester_member_id text,approver_member_id text,from_stage_id uuid,target_stage_id uuid,reason text,status text,decision_note text,requested_at timestamptz,decided_at timestamptz);
    CREATE TABLE funnels(id uuid,name text);CREATE TABLE pipeline_stages(id uuid,name text);
    CREATE TABLE member(id text,user_id text,organization_id text);CREATE TABLE "user"(id text,name text);
    INSERT INTO member VALUES('rep','u-rep','tenant'),('manager','u-manager','tenant');INSERT INTO "user" VALUES('u-rep','Salesperson'),('u-manager','Manager');`)
   const funnel=randomUUID(),stage=randomUUID()
   await client`INSERT INTO funnels VALUES(${funnel},'Analytics renewal')`
   await client`INSERT INTO pipeline_stages VALUES(${stage},'Commit')`
   await client`INSERT INTO stage_approval_requests VALUES
    (${first},${funnel},'rep','manager',null,${stage},'Ready','pending',null,'2026-10-15 08:00:00.000001+00',null),
    (${second},${funnel},'rep','manager',null,${stage},'Ready','pending',null,'2026-10-15 08:00:00.000002+00',null)`
   const db=drizzle(client)
   mocks.requireContext.mockResolvedValue({tenantId:'tenant',memberId:'manager',isSuperadmin:false,can:()=>true})
   mocks.runInTenant.mockImplementation(async(_tenant,work)=>db.transaction(async tx=>{await tx.execute(sql`SELECT set_config('app.current_tenant','tenant',true)`);return work(tx)}))
   const page=await listIncomingApprovals(0,{order:'oldest',search:'Salesperson'})
   expect(page.rows.map(r=>r.id)).toEqual([first,second]);expect(page.total).toBe(2)
   expect(BigInt(page.rows[1].queueSortKey!)-BigInt(page.rows[0].queueSortKey!)).toBe(BigInt(1))
   const cursor={kind:'stage' as const,id:first,queueSortKey:page.rows[0].queueSortKey!}
   const next=await listIncomingApprovals(0,{order:'oldest',search:'Salesperson',cursor})
   expect(next.rows.map(r=>r.id)).toEqual([second]);expect(next.total).toBe(2)
   const exhausted=await listIncomingApprovals(0,{order:'oldest',cursor:{...cursor,id:second,queueSortKey:page.rows[1].queueSortKey!}})
   expect(exhausted.rows).toEqual([]);expect(exhausted.total).toBe(2)
   expect((await listIncomingApprovals(0,{order:'oldest',search:'no such account'})).total).toBe(0)
  }finally{await client.unsafe('SET search_path TO public');await client.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await client.end()}
 })
})
