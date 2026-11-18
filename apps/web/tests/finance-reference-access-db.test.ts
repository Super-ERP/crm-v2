import { randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { getTableConfig } from "drizzle-orm/pg-core"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import * as schema from "@/db/schema"
import type { Tx } from "@/lib/actions"
import type { ServerContext } from "@/lib/server-context"
import { RecordReference } from "@/components/record-reference"
vi.mock("@/db", () => ({ db: {} }))
vi.mock("@/lib/access-scope", async original => ({ ...await original<typeof import("@/lib/access-scope")>(), visibleMemberIds: async () => ["owner"] }))
const entitlement = vi.hoisted(() => ({ projects: true, salesOrders: true }))
vi.mock("@/lib/modules.server", () => ({ getEntitledModuleMap: async () => entitlement }))
import { financeReferenceAccess } from "@/server/services/finance-reference-access"
const url = process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!url)("finance reference destination checks", () => {
  it("keeps restricted/deleted/foreign-owner destinations as plain historical context", async () => {
    const client = postgres(url!, { max: 1 }), namespace = `finance_refs_${randomUUID().replaceAll("-", "")}`
    const [funnelId, quotationId, projectId, salesOrderId] = Array.from({ length: 4 }, () => randomUUID())
    try {
      await client.unsafe(`create schema "${namespace}"; set search_path to "${namespace}"`)
      for (const table of [schema.funnels, schema.quotations, schema.projects, schema.salesOrders]) {
        const config = getTableConfig(table)
        await client.unsafe(`create table "${config.name}" (${config.columns.map(c => `"${c.name}" ${"enumValues" in c && c.enumValues?.length ? "text" : c.getSQLType()}`).join(",")})`)
      }
      const tx = drizzle(client) as unknown as Tx
      await client`insert into funnels (id,tenant_id,owner_member_id) values (${funnelId},'t','owner')`
      await client`insert into quotations (id,tenant_id,funnel_id) values (${quotationId},'t',${funnelId})`
      await client`insert into projects (id,tenant_id,owner_member_id) values (${projectId},'t','owner')`
      await client`insert into sales_orders (id,tenant_id,project_id) values (${salesOrderId},'t',${projectId})`
      const refs = [{ funnelId, quotationId, projectId, salesOrderId, milestoneId: randomUUID() }]
      const ctx = (permissions: boolean) => ({ can: (permission: string) => permission === "finance.view" || (permissions && permission !== "payment_milestone.view") }) as unknown as ServerContext
      const render = (available: boolean) => renderToStaticMarkup(createElement(RecordReference, { href: `/quotations/${quotationId}`, label: "Q-history", available }))
      const denied = await financeReferenceAccess(tx, ctx(false), refs)
      expect(denied.quotations.size).toBe(0)
      expect(denied.funnels.size).toBe(0)
      expect(denied.salesOrders.size).toBe(0)
      expect(denied.milestones.size).toBe(0)
      expect(render(denied.quotations.has(quotationId))).not.toContain("href=")
      const allowed = await financeReferenceAccess(tx, ctx(true), refs)
      expect(allowed.quotations.has(quotationId)).toBe(true)
      expect(allowed.salesOrders.has(salesOrderId)).toBe(true)
      await client`update funnels set deleted_at=now()`
      await client`update projects set owner_member_id='other'`
      const hidden = await financeReferenceAccess(tx, ctx(true), refs)
      expect(hidden.quotations.size).toBe(0)
      expect(hidden.funnels.size).toBe(0)
      expect(hidden.salesOrders.size).toBe(0)
      expect(render(hidden.quotations.has(quotationId))).toContain("Q-history")
      expect(render(hidden.quotations.has(quotationId))).not.toContain("href=")
      await client`update funnels set deleted_at=null`
      await client`update quotations set deleted_at=now()`
      expect((await financeReferenceAccess(tx, ctx(true), refs)).quotations.size).toBe(0)
      await client`update projects set owner_member_id='owner',deleted_at=now()`
      expect((await financeReferenceAccess(tx, ctx(true), refs)).salesOrders.size).toBe(0)
      entitlement.projects = false; entitlement.salesOrders = false
      expect((await financeReferenceAccess(tx, ctx(true), refs)).salesOrders.size).toBe(0)
    } finally {
      entitlement.projects = true; entitlement.salesOrders = true
      await client.unsafe(`set search_path to public; drop schema if exists "${namespace}" cascade`)
      await client.end()
    }
  })
})
