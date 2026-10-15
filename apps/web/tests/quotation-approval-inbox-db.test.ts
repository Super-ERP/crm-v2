import { randomUUID } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ runInTenant: vi.fn(), requireContext: vi.fn(), visibleMemberIds: vi.fn() }))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/server-context", () => ({ requireContext: mocks.requireContext }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: mocks.visibleMemberIds }))
import { listQuotationApprovals } from "@/app/(app)/approvals/quotation-actions"
const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("quotation approval inbox PostgreSQL boundary", () => {
  it("finds assigned quotes and actual submissions, preserves history after rejection, and isolates other owners and tenants", async () => {
    const client = postgres(databaseUrl!, { max: 1 })
    const schema = `inbox_${randomUUID().replaceAll("-", "")}`
    const quote = randomUUID(), other = randomUUID(), hidden = randomUUID()
    try {
      await client.unsafe(`CREATE SCHEMA "${schema}"`)
      await client.unsafe(`SET search_path TO "${schema}"`)
      await client.unsafe(`
        CREATE TABLE accounts (id text, tenant_id text, name text, deleted_at timestamptz);
        CREATE TABLE funnels (id text, tenant_id text, name text, account_id text, owner_member_id text, deleted_at timestamptz);
        CREATE TABLE quotations (id uuid, tenant_id text, funnel_id text, quote_number text, total numeric, currency text, status text,
          approver_member_id text, bill_to_account_id text, billing_snapshot jsonb, rejection_reason text, updated_at timestamptz DEFAULT now(), deleted_at timestamptz);
        CREATE TABLE audit_log (id uuid DEFAULT gen_random_uuid(), tenant_id text, entity_type text, entity_id text, action text,
          actor_member_id text, actor_user_id text, created_at timestamptz DEFAULT now(), "after" jsonb, outcome text DEFAULT 'success');
        CREATE TABLE "user" (id text, name text);
        CREATE TABLE member (id text, organization_id text, user_id text);
        CREATE TABLE membership_profiles (member_id text, manager_member_id text, status text, role_id text);
        CREATE TABLE member_roles (member_id text, role_id text);
        CREATE TABLE role_permissions (role_id text, permission_id text);
        CREATE TABLE permissions (id text, key text);
        INSERT INTO membership_profiles VALUES ('rep', 'manager', 'active', 'sales'), ('manager', null, 'active', 'approver'), ('new-manager', null, 'active', 'approver');
        INSERT INTO permissions VALUES ('approve', 'quotation.approve');
        INSERT INTO role_permissions VALUES ('approver', 'approve');
        INSERT INTO accounts VALUES ('customer', 'tenant', 'MCMC', null), ('reseller', 'tenant', 'Uniti', null), ('other-customer', 'other', 'Other entity', null);
        INSERT INTO funnels VALUES ('f', 'tenant', 'MCMC pursuit', 'customer', 'rep', null), ('hidden', 'tenant', 'Hidden', 'customer', 'outsider', null), ('other-f', 'other', 'Other', 'other-customer', 'rep', null);
        INSERT INTO "user" VALUES ('u-rep', 'Shelly'), ('u-manager', 'Manager');
        INSERT INTO member VALUES ('rep', 'tenant', 'u-rep'), ('manager', 'tenant', 'u-manager');
      `)
      await client`INSERT INTO quotations (id,tenant_id,funnel_id,quote_number,total,currency,status,approver_member_id,bill_to_account_id) VALUES
        (${quote},'tenant','f','Q1',1200,'MYR','pending_approval','manager','reseller'),
        (${hidden},'tenant','hidden','HIDDEN',10,'MYR','pending_approval','manager',null),
        (${other},'other','other-f','OTHER',10,'MYR','pending_approval','manager',null)`
      await client`INSERT INTO audit_log (tenant_id,entity_type,entity_id,action,actor_member_id,actor_user_id,"after") VALUES
        ('tenant','quotation',${quote},'quotation.submitted_for_approval','rep','u-rep','{"approverMemberId":"manager"}')`
      const db = drizzle(client)
      mocks.runInTenant.mockImplementation(async (_tenant, work) => db.transaction(work))
      mocks.visibleMemberIds.mockResolvedValue(["manager", "rep"])
      mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: () => true })
      const incoming = await listQuotationApprovals("incoming")
      expect(incoming.rows).toHaveLength(1)
      expect(incoming.rows[0]).toMatchObject({ id: quote, billToName: "Uniti", customerName: "MCMC", requesterName: "Shelly", canRecall: false })
      expect((await listQuotationApprovals("mine")).rows).toHaveLength(0)
      // Pending quotes follow the same current-manager eligibility as mutation actions,
      // even when their originally stored approver is stale.
      await client`UPDATE membership_profiles SET manager_member_id = 'new-manager' WHERE member_id = 'rep'`
      expect((await listQuotationApprovals("incoming")).rows).toHaveLength(0)
      mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "new-manager", isSuperadmin: false, can: () => true })
      expect((await listQuotationApprovals("incoming")).rows[0].id).toBe(quote)
      await client`DELETE FROM role_permissions`
      expect((await listQuotationApprovals("incoming")).rows).toHaveLength(0)
      await client`INSERT INTO role_permissions VALUES ('approver', 'approve')`
      await client`UPDATE membership_profiles SET manager_member_id = 'manager' WHERE member_id = 'rep'`
      mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "rep", isSuperadmin: false, can: () => true })
      expect((await listQuotationApprovals("mine")).rows[0]).toMatchObject({ id: quote, canRecall: true })
      await client`UPDATE quotations SET status = 'draft', approver_member_id = null, rejection_reason = 'Revise price' WHERE id = ${quote}`
      await client`INSERT INTO audit_log (tenant_id,entity_type,entity_id,action,actor_member_id) VALUES ('tenant','quotation',${quote},'quotation.approval_rejected','manager')`
      const history = await listQuotationApprovals("mine")
      expect(history.rows[0]).toMatchObject({ status: "draft", approverName: "Manager", rejectionReason: "Revise price", canRecall: false })
      expect(history.rows[0].decidedAt).not.toBeNull()
      expect((await listQuotationApprovals("incoming")).rows).toHaveLength(0)
      await client`UPDATE quotations SET deleted_at = now() WHERE id = ${quote}`
      expect((await listQuotationApprovals("mine")).rows).toHaveLength(0)
    } finally {
      await client.unsafe("SET search_path TO public")
      await client.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.end()
    }
  })
})
