import { readFileSync } from "node:fs"
import path from "node:path"
import postgres, { type Sql } from "postgres"
import { beforeAll, afterAll, describe, expect, it } from "vitest"

const url = process.env.SERVICE_ACCESS_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_ADMIN_URL
const integration = url ? describe.sequential : describe.skip

integration("v3 PostgreSQL seat access", () => {
  let sql: Sql
  const schema = "service_access_test_" + crypto.randomUUID().replaceAll("-", "")
  beforeAll(async () => {
    sql = postgres(url!, { max: 1, onnotice: () => {} })
    await sql.unsafe(`CREATE SCHEMA ${schema}`)
    await sql.unsafe(`CREATE TABLE ${schema}.deployment_control_state (
      singleton integer, current_revision bigint, canonical_payload text,
      subscription_status text, greatest_trusted_at timestamptz,
      contract_starts_at timestamptz, contract_ends_at timestamptz,
      grace_until timestamptz, lease_expires_at timestamptz, seat_limit integer
    )`)
    const migration = path.resolve("db/migrations/0089_service_controls.sql")
    const source = readFileSync(migration, "utf8")
    await sql.unsafe(source.replaceAll("public.deployment_control_state", schema + ".deployment_control_state")
      .replace("FUNCTION deployment_seat_access(", "FUNCTION " + schema + ".deployment_seat_access("))
  })
  afterAll(async () => {
    if (sql) {
      await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`)
      await sql.end()
    }
  })

  it.each([
    [3, true, "cancelled", "2026-08-11", "active", true],
    [3, true, "suspended", "2026-08-13", "grace", true],
    [3, true, "active", "2026-08-20", "read_only", false],
    [3, false, "active", "2026-08-11", "service_disabled", false],
    [3, false, "active", "2026-08-20", "service_disabled", false],
    [2, true, "cancelled", "2026-08-11", "read_only", false],
  ] as const)("schema %s enabled %s status %s at %s gives %s", async (version, enabled, status, now, mode, allowed) => {
    await sql.unsafe(`DELETE FROM ${schema}.deployment_control_state`)
    await sql.unsafe(`INSERT INTO ${schema}.deployment_control_state VALUES
      (1, 1, $1, $2, '2026-08-11', '2026-08-01', '2026-08-02',
       '2026-08-19', '2026-08-12', 25)`, [JSON.stringify({ schemaVersion: version, serviceEnabled: enabled }), status])
    const [result] = await sql.unsafe(`SELECT * FROM ${schema}.deployment_seat_access($1::timestamptz)`, [now])
    expect(result).toEqual({ access_mode: mode, write_allowed: allowed, seat_limit: 25 })
  })
})
