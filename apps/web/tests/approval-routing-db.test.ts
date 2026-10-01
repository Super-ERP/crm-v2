import { randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as databaseSchema from "@/db/schema"
import { PERMISSIONS } from "@/lib/permissions"
import { findManagerApprover, requireManagerApprover } from "@/server/services/approval-routing"

const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("manager approval routing with real role assignments", () => {
  it("uses secondary roles, skips inactive managers, respects legacy fallback and never routes outside the reporting line", async () => {
    const sql = postgres(databaseUrl!, { max: 1 })
    const schema = `approval_test_${randomUUID().replaceAll("-", "")}`
    try {
      await sql.unsafe(`CREATE SCHEMA "${schema}"`)
      await sql.unsafe(`SET search_path TO "${schema}"`)
      await sql.unsafe(`
        CREATE TABLE membership_profiles (member_id text PRIMARY KEY, manager_member_id text, status text, role_id text);
        CREATE TABLE member_roles (member_id text, role_id text);
        CREATE TABLE role_permissions (role_id text, permission_id text);
        CREATE TABLE permissions (id text PRIMARY KEY, key text);
        INSERT INTO permissions VALUES ('stage', 'stage.advance.approve'), ('quote', 'quotation.approve');
        INSERT INTO membership_profiles VALUES ('rep', 'manager', 'active', 'rep-role'),
          ('manager', 'head', 'active', 'rep-role'), ('head', null, 'active', 'approval-role'),
          ('unrelated', null, 'active', 'approval-role');
        INSERT INTO member_roles VALUES ('manager', 'rep-role'), ('manager', 'approval-role');
        INSERT INTO role_permissions VALUES ('approval-role', 'stage'), ('approval-role', 'quote');
      `)
      const db = drizzle(sql, { schema: databaseSchema })
      await db.transaction(async tx => {
        const execute = vi.spyOn(tx, "execute")
        expect(await requireManagerApprover(tx, "rep", PERMISSIONS.STAGE_ADVANCE_APPROVE)).toBe("manager")
        expect(await requireManagerApprover(tx, "rep", PERMISSIONS.QUOTATION_APPROVE)).toBe("manager")
        expect(execute).toHaveBeenCalledTimes(2)
      })
      await sql`UPDATE membership_profiles SET status = 'disabled' WHERE member_id = 'manager'`
      await db.transaction(async tx => {
        expect(await findManagerApprover(tx, "rep", PERMISSIONS.STAGE_ADVANCE_APPROVE)).toBe("head")
      })
      await sql`UPDATE membership_profiles SET status = 'active', role_id = 'approval-role' WHERE member_id = 'manager'`
      await sql`DELETE FROM member_roles WHERE member_id = 'manager' AND role_id = 'approval-role'`
      await db.transaction(async tx => {
        // An assigned role set replaces the legacy primary role as in normal authorization.
        expect(await findManagerApprover(tx, "rep", PERMISSIONS.QUOTATION_APPROVE)).toBe("head")
      })
      await sql`DELETE FROM member_roles WHERE member_id = 'manager'`
      await db.transaction(async tx => {
        expect(await findManagerApprover(tx, "rep", PERMISSIONS.QUOTATION_APPROVE)).toBe("manager")
      })
      await sql`DELETE FROM role_permissions`
      await sql`INSERT INTO role_permissions VALUES ('unrelated-role', 'stage')`
      await sql`UPDATE membership_profiles SET role_id = 'unrelated-role' WHERE member_id = 'unrelated'`
      await db.transaction(async tx => {
        expect(await findManagerApprover(tx, "rep", PERMISSIONS.STAGE_ADVANCE_APPROVE)).toBeNull()
        await expect(requireManagerApprover(tx, "rep", PERMISSIONS.STAGE_ADVANCE_APPROVE)).rejects.toThrow("No eligible manager")
      })
      await sql`UPDATE membership_profiles SET manager_member_id = 'rep' WHERE member_id = 'manager'`
      await db.transaction(async tx => {
        expect(await findManagerApprover(tx, "rep", PERMISSIONS.STAGE_ADVANCE_APPROVE)).toBeNull()
      })
    } finally {
      await sql.unsafe("SET search_path TO public")
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await sql.end()
    }
  })
})
