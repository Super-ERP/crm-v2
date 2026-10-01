import { randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as databaseSchema from "@/db/schema"
import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import type { SQL } from "drizzle-orm"
import type { Tx } from "@/db"
import { persons, opportunities, funnels, projects, contracts, stageApprovalRequests, quotations } from "@/db/schema"
import { cascadeAccountOwner } from "@/server/services/owner-cascade"

describe("account owner cascade", () => {
  it("reassigns every owned account record within the same tenant", async () => {
    const dialect = new PgDialect()
    const updates: { table: unknown; values: Record<string, unknown>; predicate: SQL }[] = []
    const tx = {
      update(table: unknown) {
        let values: Record<string, unknown> = {}
        let predicate: SQL
        return {
          set(payload: Record<string, unknown>) {
            values = payload
            return this
          },
          where(value: SQL) {
            predicate = value
            return this
          },
          async returning() {
            updates.push({ table, values, predicate })
            return [{ id: "record-1" }]
          },
        }
      },
    } as unknown as Tx

    const counts = await cascadeAccountOwner(tx, "tenant-1", "account-1", "member-2")

    expect(counts).toEqual({ persons: 1, opportunities: 1, funnels: 1, projects: 1, contracts: 1, stageApprovals: 1, quotationApprovals: 1 })
    expect(updates.map((entry) => entry.table)).toEqual([persons, opportunities, funnels, projects, contracts, stageApprovalRequests, quotations])
    for (const entry of updates.slice(0, 5)) {
      expect(entry.values.ownerMemberId).toBe("member-2")
      const query = dialect.sqlToQuery(entry.predicate)
      expect(query.sql).toContain("tenant_id")
      expect(query.sql).toContain("account_id")
      expect(query.sql).toContain("deleted_at")
      expect(query.params).toEqual(["tenant-1", "account-1"])
    }
    expect(updates[5].values).toMatchObject({ status: "cancelled", decisionNote: expect.stringContaining("owner changed") })
    expect(updates[6].values).toMatchObject({ status: "draft", approverMemberId: null, rejectionReason: expect.stringContaining("owner changed") })
    const stageQuery = dialect.sqlToQuery(updates[5].predicate)
    const quoteQuery = dialect.sqlToQuery(updates[6].predicate)
    for (const query of [stageQuery, quoteQuery]) {
      expect(query.sql).toContain("account_id")
      expect(query.sql).toContain("funnel_id")
      expect(query.params).toContain("tenant-1")
      expect(query.params).toContain("account-1")
    }
  })
})

const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("account owner cascade in PostgreSQL", () => {
  it("changes active records and closes only pending approvals for the transferred account", async () => {
    const client = postgres(databaseUrl!, { max: 1 })
    const schema = `owner_cascade_test_${randomUUID().replaceAll("-", "")}`
    const accountId = randomUUID()
    const otherAccountId = randomUUID()
    const funnelId = randomUUID()
    const otherFunnelId = randomUUID()
    try {
      await client.unsafe(`CREATE SCHEMA "${schema}"`)
      await client.unsafe(`SET search_path TO "${schema}"`)
      await client.unsafe(`
        CREATE TABLE funnels (id uuid PRIMARY KEY, tenant_id text, account_id uuid, deleted_at timestamptz, owner_member_id text, updated_at timestamptz);
        CREATE TABLE persons (id uuid PRIMARY KEY, tenant_id text, account_id uuid, deleted_at timestamptz, owner_member_id text, updated_at timestamptz);
        CREATE TABLE opportunities (id uuid PRIMARY KEY, tenant_id text, account_id uuid, deleted_at timestamptz, owner_member_id text, updated_at timestamptz);
        CREATE TABLE projects (id uuid PRIMARY KEY, tenant_id text, account_id uuid, deleted_at timestamptz, owner_member_id text, updated_at timestamptz);
        CREATE TABLE contracts (id uuid PRIMARY KEY, tenant_id text, account_id uuid, deleted_at timestamptz, owner_member_id text, updated_at timestamptz);
        CREATE TABLE stage_approval_requests (id uuid PRIMARY KEY, tenant_id text, funnel_id uuid, status text, decided_at timestamptz, decision_note text, updated_at timestamptz);
        CREATE TABLE quotations (id uuid PRIMARY KEY, tenant_id text, funnel_id uuid, status text, approver_member_id text, approved_at timestamptz, rejection_reason text, updated_at timestamptz, deleted_at timestamptz);
      `)
      for (const table of ["persons", "opportunities", "funnels", "projects", "contracts"]) {
        await client.unsafe(`INSERT INTO ${table} (id, tenant_id, account_id, deleted_at, owner_member_id) VALUES ($1, 'tenant-1', $2, null, 'old-owner'), ($3, 'tenant-1', $4, null, 'old-owner'), ($5, 'tenant-1', $2, now(), 'old-owner')`, [randomUUID(), accountId, randomUUID(), otherAccountId, randomUUID()])
      }
      await client.unsafe(`UPDATE funnels SET id = $1 WHERE account_id = $2 AND deleted_at IS NULL`, [funnelId, accountId])
      await client.unsafe(`UPDATE funnels SET id = $1 WHERE account_id = $2 AND deleted_at IS NULL`, [otherFunnelId, otherAccountId])
      await client.unsafe(`INSERT INTO stage_approval_requests (id, tenant_id, funnel_id, status, decided_at, decision_note) VALUES ($1, 'tenant-1', $2, 'pending', null, null), ($3, 'tenant-1', $4, 'pending', null, null), ($5, 'tenant-1', $2, 'approved', now(), null)`, [randomUUID(), funnelId, randomUUID(), otherFunnelId, randomUUID()])
      await client.unsafe(`INSERT INTO quotations VALUES ($1, 'tenant-1', $2, 'pending_approval', 'old-manager', null, null, now(), null), ($3, 'tenant-1', $4, 'pending_approval', 'old-manager', null, null, now(), null), ($5, 'tenant-1', $2, 'approved', 'old-manager', now(), null, now(), null)`, [randomUUID(), funnelId, randomUUID(), otherFunnelId, randomUUID()])
      const db = drizzle(client, { schema: databaseSchema })
      const counts = await db.transaction(tx => cascadeAccountOwner(tx, "tenant-1", accountId, "new-owner"))
      expect(counts).toEqual({ persons: 1, opportunities: 1, funnels: 1, projects: 1, contracts: 1, stageApprovals: 1, quotationApprovals: 1 })
      for (const table of ["persons", "opportunities", "funnels", "projects", "contracts"]) {
        const rows = await client.unsafe(`SELECT account_id, deleted_at, owner_member_id FROM ${table}`)
        expect(rows.filter(row => row.account_id === accountId && row.deleted_at === null)).toMatchObject([{ owner_member_id: "new-owner" }])
        expect(rows.filter(row => row.account_id === otherAccountId || row.deleted_at !== null).every(row => row.owner_member_id === "old-owner")).toBe(true)
      }
      const stage = await client.unsafe(`SELECT status, decision_note FROM stage_approval_requests WHERE funnel_id = $1`, [funnelId])
      expect(stage.map(row => row.status).sort()).toEqual(["approved", "cancelled"])
      expect(stage.find(row => row.status === "cancelled")?.decision_note).toContain("owner changed")
      const quote = await client.unsafe(`SELECT status, approver_member_id, rejection_reason FROM quotations WHERE funnel_id = $1`, [funnelId])
      expect(quote.map(row => row.status).sort()).toEqual(["approved", "draft"])
      expect(quote.find(row => row.status === "draft")).toMatchObject({ approver_member_id: null, rejection_reason: expect.stringContaining("owner changed") })
    } finally {
      await client.unsafe("SET search_path TO public")
      await client.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.end()
    }
  })
})
