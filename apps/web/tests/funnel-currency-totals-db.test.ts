import { randomBytes, randomUUID } from "node:crypto"
import { resolve } from "node:path"
import postgres, { type Sql } from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
vi.mock("@/lib/modules.server", () => ({ getEntitledModuleMap: async () => ({ finance: false }) }))
import { funnelsList } from "@/lib/api-readers"

const url = process.env.TEST_DATABASE_ADMIN_URL
const integration = url ? describe.sequential : describe.skip
integration("Funnel board full-stage currency totals", () => {
  let admin: Sql, pg: Sql, database: string
  const tenant = "stage-currency-test", account = randomUUID(), opportunity = randomUUID(), pipeline = randomUUID(), stage = randomUUID()
  const ctx = { tenantId: tenant, memberId: "owner", isSuperadmin: true, can: () => true } as unknown as ServerContext
  beforeAll(async () => {
    const uri = new URL(url!); uri.pathname = "/postgres"
    admin = postgres(uri.toString(), { max: 1 }); database = `crm_stage_currency_${randomBytes(5).toString("hex")}`
    await admin.unsafe(`create database "${database}"`)
    uri.pathname = `/${database}`; pg = postgres(uri.toString(), { max: 2 })
    await migrate(drizzle(pg), { migrationsFolder: resolve(process.cwd(), "db/migrations") })
    await pg`insert into organization(id,name,slug) values (${tenant},'Stage currency tests',${tenant})`
    await pg`insert into "user"(id,name,email) values ('owner','Owner','stage@example.invalid')`
    await pg`insert into member(id,organization_id,user_id) values ('owner',${tenant},'owner')`
    await pg`insert into accounts(id,tenant_id,name,owner_member_id) values (${account},${tenant},'Customer','owner')`
    await pg`insert into opportunities(id,tenant_id,account_id,owner_member_id,opportunity_year,opportunity_number,code,name) values (${opportunity},${tenant},${account},'owner',2026,1,'OPP-STAGE','Pursuit')`
    await pg`insert into pipelines(id,tenant_id,name) values (${pipeline},${tenant},'Pipeline')`
    await pg`insert into pipeline_stages(id,tenant_id,pipeline_id,name,code,sort_order,kind) values (${stage},${tenant},${pipeline},'Open','1d',1,'OPEN')`
    for (let index = 0; index < 26; index++) await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,currency,estimated_amount) values (${randomUUID()},${tenant},${opportunity},'Matching deal',${account},${pipeline},${stage},'owner','MYR',100)`
    for (const [estimate,quoted] of [[null,"120"],["0","500"],[null,null]]) await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,currency,estimated_amount,amount) values (${randomUUID()},${tenant},${opportunity},'Matching deal',${account},${pipeline},${stage},'owner','USD',${estimate},${quoted})`
    await pg`insert into funnels(id,tenant_id,opportunity_id,name,account_id,pipeline_id,current_stage_id,owner_member_id,currency,estimated_amount) values (${randomUUID()},${tenant},${opportunity},'Other deal',${account},${pipeline},${stage},'owner','MYR',9999)`
  }, 60000)
  afterAll(async () => { await pg?.end(); if (database) await admin.unsafe(`drop database "${database}" with (force)`); await admin?.end() })
  it("keeps MYR and USD separate, totals beyond page 1, retains zero over quote fallback and honors search", async () => {
    const db = drizzle(pg)
    const read = (offset: number) => db.transaction(tx => funnelsList(tx as unknown as Tx, ctx, {
      limit:25,offset,stageId:stage,query:{search:"Matching",selections:{}}
    }))
    const first = await read(0), second = await read(25)
    expect(first.rows).toHaveLength(25)
    expect(second.rows).toHaveLength(4)
    expect(first.total).toBe(29)
    expect(second.total).toBe(29)
    expect(first.valueTotalsByCurrency).toEqual([{currency:"MYR",total:"2600.00"},{currency:"USD",total:"120.00"}])
    expect(second.valueTotalsByCurrency).toEqual(first.valueTotalsByCurrency)
  })
})
