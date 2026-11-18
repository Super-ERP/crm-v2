import { randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { getTableConfig } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"
import * as schema from "@/db/schema"
import type { Tx } from "@/lib/actions"
const runtime = vi.hoisted(() => ({ tx: null as unknown as Tx }))
vi.mock("@/lib/actions", () => ({ withTenant: async (_permission: string, work: (tx: Tx, ctx: object) => unknown) => work(runtime.tx, { tenantId: "clarity" }), withModule: async (_module: string, _permission: string, work: (tx: Tx, ctx: object) => unknown) => work(runtime.tx, { tenantId: "clarity" }) }))
vi.mock("@/db", () => ({ db: {}, runInTenant: vi.fn() }))
vi.mock("@/server/services/milestone-access", () => ({ milestoneReadScope: async () => sql`true` }))
import { getPaymentMilestone } from "@/app/(app)/payment-milestones/actions"
import { listFinanceSources } from "@/app/(app)/billing/actions"
const url = process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!url)("finance clarity source resolution", () => {
  it("resolves quote, Funnel and legacy Project milestone currencies and frozen Bill To/Attention", async () => {
    const client = postgres(url!, { max: 1 })
    const namespace = `finance_clarity_${randomUUID().replaceAll("-", "")}`
    const ids = Array.from({ length: 8 }, () => randomUUID())
    try {
      await client.unsafe(`create schema "${namespace}"; set search_path to "${namespace}"`)
      for (const table of [schema.paymentMilestones, schema.projects, schema.funnels, schema.quotations, schema.quotationLineItems, schema.products, schema.salesOrders, schema.accounts, schema.persons, schema.financeDocs]) {
        const config = getTableConfig(table)
        await client.unsafe(`create table "${config.name}" (${config.columns.map(c => `"${c.name}" ${"enumValues" in c && c.enumValues?.length ? "text" : c.getSQLType()}`).join(",")})`)
      }
      runtime.tx = drizzle(client) as unknown as Tx
      await client`insert into accounts (id,tenant_id,name) values (${ids[0]},'clarity','End customer'), (${ids[1]},'clarity','Live reseller')`
      await client`insert into quotations (id,tenant_id,currency,bill_to_account_id,billing_snapshot) values (${ids[2]},'clarity','USD',${ids[1]},'{"account":{"name":"Frozen reseller"},"contact":{"name":"Frozen attention"}}')`
      await client`insert into funnels (id,tenant_id,currency,name) values (${ids[3]},'clarity','EUR','Deal')`
      await client`insert into projects (id,tenant_id,currency,account_id,quotation_id,name) values (${ids[4]},'clarity','GBP',${ids[0]},${ids[2]},'Delivery')`
      await client`insert into sales_orders (id,tenant_id,project_id,so_number,status) values (${ids[5]},'clarity',${ids[4]},'SO-TEST','approved')`
      const milestone = async (quote: string | null, funnel: string | null, project: string | null) => {
        await client`delete from payment_milestones`
        await client`insert into payment_milestones (id,tenant_id,title,quotation_id,funnel_id,project_id) values (${ids[6]},'clarity','Deposit',${quote},${funnel},${project})`
        return getPaymentMilestone(ids[6])
      }
      expect((await milestone(ids[2], ids[3], ids[4]))?.currency).toBe("USD")
      expect((await milestone(null, ids[3], ids[4]))?.currency).toBe("EUR")
      expect((await milestone(null, null, ids[4]))?.currency).toBe("GBP")
      expect((await milestone(ids[2], null, null))?.currency).toBe("USD")
      expect((await listFinanceSources()).salesOrders[0]).toMatchObject({ accountName: "End customer", billToName: "Frozen reseller", attentionName: "Frozen attention", currency: "GBP" })
      await client`update quotations set billing_snapshot=null`
      expect((await listFinanceSources()).salesOrders[0].billToName).toBe("Live reseller")
    } finally {
      await client.unsafe(`set search_path to public; drop schema if exists "${namespace}" cascade`)
      await client.end()
    }
  })
})
