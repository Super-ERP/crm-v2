import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { getTableConfig } from "drizzle-orm/pg-core"
import { sql as drizzleSql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"
import * as schema from "@/db/schema"
import type { ServerContext } from "@/lib/server-context"
const mocks = vi.hoisted(() => ({ runInTenant: vi.fn(), audit: vi.fn() }))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn() }))
vi.mock("@/server/services/opportunity-container", () => ({}))
vi.mock("@/server/audit", () => ({ writeAudit: mocks.audit }))
vi.mock("@/server/services/tenant-currency", () => ({ tenantConfiguredCurrency: async () => "MYR", tenantCurrencyForRecord: async () => "MYR" }))
import { convertLead, decideLeadConversion } from "@/server/services/conversion"
const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

// Match every selected/returned production column while keeping these fixtures isolated.
function fixtureTable(table: typeof schema.leads | typeof schema.accounts | typeof schema.persons) {
  const config = getTableConfig(table)
  const columns = config.columns.map(c => {
    let type = c.getSQLType()
    if ("enumValues" in c && c.enumValues?.length) type = "text"
    const fallback = c.name === "id" ? " DEFAULT gen_random_uuid() PRIMARY KEY" : ["created_at", "updated_at"].includes(c.name) ? " DEFAULT now()" : ""
    return `"${c.name}" ${type}${fallback}`
  })
  return `CREATE TABLE "${config.name}" (${columns.join(",")})`
}

