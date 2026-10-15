import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql as query } from "drizzle-orm"
import * as schema from "@/db/schema"
import type { ServerContext } from "@/lib/server-context"

vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn() }))
import { milestoneStatusForFunnel } from "@/server/services/milestone-status"
import { milestoneReadScope } from "@/server/services/milestone-access"

const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("payment milestone invoicing policy", () => {
  it("migrates history and enforces stage, acceptance and ownership eligibility", async () => {
    const client = postgres(databaseUrl!, { max: 1 })
    const namespace = `milestone_invoicing_${randomUUID().replaceAll("-", "")}`
    try {
      await client.unsafe(`CREATE SCHEMA "${namespace}"`)
      await client.unsafe(`SET search_path TO "${namespace}"`)
      await client.unsafe(`
        CREATE TYPE payment_milestone_status AS ENUM ('planned', 'won', 'invoiced');
        CREATE TABLE pipeline_stages (id text PRIMARY KEY, tenant_id text, code text, kind text);
        CREATE TABLE quotations (id text PRIMARY KEY, tenant_id text, status text, deleted_at timestamptz, funnel_id text, subtotal numeric default 100, discount_total numeric default 0);
        CREATE TABLE funnels (id text PRIMARY KEY, tenant_id text, owner_member_id text, current_stage_id text,
          primary_quotation_id text, status text, deleted_at timestamptz);
        CREATE TABLE projects (id text PRIMARY KEY, tenant_id text, owner_member_id text, funnel_id text);
        CREATE TABLE membership_profiles (member_id text, manager_member_id text);
        CREATE TABLE payment_milestones (id text PRIMARY KEY, tenant_id text, funnel_id text, project_id text,
          status payment_milestone_status NOT NULL DEFAULT 'planned', invoice_number text, amount numeric);
        INSERT INTO pipeline_stages VALUES ('early','t','3b','OPEN'), ('commit','t','4a','OPEN'), ('closed','t','won','WON');
        INSERT INTO quotations (id,tenant_id,status,funnel_id) VALUES ('early-quote','t','accepted','early'), ('commit-quote','t','accepted','commit'), ('closed-quote','t','accepted','closed'), ('peer-quote','t','accepted','peer'), ('draft','t','draft','draft');
        INSERT INTO funnels VALUES
          ('early','t','sales','early','accepted','open',null),
          ('commit','t','sales','commit','accepted','open',null),
          ('closed','t','sales','closed','accepted','won',null),
          ('draft','t','sales','commit','draft','open',null),
          ('peer','t','other','commit','accepted','open',null);
        INSERT INTO projects VALUES ('delivery','t','sales','commit');
        INSERT INTO membership_profiles VALUES ('sales','manager'), ('other','unrelated');
        INSERT INTO payment_milestones VALUES
          ('early','t','early',null,'planned',null,100),
          ('commit','t','commit',null,'planned',null,100),
          ('closed','t','closed',null,'won',null,100),
          ('draft','t','draft',null,'planned',null,100),
          ('peer','t','peer',null,'won',null,100),
          ('project','t',null,'delivery','won',null,100),
          ('invoice','t','early',null,'invoiced','INV-KEEP',100);
      `)
      const migration = readFileSync(new URL("../db/migrations/0095_payment_milestone_invoicing.sql", import.meta.url), "utf8")
      await client.begin(async (tx) => { await tx.unsafe(migration) })
      expect((await client`SELECT count(*)::int AS n FROM payment_milestones`)[0].n).toBe(7)
      expect((await client`SELECT status::text, invoice_number, amount::text FROM payment_milestones WHERE id = 'invoice'`)[0])
        .toEqual({ status: "invoiced", invoice_number: "INV-KEEP", amount: "100" })
      expect((await client`SELECT DISTINCT status::text FROM payment_milestones ORDER BY status::text`).map((r) => r.status))
        .toEqual(["invoiced", "pending_invoicing"])
      const db = drizzle(client, { schema })
      const ctx = { memberId: "sales", isSuperadmin: false, can: () => false } as unknown as ServerContext
      await db.transaction(async (tx) => {
        expect(await milestoneStatusForFunnel(tx, "commit")).toBe("pending_invoicing")
        expect(await milestoneStatusForFunnel(tx, "closed")).toBe("pending_invoicing")
        for (const id of ["early", "draft", "missing", null]) {
          await expect(milestoneStatusForFunnel(tx, id)).rejects.toThrow("accepted quotation")
        }
        const visible = await milestoneReadScope(tx, ctx)
        const rows = await tx.select({ id: schema.paymentMilestones.id }).from(schema.paymentMilestones).where(visible)
        expect(rows.map((r) => r.id).sort()).toEqual(["closed", "commit", "invoice", "project"])
        const funnelRows = await tx.select({ id: schema.paymentMilestones.id }).from(schema.paymentMilestones)
          .where(await milestoneReadScope(tx, ctx, false))
        expect(funnelRows.map((r) => r.id).sort()).toEqual(["closed", "commit", "project"])
        const manager = { ...ctx, memberId: "manager", can: (key: string) => key === "records.view_team" }
        const teamRows = await tx.select({ id: schema.paymentMilestones.id }).from(schema.paymentMilestones)
          .where(await milestoneReadScope(tx, manager))
        expect(teamRows.map((r) => r.id).sort()).toEqual(["closed", "commit", "invoice", "project"])
        await tx.execute(query`update funnels set current_stage_id = 'early' where id = 'commit'`)
        await expect(milestoneStatusForFunnel(tx, "commit")).rejects.toThrow("4a")
        const afterRollback = await tx.select({ id: schema.paymentMilestones.id }).from(schema.paymentMilestones)
          .where(await milestoneReadScope(tx, ctx))
        expect(afterRollback.map((r) => r.id).sort()).toEqual(["closed", "invoice"])
        await tx.execute(query`update funnels set current_stage_id = 'commit', status = 'on_hold' where id = 'commit'`)
        await expect(milestoneStatusForFunnel(tx, "commit")).rejects.toThrow("4a")
      })
      expect((await client`SELECT count(*)::int AS n FROM payment_milestones`)[0].n).toBe(7)
    } finally {
      await client.unsafe('SET search_path TO public')
      await client.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`)
      await client.end()
    }
  })
})
