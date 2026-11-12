import { randomBytes, randomUUID } from "node:crypto"
import { resolve } from "node:path"
import postgres, { type Sql } from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"

const runtime = vi.hoisted(() => ({ transaction: vi.fn() }))
vi.mock("@/lib/actions", () => ({ withTenant: (_permission: string, work: unknown) => runtime.transaction(work), requireContext: vi.fn(), assertCan: vi.fn() }))
vi.mock("@/lib/action-result", () => ({ runAction: async (work: () => Promise<unknown>) => { try { return { ok: true, data: await work() } } catch (error) { return { ok: false, error: String(error) + String(error instanceof Error ? error.cause : "") } } } }))
vi.mock("@/db", () => ({ db: {}, runInTenant: vi.fn() }))
vi.mock("@/lib/modules.server", () => ({ getEntitledModuleMap: async () => ({ finance: false }) }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: async () => ["owner"], canManageAllRecords: () => true, ownsOrManages: () => true, ownerScope: vi.fn() }))
vi.mock("@/server/services/tenant-currency", () => ({ tenantCurrencyForRecord: async (_tx: unknown, _tenant: string, input: string, current: string) => input ?? current, assertCurrencyLock: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { updateOpportunity } from "@/app/(app)/funnel/actions"

const url = process.env.TEST_DATABASE_ADMIN_URL
const integration = url ? describe.sequential : describe.skip
integration("atomic Funnel and linked Opportunity record save", () => {
  let admin: Sql, pg: Sql, database: string
  const tenant = "atomic-record-save", account = randomUUID(), opportunity = randomUUID(), funnel = randomUUID(), pipeline = randomUUID(), stage = randomUUID()
  const ctx = { tenantId: tenant, userId: "owner", memberId: "owner", isSuperadmin: true, can: () => true } as unknown as ServerContext
  beforeAll(async () => {
    const uri = new URL(url!); uri.pathname = "/postgres"
    admin = postgres(uri.toString(), { max: 1 }); database = `crm_atomic_save_${randomBytes(5).toString("hex")}`
    await admin.unsafe(`create database "${database}"`)
    uri.pathname = `/${database}`; pg = postgres(uri.toString(), { max: 2 })
    const db = drizzle(pg)
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "db/migrations") })
    runtime.transaction.mockImplementation((work: (tx: Tx, context: ServerContext) => Promise<unknown>) => db.transaction(tx => work(tx as unknown as Tx, ctx)))
    await pg`insert into organization(id,name,slug) values (${tenant},'Atomic tests',${tenant})`
    await pg`insert into "user"(id,name,email) values ('owner','Owner','atomic@example.invalid')`
    await pg`insert into member(id,organization_id,user_id) values ('owner',${tenant},'owner')`
    await pg`insert into accounts(id,tenant_id,name,owner_member_id) values (${account},${tenant},'Customer','owner')`
    await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name) values (${opportunity},${tenant},${account},'owner',2026,1,'OPP-ATOMIC','Pursuit')`
    await pg`insert into pipelines(id,tenant_id,name) values (${pipeline},${tenant},'Pipeline')`
    await pg`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,sort_order,kind) values (${stage},${tenant},${pipeline},'Open','1d',1,'OPEN')`
    await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,status,estimated_amount) values (${funnel},${tenant},${opportunity},'Original',${account},${pipeline},${stage},'owner','open',100)`
  }, 60000)
  afterAll(async () => { await pg?.end(); if (database) await admin.unsafe(`drop database "${database}" with (force)`); await admin?.end() })
  it("leaves the Funnel and audit unchanged when the linked container patch references an unavailable contact", async () => {
    const beforeAudit = await pg`select count(*) as n from audit_log`
    const result = await updateOpportunity(funnel, { name: "Must roll back", estimatedAmount: "250", opportunityFields: { ownerContactId: randomUUID() } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Cannot attach to an inactive or voided record")
    expect((await pg`select name,estimated_amount from funnels where id=${funnel}`)[0]).toMatchObject({ name: "Original", estimated_amount: "100.00" })
    expect((await pg`select owner_contact_id,total_estimated_funnel_amount from opportunities where id=${opportunity}`)[0]).toMatchObject({ owner_contact_id: null, total_estimated_funnel_amount: null })
    expect(await pg`select count(*) as n from audit_log`).toEqual(beforeAudit)
    expect(runtime.transaction).toHaveBeenCalledTimes(1)
  })
  it("saves both records in one transaction using only the current linked Opportunity", async () => {
    const result = await updateOpportunity(funnel, { name: "Saved together", estimatedAmount: "250", projectNatures: ["WEB"], opportunityFields: { estimatedBudget: "300" } })
    expect(result.ok).toBe(true)
    expect((await pg`select name,estimated_amount,project_natures from funnels where id=${funnel}`)[0]).toMatchObject({ name: "Saved together", estimated_amount: "250.00", project_natures: ["WEB"] })
    expect((await pg`select estimated_budget,total_estimated_funnel_amount from opportunities where id=${opportunity}`)[0]).toMatchObject({ estimated_budget: "300.00", total_estimated_funnel_amount: "250.00" })
    expect(runtime.transaction).toHaveBeenCalledTimes(2)
  })
  it("rolls back an already-updated container when Funnel validation fails", async () => {
    const beforeAudit = await pg`select count(*) as n from audit_log`
    const result = await updateOpportunity(funnel, { recognizedPercent: "101", opportunityFields: { estimatedBudget: "999" } })
    expect(result.ok).toBe(false)
    expect((await pg`select estimated_budget from opportunities where id=${opportunity}`)[0].estimated_budget).toBe("300.00")
    expect((await pg`select project_natures from funnels where id=${funnel}`)[0].project_natures).toEqual(["WEB"])
    expect(await pg`select count(*) as n from audit_log`).toEqual(beforeAudit)
  })

})