describe.skipIf(!databaseUrl)("lead conversion PostgreSQL approval boundary", () => {
  it("executes the real migration, preserves snapshots, prevents duplicate requests, and rolls conversion back atomically", async () => {
    const client = postgres(databaseUrl!, { max: 1 })
    const namespace = `lead_approval_${randomUUID().replaceAll("-", "")}`
    const role = `${namespace}_app`
    const leadId = randomUUID()
    try {
      await client.unsafe(`CREATE SCHEMA "${namespace}"; SET search_path TO "${namespace}"; CREATE ROLE "${role}"`)
      await client.unsafe(`
        CREATE TYPE approval_status AS ENUM ('pending','approved','rejected','cancelled');
        CREATE TABLE organization (id text PRIMARY KEY);
        CREATE TABLE member (id text PRIMARY KEY, organization_id text, user_id text);
        CREATE TABLE membership_profiles (tenant_id text, member_id text PRIMARY KEY, manager_member_id text, status text, role_id text);
        CREATE TABLE member_roles (tenant_id text, member_id text, role_id text);
        CREATE TABLE roles (id text PRIMARY KEY, tenant_id text, name text);
        CREATE TABLE permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE, description text);
        CREATE TABLE role_permissions (tenant_id text, role_id text, permission_id uuid, UNIQUE(role_id,permission_id));
        CREATE TABLE pipelines (id uuid, tenant_id text, name text, is_default boolean);
        INSERT INTO organization VALUES ('tenant'), ('other');
        INSERT INTO member VALUES ('rep','tenant','rep-user'), ('manager','tenant','manager-user');
        INSERT INTO membership_profiles VALUES ('tenant','rep','manager','active','rep-role'), ('tenant','manager',null,'active','manager-role');
        INSERT INTO roles VALUES ('rep-role','tenant','Sales Rep'), ('manager-role','tenant','Manager');
        INSERT INTO permissions(key) VALUES ('lead.convert'), ('lead.view'), ('records.view_team');
        INSERT INTO role_permissions SELECT 'tenant','rep-role',id FROM permissions WHERE key IN ('lead.convert','lead.view');
        INSERT INTO role_permissions SELECT 'tenant','manager-role',id FROM permissions;
      `)
      for (const table of [schema.leads, schema.accounts, schema.persons]) await client.unsafe(fixtureTable(table))
      const migration = await readFile(new URL("../db/migrations/0098_lead_conversion_approval.sql", import.meta.url), "utf8")
      for (const statement of migration.split("--> statement-breakpoint")) await client.unsafe(statement)
      await client.unsafe(`GRANT USAGE ON SCHEMA "${namespace}" TO "${role}"; GRANT ALL ON ALL TABLES IN SCHEMA "${namespace}" TO "${role}"`)
      await client`INSERT INTO leads (id,tenant_id,name,email,status,owner_member_id) VALUES (${leadId},'tenant','Alice','alice@example.com','qualified','rep')`
      const db = drizzle(client, { schema })
      mocks.runInTenant.mockImplementation(async (tenant, work) => db.transaction(async tx => {
        await tx.execute(drizzleSql.raw(`SET LOCAL ROLE "${role}"`))
        await tx.execute(drizzleSql`SELECT set_config('app.current_tenant', ${tenant}, true)`)
        return work(tx)
      }))
      mocks.audit.mockResolvedValue(undefined)
      const rep = { tenantId: "tenant", memberId: "rep", userId: "rep-user", isSuperadmin: false, can: (p: string) => ["lead.convert", "lead.view"].includes(p) } as ServerContext
      const manager = { ...rep, memberId: "manager", userId: "manager-user", can: () => true } as ServerContext
      const input = { leadId, newAccount: { code: "ACME" }, createOpportunity: false }
      const request = await convertLead(rep, input)
      expect(request.pending).toBe(true)
      if (!request.pending) throw new Error("Expected queued request")
      expect(await client`SELECT id FROM accounts`).toHaveLength(0)
      expect((await client`SELECT status FROM leads WHERE id=${leadId}`)[0].status).toBe("qualified")
      await expect(convertLead(rep, input)).rejects.toThrow("already pending")
      await expect(client`INSERT INTO lead_conversion_approval_requests (tenant_id,lead_id,requester_member_id,input_snapshot,lead_snapshot) VALUES ('tenant',${leadId},'rep','{}','{}')`).rejects.toMatchObject({ code: "23505" })
      // RLS on the newly migrated table fails closed across tenant contexts.
      const hidden = await mocks.runInTenant("other", (tx: { execute: (q: unknown) => unknown }) => tx.execute(drizzleSql`SELECT id FROM lead_conversion_approval_requests`))
      expect(hidden).toHaveLength(0)
      await client`UPDATE leads SET name='Edited' WHERE id=${leadId}`
      await expect(decideLeadConversion(manager, request.requestId, "approved")).rejects.toThrow("changed")
      expect(await client`SELECT id FROM accounts`).toHaveLength(0)
      await decideLeadConversion(rep, request.requestId, "cancelled")
      const second = await convertLead(rep, input)
      if (!second.pending) throw new Error("Expected queued request")
      // Failure after actual records have been inserted must roll back both records and decision.
      mocks.audit.mockRejectedValueOnce(new Error("audit write failed"))
      await expect(decideLeadConversion(manager, second.requestId, "approved")).rejects.toThrow("audit write failed")
      expect(await client`SELECT id FROM accounts`).toHaveLength(0)
      expect(await client`SELECT id FROM persons`).toHaveLength(0)
      expect((await client`SELECT status FROM lead_conversion_approval_requests WHERE id=${second.requestId}`)[0].status).toBe("pending")
      await decideLeadConversion(manager, second.requestId, "approved")
      expect(await client`SELECT id FROM accounts`).toHaveLength(1)
      expect(await client`SELECT id FROM persons`).toHaveLength(1)
      expect((await client`SELECT status FROM leads WHERE id=${leadId}`)[0].status).toBe("converted")
      expect((await client`SELECT status FROM lead_conversion_approval_requests WHERE id=${second.requestId}`)[0].status).toBe("approved")
      const anotherLeadId = randomUUID()
      await client`INSERT INTO leads (id,tenant_id,name,email,status,owner_member_id) VALUES (${anotherLeadId},'tenant','Bob','bob@example.com','qualified','rep')`
      const accountId = (await client`SELECT id FROM accounts`)[0].id
      const existingRequest = await convertLead(rep, { leadId: anotherLeadId, existingAccountId: accountId })
      if (!existingRequest.pending) throw new Error("Expected queued request")
      await client`UPDATE accounts SET owner_member_id='outsider' WHERE id=${accountId}`
      await expect(decideLeadConversion(manager, existingRequest.requestId, "approved")).rejects.toThrow("not permitted on this account")
      expect(await client`SELECT id FROM persons`).toHaveLength(1)
      await decideLeadConversion(rep, existingRequest.requestId, "cancelled")
      await client`UPDATE membership_profiles SET manager_member_id=null WHERE member_id='rep'`
      await expect(convertLead(rep, { leadId: anotherLeadId, newAccount: { code: "BOB" } })).rejects.toThrow("No eligible manager")
      // A top manager is explicitly permitted to perform immediate conversion.
      const direct = await convertLead(manager, { leadId: anotherLeadId, newAccount: { code: "BOB" } })
      expect(direct.pending).not.toBe(true)
      expect(await client`SELECT id FROM accounts`).toHaveLength(2)
      expect(await client`SELECT id FROM persons`).toHaveLength(2)
    } finally {
      await client.unsafe(`RESET ROLE; SET search_path TO public; DROP SCHEMA IF EXISTS "${namespace}" CASCADE; DROP ROLE IF EXISTS "${role}"`)
      await client.end()
    }
  })
})
