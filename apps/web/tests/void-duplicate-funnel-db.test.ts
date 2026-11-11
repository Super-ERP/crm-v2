import { randomBytes, randomUUID } from "node:crypto"
import postgres, { type Sql } from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql as query } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"

const mocks = vi.hoisted(() => ({ audit: vi.fn(), activity: vi.fn() }))
vi.mock("@/lib/access-scope", () => ({
  visibleMemberIds: vi.fn(async () => ["manager"]),
  canManageAllRecords: () => false,
  ownsOrManages: (visible: string[], owner: string) => visible.includes(owner),
}))
vi.mock("@/server/audit", () => ({ writeAudit: mocks.audit }))
vi.mock("@/server/services/activity", () => ({ logActivity: mocks.activity }))
import { requestFunnelVoid, decideFunnelVoid } from "@/server/services/funnel-void-approval"
import { visibleMemberIds } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"
import { recomputeOpportunityTotal } from "@/server/services/opportunity-container"
import { milestoneReadScope } from "@/server/services/milestone-access"
import { voidDuplicateWonFunnel } from "@/server/services/void-duplicate-funnel"

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL
const integration = adminUrl || process.env.REQUIRE_QUOTATION_DB_TESTS === "1" ? describe.sequential : describe.skip
integration("void duplicate PostgreSQL boundary", () => {
  let server: Sql
  let dbSql: Sql
  let db: ReturnType<typeof drizzle>
  let databaseName: string
  const tenant = "void-test"
  const source = randomUUID(), retained = randomUUID(), customer = randomUUID(), parent = randomUUID(), stage = randomUUID(), quote = randomUUID(), milestone = randomUUID()
  const ctx = { tenantId: tenant, memberId: "manager", userId: "user", can: () => true } as unknown as ServerContext
  const input = { funnelId: source, retainedFunnelId: retained, reason: "Duplicate import" }
  const run = (context = ctx, data = input) => db.transaction(tx => voidDuplicateWonFunnel(tx as unknown as Tx, context, data))

  beforeAll(async () => {
    if (!adminUrl) throw new Error("TEST_DATABASE_ADMIN_URL is required")
    const root = new URL(adminUrl); root.pathname = "/postgres"
    server = postgres(root.toString(), { max: 1 })
    databaseName = `crm_void_${randomBytes(6).toString("hex")}`
    await server.unsafe(`create database "${databaseName}"`)
    root.pathname = `/${databaseName}`
    dbSql = postgres(root.toString(), { max: 4 })
    db = drizzle(dbSql)
    await dbSql.unsafe(`
      create table member(id text primary key,organization_id text);
      create table membership_profiles(member_id text,tenant_id text,status text);
      create table member_roles(member_id text,tenant_id text,role_id uuid);
      create table roles(id uuid,tenant_id text);
      create table role_permissions(role_id uuid,tenant_id text,permission_id uuid);
      create table permissions(id uuid,key text);
      create type approval_status as enum ('pending','approved','rejected','cancelled');
      create table funnel_void_requests(id uuid primary key default gen_random_uuid(),tenant_id text,funnel_id uuid,retained_funnel_id uuid,requester_member_id text,owner_member_id text,reason text,status approval_status default 'pending',decision_note text,decided_by_member_id text,requested_at timestamptz default now(),decided_at timestamptz);
      create unique index funnel_void_one_pending on funnel_void_requests(tenant_id,funnel_id) where status='pending';
      create table pipeline_stages(id uuid primary key,tenant_id text,kind text,code text default 'won');
      create table funnels(id uuid primary key,tenant_id text,name text,account_id uuid,currency text,opportunity_id uuid,owner_member_id text,status text,current_stage_id uuid,estimated_amount numeric,deleted_at timestamptz,updated_at timestamptz);
      create table quotations(id uuid primary key,tenant_id text,funnel_id uuid,status text,is_primary boolean,deleted_at timestamptz,updated_at timestamptz);
      create table projects(id uuid primary key,tenant_id text,funnel_id uuid,quotation_id uuid,deleted_at timestamptz,owner_member_id text);
      create table payment_milestones(id uuid primary key,tenant_id text,funnel_id uuid,quotation_id uuid,project_id uuid,status text,invoice_number text,invoice_date date,so_number text);
      create table finance_docs(id uuid,tenant_id text,milestone_id uuid);
      create table contracts(id uuid,tenant_id text,funnel_id uuid);
      create table contract_years(id uuid,tenant_id text,funnel_id uuid);
      create table deal_costs(id uuid,tenant_id text,funnel_id uuid);
      create table intercompany_deal_parties(id uuid,funnel_id uuid);
      create table intercompany_deals(id uuid,funnel_id uuid);
      create table stage_approval_requests(id uuid,tenant_id text,funnel_id uuid,status text,decided_at timestamptz,decision_note text,updated_at timestamptz);
      create table opportunities(id uuid primary key,tenant_id text,estimated_totals_by_currency jsonb,total_estimated_funnel_amount numeric,updated_at timestamptz,deleted_at timestamptz);
      create table audit_log(tenant_id text,action text,"after" jsonb);
      create table activity_test(entity_id uuid,body text);
      alter table funnels add foreign key(opportunity_id) references opportunities(id);
    `)
  }, 30_000)
  afterAll(async () => {
    await dbSql?.end()
    if (databaseName) await server.unsafe(`drop database "${databaseName}" with (force)`)
    await server?.end()
  })
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(visibleMemberIds).mockResolvedValue(["manager"])
    await dbSql.unsafe("truncate member,membership_profiles,member_roles,roles,role_permissions,permissions,funnel_void_requests,pipeline_stages,funnels,quotations,projects,payment_milestones,finance_docs,contracts,contract_years,deal_costs,intercompany_deal_parties,intercompany_deals,stage_approval_requests,opportunities,audit_log,activity_test")
    const role = randomUUID(), permission = randomUUID(), updatePermission = randomUUID(), viewPermission = randomUUID()
    await dbSql`insert into member values ('manager',${tenant}),('sales-admin',${tenant})`
    await dbSql`insert into membership_profiles values ('manager',${tenant},'active'),('sales-admin',${tenant},'active')`
    await dbSql`insert into roles values (${role},${tenant})`
    await dbSql`insert into permissions values (${permission},'funnel.void.approve'),(${updatePermission},'opportunity.update'),(${viewPermission},'opportunity.view')`
    await dbSql`insert into member_roles values ('sales-admin',${tenant},${role}),('manager',${tenant},${role})`
    await dbSql`insert into role_permissions values (${role},${tenant},${permission}),(${role},${tenant},${updatePermission}),(${role},${tenant},${viewPermission})`
    await dbSql`insert into pipeline_stages(id,tenant_id,kind) values (${stage},${tenant},'WON')`
    await dbSql`insert into opportunities(id,tenant_id,total_estimated_funnel_amount) values (${parent},${tenant},200)`
    for (const id of [source,retained]) await dbSql`insert into funnels(id,tenant_id,name,account_id,currency,opportunity_id,owner_member_id,status,current_stage_id,estimated_amount) values (${id},${tenant},${id===source?'Duplicate':'Correct deal'},${customer},'MYR',${parent},'manager','won',${stage},100)`
    await dbSql`insert into quotations(id,tenant_id,funnel_id,status,is_primary) values (${quote},${tenant},${source},'accepted',true)`
    await dbSql`insert into payment_milestones(id,tenant_id,funnel_id,quotation_id,status) values (${milestone},${tenant},${source},${quote},'pending_invoicing')`
    await dbSql`insert into stage_approval_requests(id,tenant_id,funnel_id,status) values (${randomUUID()},${tenant},${source},'pending')`
    mocks.audit.mockImplementation(async (tx: Tx, context: ServerContext, entry: {action:string;after:unknown}) => tx.execute(query`insert into audit_log values (${context.tenantId},${entry.action},${JSON.stringify(entry.after)}::jsonb)`))
    mocks.activity.mockImplementation(async (tx: Tx, _context: ServerContext, entry: {entityId:string;body:string}) => tx.execute(query`insert into activity_test values (${entry.entityId},${entry.body})`))
  })

  it("archives atomically, preserves history, cancels stale requests and removes the duplicate from totals", async () => {
    const visibleMilestones = () => db.transaction(async tx => tx.execute(query`select id from payment_milestones where ${await milestoneReadScope(tx as unknown as Tx, ctx)}`))
    expect(await visibleMilestones()).toHaveLength(1)
    expect(await run()).toMatchObject({ retainedFunnelId: retained, archivedQuotationCount: 1 })
    expect((await dbSql`select id from funnels where deleted_at is null`).map(row=>row.id)).toEqual([retained])
    expect((await dbSql`select status,deleted_at,is_primary from quotations where id=${quote}`)[0]).toMatchObject({status:"accepted",is_primary:false,deleted_at:expect.anything()})
    expect((await dbSql`select * from payment_milestones where id=${milestone}`)[0].status).toBe("pending_invoicing")
    expect(await visibleMilestones()).toHaveLength(0)
    expect(await dbSql`select id from quotations where deleted_at is null`).toHaveLength(0)
    expect((await dbSql`select status from stage_approval_requests`)[0].status).toBe("cancelled")
    expect(Number((await dbSql`select total_estimated_funnel_amount from opportunities`)[0].total_estimated_funnel_amount)).toBe(100)
    expect((await dbSql`select "after" from audit_log`)[0].after).toMatchObject({retainedFunnelId:retained,reason:input.reason})
    expect(await dbSql`select * from activity_test`).toHaveLength(2)
    await expect(run()).rejects.toThrow("not already voided")
  })
  it.each(["permission","owner","tenant","customer","currency","status","stage"])("rejects invalid %s without writes", async kind => {
    let context = ctx
    if (kind === "permission") context = {...ctx,can:()=>false}
    if (kind === "tenant") context = {...ctx,tenantId:"other"}
    if (kind === "owner") await dbSql`update funnels set owner_member_id='peer' where id=${retained}`
    if (kind === "customer") await dbSql`update funnels set account_id=${randomUUID()} where id=${retained}`
    if (kind === "currency") await dbSql`update funnels set currency='SGD' where id=${retained}`
    if (kind === "status") await dbSql`update funnels set status='lost' where id=${source}`
    if (kind === "stage") await dbSql`update pipeline_stages set kind='OPEN'`
    await expect(run(context)).rejects.toThrow()
    expect(await dbSql`select id from funnels where deleted_at is not null`).toHaveLength(0)
    expect(await dbSql`select * from audit_log`).toHaveLength(0)
  })
  it.each(["project","quote_project","invoice","legacy_invoice","finance","contract","schedule","cost","intercompany","mirror","crosslink","foreign_quote","project_milestone","retained_history"])("blocks linked %s", async kind => {
    if (kind === "project") await dbSql`insert into projects(id,tenant_id,funnel_id,quotation_id,deleted_at) values (${randomUUID()},${tenant},${source},null,now())`
    if (kind === "quote_project") await dbSql`insert into projects(id,tenant_id,funnel_id,quotation_id,deleted_at) values (${randomUUID()},${tenant},${retained},${quote},null)`
    if (kind === "invoice") await dbSql`update payment_milestones set status='invoiced'`
    if (kind === "legacy_invoice") await dbSql`update payment_milestones set invoice_number='INV-1'`
    if (kind === "finance") await dbSql`insert into finance_docs values (${randomUUID()},${tenant},${milestone})`
    if (kind === "contract") await dbSql`insert into contracts values (${randomUUID()},${tenant},${source})`
    if (kind === "schedule") await dbSql`insert into contract_years values (${randomUUID()},${tenant},${source})`
    if (kind === "cost") await dbSql`insert into deal_costs values (${randomUUID()},${tenant},${source})`
    if (kind === "intercompany") await dbSql`insert into intercompany_deal_parties values (${randomUUID()},${source})`
    if (kind === "mirror") await dbSql`insert into intercompany_deals values (${randomUUID()},${source})`
    if (kind === "crosslink") await dbSql`update payment_milestones set funnel_id=${retained}`
    if (kind === "foreign_quote") {
      const otherQuote = randomUUID()
      await dbSql`insert into quotations(id,tenant_id,funnel_id,status) values (${otherQuote},${tenant},${retained},'draft')`
      await dbSql`update payment_milestones set quotation_id=${otherQuote}`
    }
    if (kind === "project_milestone") {
      const otherProject = randomUUID()
      await dbSql`insert into projects(id,tenant_id,funnel_id) values (${otherProject},${tenant},${retained})`
      await dbSql`update payment_milestones set quotation_id=null,project_id=${otherProject}`
    }
    if (kind === "retained_history") await dbSql`insert into audit_log values (${tenant},'funnel.duplicate_voided',${JSON.stringify({retainedFunnelId:source})}::jsonb)`
    await expect(run()).rejects.toThrow("require review first")
    expect(await dbSql`select id from quotations where deleted_at is not null`).toHaveLength(0)
    expect(await dbSql`select id from funnels where deleted_at is not null`).toHaveLength(0)
  })
  it("rolls archival and totals back if audit writing fails", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("audit failure"))
    await expect(run()).rejects.toThrow("audit failure")
    expect(await dbSql`select id from funnels where deleted_at is not null`).toHaveLength(0)
    expect(await dbSql`select id from quotations where deleted_at is not null`).toHaveLength(0)
    expect((await dbSql`select total_estimated_funnel_amount from opportunities`)[0].total_estimated_funnel_amount).toBe("200")
    expect((await dbSql`select status from stage_approval_requests`)[0].status).toBe("pending")
  })
  it("serializes two void attempts so only one is recorded", async () => {
    const result = await Promise.allSettled([run(),run()])
    expect(result.filter(item=>item.status==='fulfilled')).toHaveLength(1)
    expect(await dbSql`select * from audit_log`).toHaveLength(1)
  })
  it("cannot void both sides of opposing duplicate corrections", async () => {
    const result = await Promise.allSettled([run(), run(ctx, {...input, funnelId: retained, retainedFunnelId: source})])
    expect(result.filter(item=>item.status==='fulfilled')).toHaveLength(1)
    expect(await dbSql`select id from funnels where deleted_at is null`).toHaveLength(1)
  })
  it("rechecks invoicing after waiting for a concurrent milestone write", async () => {
    let release!: () => void
    let locked!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const ready = new Promise<void>(resolve => { locked = resolve })
    const invoice = db.transaction(async tx => {
      await tx.execute(query`select id from funnels where id=${source} for update`)
      locked()
      await gate
      await tx.execute(query`update payment_milestones set status='invoiced' where id=${milestone}`)
    })
    await ready
    const correction = run()
    release()
    await invoice
    await expect(correction).rejects.toThrow("invoicing history")
    expect(await dbSql`select id from funnels where deleted_at is not null`).toHaveLength(0)
  })

  it("serializes parent totals against a concurrent edit to a third sibling funnel", async () => {
    const third = randomUUID()
    await dbSql`insert into funnels(id,tenant_id,name,account_id,currency,opportunity_id,owner_member_id,status,current_stage_id,estimated_amount) values (${third},${tenant},'Sibling',${customer},'MYR',${parent},'manager','won',${stage},100)`
    await dbSql`update opportunities set total_estimated_funnel_amount=300`
    let release!: () => void, reached!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const audited = new Promise<void>(resolve => { reached = resolve })
    const originalAudit = mocks.audit.getMockImplementation()!
    mocks.audit.mockImplementation(async (...args) => { await originalAudit(...args); reached(); await gate })
    const correction = run()
    await audited
    let started!: (pid: number) => void
    const pidReady = new Promise<number>(resolve => { started = resolve })
    const edit = db.transaction(async tx => {
      const pid = await tx.execute(query`select pg_backend_pid() as pid`)
      started(Number(pid[0].pid))
      await tx.execute(query`update funnels set estimated_amount=150 where id=${third}`)
      await recomputeOpportunityTotal(tx as unknown as Tx, tenant, parent)
    })
    const pid = await pidReady
    try {
      let waiting = false
      for (let attempt = 0; attempt < 200; attempt++) {
        const [state] = await dbSql`select cardinality(pg_blocking_pids(${pid})) > 0 as waiting`
        if (state.waiting) { waiting = true; break }
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      expect(waiting).toBe(true)
    } finally { release() }
    await Promise.all([correction, edit])
    expect(Number((await dbSql`select total_estimated_funnel_amount from opportunities`)[0].total_estimated_funnel_amount)).toBe(250)
  }, 15_000)

  it("allows concurrent child inserts while serializing the cached parent total", async () => {
    let inserted = 0, release!: () => void
    const bothInserted = new Promise<void>(resolve => { release = resolve })
    const createChild = () => db.transaction(async tx => {
      await tx.execute(query`insert into funnels(id,tenant_id,name,account_id,currency,opportunity_id,owner_member_id,status,current_stage_id,estimated_amount) values (${randomUUID()},${tenant},'New child',${customer},'MYR',${parent},'manager','open',${stage},50)`)
      if (++inserted === 2) release()
      await bothInserted
      await recomputeOpportunityTotal(tx as unknown as Tx, tenant, parent)
    })
    await Promise.all([createChild(),createChild()])
    expect(Number((await dbSql`select total_estimated_funnel_amount from opportunities`)[0].total_estimated_funnel_amount)).toBe(300)
  }, 15_000)

  const rep = {...ctx, can: (key:string) => [PERMISSIONS.OPPORTUNITY_UPDATE,PERMISSIONS.OPPORTUNITY_VIEW].includes(key as never)} as ServerContext
  const admin = {...ctx, memberId:'sales-admin'} as ServerContext
  const request = () => db.transaction(tx => requestFunnelVoid(tx as unknown as Tx,rep,input))
  const decide = (id:string,approve=true,note='',context=admin) => db.transaction(tx => decideFunnelVoid(tx as unknown as Tx,context,id,approve,note))
  it('sales requests preserve the funnel until Sales Admin approves, with history and no self approval',async()=>{
    const id=await request()
    expect((await dbSql`select deleted_at from funnels where id=${source}`)[0].deleted_at).toBeNull()
    await expect(decide(id,true,'',rep)).rejects.toThrow(/FORBIDDEN/)
    await expect(decide(id,true,'',ctx)).rejects.toThrow(/own request/)
    await expect(request()).rejects.toThrow(/already awaiting/)
    await decide(id)
    expect((await dbSql`select status,decided_by_member_id from funnel_void_requests where id=${id}`)[0]).toMatchObject({status:'approved',decided_by_member_id:'sales-admin'})
    expect((await dbSql`select deleted_at from funnels where id=${source}`)[0].deleted_at).not.toBeNull()
    await expect(decide(id)).rejects.toThrow(/no longer pending/)
  })
  it('rejects with a reason without archiving and permits a corrected request',async()=>{
    const id=await request()
    await expect(decide(id,false,' ')).rejects.toThrow(/reason/)
    await decide(id,false,'Wrong duplicate')
    expect((await dbSql`select status from funnel_void_requests where id=${id}`)[0].status).toBe('rejected')
    expect((await dbSql`select deleted_at from funnels where id=${source}`)[0].deleted_at).toBeNull()
    expect(await request()).toBeTruthy()
  })
  it('rechecks newly linked invoices atomically before approval',async()=>{
    const id=await request()
    await dbSql`update payment_milestones set status='invoiced' where id=${milestone}`
    await expect(decide(id)).rejects.toThrow(/invoicing/)
    expect((await dbSql`select status from funnel_void_requests where id=${id}`)[0].status).toBe('pending')
    expect((await dbSql`select deleted_at from funnels where id=${source}`)[0].deleted_at).toBeNull()
  })
  it('rejects stale ownership and disabled requesters',async()=>{
    const id=await request()
    await dbSql`update funnels set owner_member_id='other' where id=${source}`
    await expect(decide(id)).rejects.toThrow(/access|owner changed/)
    await dbSql`update funnels set owner_member_id='manager' where id=${source}`
    await dbSql`update membership_profiles set status='disabled' where member_id='manager'`
    await expect(decide(id)).rejects.toThrow(/no longer active/)
  })
  it('does not submit without an active other Sales Admin',async()=>{
    await dbSql`update membership_profiles set status='disabled' where member_id='sales-admin'`
    await expect(request()).rejects.toThrow(/No other active Sales Admin/)
    expect(await dbSql`select id from funnel_void_requests`).toHaveLength(0)
  })

  it('fails submission when the only Sales Admin lacks record scope or view permission',async()=>{
    vi.mocked(visibleMemberIds).mockImplementation(async (_tx,context)=>context.memberId==='sales-admin'?['sales-admin']:['manager'])
    await expect(request()).rejects.toThrow(/No other active Sales Admin/)
    vi.mocked(visibleMemberIds).mockResolvedValue(['manager'])
    await dbSql`delete from role_permissions where permission_id in (select id from permissions where key='opportunity.view')`
    await expect(request()).rejects.toThrow(/No other active Sales Admin/)
  })
  it('rechecks requester retained-funnel access even when the reviewer still has access',async()=>{
    const id=await request()
    await dbSql`update funnels set owner_member_id='other' where id=${retained}`
    vi.mocked(visibleMemberIds).mockImplementation(async (_tx,context)=>context.memberId==='sales-admin'?['manager','other']:['manager'])
    await expect(decide(id)).rejects.toThrow(/Requester no longer has access/)
    expect((await dbSql`select status from funnel_void_requests where id=${id}`)[0].status).toBe('pending')
  })

})
