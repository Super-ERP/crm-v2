import postgres, { type Sql } from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql as query } from "drizzle-orm"
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { findSignInInvitations } from "@/lib/auth-invitation-query"

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL
const integration = adminUrl ? describe.sequential : describe.skip
integration("pending invitation lookup during sign-in", () => {
  let server: Sql
  let database: Sql
  let databaseName: string
  let roleName: string
  beforeAll(async () => {
    const url = new URL(adminUrl!)
    url.pathname = "/postgres"
    server = postgres(url.toString(), { max: 1 })
    databaseName = `crm_auth_invite_${process.pid}_${Date.now()}`
    await server.unsafe(`CREATE DATABASE "${databaseName}"`)
    url.pathname = `/${databaseName}`
    database = postgres(url.toString(), { max: 1 })
    await database`CREATE TABLE pending_invites (id uuid PRIMARY KEY, tenant_id text, normalized_email text, expires_at timestamptz)`
    await database`ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY`
    await database`ALTER TABLE pending_invites FORCE ROW LEVEL SECURITY`
    await database`CREATE POLICY tenant_invites ON pending_invites USING (tenant_id = current_setting('app.current_tenant', true))`
    roleName = `invite_lookup_${process.pid}_${Date.now()}`
    await database.unsafe(`CREATE ROLE "${roleName}" NOLOGIN`)
    await database.unsafe(`GRANT SELECT ON pending_invites TO "${roleName}"`)
    await database`INSERT INTO pending_invites VALUES
      ('11111111-1111-4111-8111-111111111111','qar','person@q-armour.com','2026-10-28T00:00:00Z'),
      ('22222222-2222-4222-8222-222222222222','cc','person@q-armour.com','2026-10-28T00:00:00Z'),
      ('33333333-3333-4333-8333-333333333333','qar','person@q-armour.com','2026-10-20T00:00:00Z'),
      ('44444444-4444-4444-8444-444444444444','qar','other@q-armour.com','2026-10-28T00:00:00Z')`
  })
  afterAll(async () => {
    await database?.end()
    if (server) {
      if (databaseName) await server.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`)
      if (roleName) await server.unsafe(`DROP ROLE IF EXISTS "${roleName}"`)
      await server.end()
    }
  })
  async function lookup(tenant: string, email: string, now = new Date("2026-10-21T03:19:36Z")) {
    return drizzle(database).transaction(async tx => {
      await tx.execute(query.raw(`SET LOCAL ROLE "${roleName}"`))
      await tx.execute(query`SELECT set_config('app.current_tenant', ${tenant}, true)`)
      return findSignInInvitations(tx, email, now)
    })
  }
  it("finds an unexpired exact-email invitation through the real PostgreSQL driver", async () => {
    expect(await lookup("qar", "person@q-armour.com")).toEqual([
      { id: "11111111-1111-4111-8111-111111111111", tenantId: "qar" },
    ])
  })
  it("preserves tenant scope when the same user is invited into another entity", async () => {
    expect(await lookup("cc", "person@q-armour.com")).toEqual([
      { id: "22222222-2222-4222-8222-222222222222", tenantId: "cc" },
    ])
  })
  it("ignores unmatched emails and invitations at or after their expiry", async () => {
    expect(await lookup("qar", "uninvited@q-armour.com")).toEqual([])
    expect(await lookup("qar", "person@q-armour.com", new Date("2026-10-28T00:00:00Z"))).toEqual([])
  })
})
