import { randomBytes, randomUUID } from "node:crypto"
import { resolve } from "node:path"
import postgres, { type Sql } from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { PERMISSIONS as P } from "@/lib/permissions"
import { listRelatedVoidRecords, relatedVoidReadSchema, type RelatedVoidCursor } from "@/server/services/related-void-records"
// None of these historical record types is module-gated in the registry.
// Throwing here catches accidental finance/contract entitlement requirements.
vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn(() => { throw new Error("Module is disabled") }) }))
const url = process.env.TEST_DATABASE_ADMIN_URL
const integration = url ? describe.sequential : describe.skip
integration("related historical Void records with actual migrations", () => {
  let server: Sql, pg: Sql, db: ReturnType<typeof drizzle>, database: string
  const tenant = "related-void-tests"
  const account = randomUUID(), foreignParent = randomUUID(), pagedAccount = randomUUID(), reseller = randomUUID(), resellerContract = randomUUID()
  const opportunity = randomUUID(), pipeline = randomUUID(), stage = randomUUID(), funnel = randomUUID()
  const accountOnly = randomUUID(), linkedContract = randomUUID(), deniedContract = randomUUID(), fallbackContract = randomUUID()
  const year = randomUUID(), cancelledYear = randomUUID(), cost = randomUUID()
  const pageIds = Array.from({ length: 25 }, (_, index) => `11111111-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)
  const hiddenIds = Array.from({ length: 30 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)
  const keys = [P.ACCOUNT_VIEW, P.ACCOUNT_UPDATE, P.OPPORTUNITY_VIEW, P.OPPORTUNITY_UPDATE]
  function context(memberId = "sales", permissions: string[] = keys): ServerContext {
    const set = new Set(permissions)
    return { tenantId: tenant, memberId, userId: memberId, userName: memberId, userEmail: `${memberId}@test.invalid`, isSuperadmin: false, status: "active", tenantSuspended: false, subscriptionInactive: false, tierLevel: 20, roleName: "test", permissions: set, can: key => set.has(key) }
  }
  const rep = context()
  const work = <T>(fn: (tx: Tx) => Promise<T>) => db.transaction(async tx => {
    await tx.execute(sql`select set_config('app.current_tenant', ${tenant}, true)`)
    return fn(tx as unknown as Tx)
  })
  beforeAll(async () => {
    if (!url) throw new Error("TEST_DATABASE_ADMIN_URL required")
    const uri = new URL(url); uri.pathname = "/postgres"
    server = postgres(uri.toString(), { max: 1 })
    database = `crm_related_void_${randomBytes(5).toString("hex")}`
    await server.unsafe(`create database "${database}"`)
    uri.pathname = `/${database}`
    pg = postgres(uri.toString(), { max: 3 }); db = drizzle(pg)
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "db/migrations") })
    await pg`insert into organization(id,name,slug) values (${tenant},'Related Void tests',${tenant})`
    for (const id of ["sales", "other"]) {
      await pg`insert into "user"(id,name,email) values (${id},${id},${`${id}@test.invalid`})`
      await pg`insert into member(id,organization_id,user_id) values (${id},${tenant},${id})`
      await pg`insert into membership_profiles(member_id,tenant_id,status) values (${id},${tenant},'active')`
    }
    for (const [id, owner] of [[account, "sales"], [foreignParent, "other"], [pagedAccount, "sales"]]) {
      await pg`insert into accounts(id,tenant_id,name,owner_member_id) values (${id},${tenant},'Customer',${owner})`
    }
    await pg`insert into accounts(id,tenant_id,name,owner_member_id,account_type) values (${reseller},${tenant},'Shared reseller','other','reseller')`
    await pg`insert into contracts(id,tenant_id,account_id,name,owner_member_id) values (${resellerContract},${tenant},${reseller},'Owned reseller contract','sales')`
    await pg`insert into contracts(tenant_id,account_id,name,owner_member_id) values (${tenant},${reseller},'Inaccessible reseller contract','other')`
    await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name) values (${opportunity},${tenant},${account},'sales',2026,1,'OPP-26-RV','Historical pursuit')`
    await pg`insert into pipelines(id,tenant_id,name) values (${pipeline},${tenant},'Pipeline')`
    await pg`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,sort_order,kind) values (${stage},${tenant},${pipeline},'Open','1d',1,'OPEN')`
    await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,status) values (${funnel},${tenant},${opportunity},'Legacy funnel',${account},${pipeline},${stage},'sales','open')`
    await pg`insert into contracts(id,tenant_id,account_id,name,owner_member_id) values (${accountOnly},${tenant},${account},'Account-only historical contract','sales')`
    await pg`insert into contracts(id,tenant_id,account_id,funnel_id,name,owner_member_id) values (${linkedContract},${tenant},${account},${funnel},'Linked historical contract','sales')`
    await pg`insert into contracts(id,tenant_id,account_id,funnel_id,name,owner_member_id) values (${deniedContract},${tenant},${account},${funnel},'Other owner contract','other')`
    await pg`insert into contracts(id,tenant_id,account_id,funnel_id,name) values (${fallbackContract},${tenant},${account},${funnel},'Fallback funnel owner')`
    await pg`insert into contracts(tenant_id,account_id,name,owner_member_id) values (${tenant},${foreignParent},'Owned child on inaccessible parent','sales')`
    await pg`insert into contract_years(id,tenant_id,funnel_id,year,title,amount) values (${year},${tenant},${funnel},2026,'Hidden contract year',100)`
    await pg`insert into contract_years(id,tenant_id,funnel_id,year,title,status,amount) values (${cancelledYear},${tenant},${funnel},2027,'Cancelled year','cancelled',100)`
    await pg`insert into deal_costs(id,tenant_id,funnel_id,supplier_name,amount) values (${cost},${tenant},${funnel},'Finance-disabled historical cost',20)`
    await pg`insert into contracts(tenant_id,account_id,name,owner_member_id,deleted_at) values (${tenant},${account},'Deleted contract','sales',now())`
    await pg`insert into deal_costs(tenant_id,funnel_id,supplier_name,amount,deleted_at) values (${tenant},${funnel},'Deleted cost',20,now())`
    await pg`insert into contract_years(tenant_id,funnel_id,year,title,amount,deleted_at) values (${tenant},${funnel},2028,'Deleted year',20,now())`
    for (const id of pageIds) await pg`insert into contracts(id,tenant_id,account_id,name,owner_member_id) values (${id},${tenant},${pagedAccount},${`Accessible ${id}`},'sales')`
    for (const id of hiddenIds) await pg`insert into contracts(id,tenant_id,account_id,name,owner_member_id) values (${id},${tenant},${pagedAccount},'Inaccessible','other')`
  }, 60000)
  afterAll(async () => {
    await pg?.end()
    if (database) await server.unsafe(`drop database "${database}" with (force)`)
    await server?.end()
  })
  it("finds an account-only contract without requiring a funnel or detail page", async () => {
    const result = await work(tx => listRelatedVoidRecords(tx, rep, { type: "account", id: account }))
    expect(result.rows.map(row => row.id).sort()).toEqual([accountOnly, linkedContract, fallbackContract].sort())
    expect(result.rows.find(row => row.id === accountOnly)).toMatchObject({ type: "contract", label: "Account-only historical contract", href: null })
    expect(result.nextCursor).toBeNull()
  })
  it("finds hidden active years and finance-disabled costs with registry labels and ownership", async () => {
    const result = await work(tx => listRelatedVoidRecords(tx, rep, { type: "funnel", id: funnel }))
    expect(result.rows.map(row => row.id).sort()).toEqual([linkedContract, fallbackContract, year, cost].sort())
    expect(result.rows.map(row => row.type)).toEqual(["contract", "contract", "contract_year", "deal_cost"])
    expect(result.rows.find(row => row.id === year)).toMatchObject({ type: "contract_year", label: "Hidden contract year", href: `/funnel/${funnel}` })
    expect(result.rows.find(row => row.id === cost)).toMatchObject({ type: "deal_cost", label: "Finance-disabled historical cost", amount: "20" })
    expect(result.rows.some(row => row.id === cancelledYear || row.id === deniedContract)).toBe(false)
  })
  it("requires independent child view and request permissions even for an owned account", async () => {
    for (const permissions of [[P.ACCOUNT_VIEW, P.ACCOUNT_UPDATE], [P.ACCOUNT_VIEW, P.ACCOUNT_UPDATE, P.OPPORTUNITY_VIEW], [P.ACCOUNT_VIEW, P.ACCOUNT_UPDATE, P.OPPORTUNITY_UPDATE]]) {
      expect(await work(tx => listRelatedVoidRecords(tx, context("sales", permissions), { type: "account", id: account }))).toEqual({ rows: [], nextCursor: null })
    }
  })
  it("permits owned contract cleanup with Account view and independent child permissions", async () => {
    const readParent = context("sales", [P.ACCOUNT_VIEW, P.OPPORTUNITY_VIEW, P.OPPORTUNITY_UPDATE])
    const result = await work(tx => listRelatedVoidRecords(tx, readParent, { type: "account", id: account }))
    expect(result.rows.map(row => row.id).sort()).toEqual([accountOnly, linkedContract, fallbackContract].sort())
  })
  it("uses shared reseller parent read access without broadening child ownership", async () => {
    const readParent = context("sales", [P.ACCOUNT_VIEW, P.OPPORTUNITY_VIEW, P.OPPORTUNITY_UPDATE])
    const result = await work(tx => listRelatedVoidRecords(tx, readParent, { type: "account", id: reseller }))
    expect(result.rows.map(row => row.id)).toEqual([resellerContract])
    await expect(work(tx => listRelatedVoidRecords(tx, readParent, { type: "account", id: foreignParent }))).rejects.toThrow(/not available/)
  })
  it("checks parent view, client ownership and tenant access before loading children", async () => {
    await expect(work(tx => listRelatedVoidRecords(tx, context("sales", [P.ACCOUNT_UPDATE, P.OPPORTUNITY_VIEW, P.OPPORTUNITY_UPDATE]), { type: "account", id: account }))).rejects.toThrow(/permissions/)
    await expect(work(tx => listRelatedVoidRecords(tx, rep, { type: "account", id: foreignParent }))).rejects.toThrow(/not available/)
    await expect(work(tx => listRelatedVoidRecords(tx, {...rep, tenantId: "foreign-tenant"}, { type: "account", id: account }))).rejects.toThrow(/not available/)
  })
  it("filters inaccessible children before its 20-row page and never leaks their IDs in cursors", async () => {
    let after: RelatedVoidCursor | undefined
    const found: string[] = []
    const sizes: number[] = []
    do {
      const page = await work(tx => listRelatedVoidRecords(tx, rep, { type: "account", id: pagedAccount }, after))
      sizes.push(page.rows.length)
      found.push(...page.rows.map(row => row.id))
      if (page.nextCursor) {
        expect(page.rows.at(-1)).toMatchObject(page.nextCursor)
        expect(hiddenIds).not.toContain(page.nextCursor.id)
      }
      after = page.nextCursor ?? undefined
    } while (after)
    expect(sizes).toEqual([20, 5])
    expect(found).toEqual(pageIds)
    expect(new Set(found).size).toBe(25)
  })
  it("allows only contextual parent types and typed UUID cursors", () => {
    expect(relatedVoidReadSchema.safeParse({ parent: { type: "contract", id: account } }).success).toBe(false)
    expect(relatedVoidReadSchema.safeParse({ parent: { type: "account", id: account }, after: { type: "account", id: cost } }).success).toBe(false)
    expect(relatedVoidReadSchema.safeParse({ parent: { type: "account", id: account }, after: { type: "deal_cost", id: "not-a-uuid" } }).success).toBe(false)
  })
})
