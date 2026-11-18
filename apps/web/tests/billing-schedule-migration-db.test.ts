import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { describe, it, expect } from "vitest"
import postgres from "postgres"
const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!databaseUrl)("billing schedule provenance migration", () => {
 it("preserves historical rows and allows multiple rows per product line", async () => {
  const sql = postgres(databaseUrl!,{max:1})
  const namespace = `billing_source_${randomUUID().replaceAll("-","")}`
  try {
   await sql.unsafe(`CREATE SCHEMA "${namespace}"`)
   await sql.unsafe(`SET search_path TO "${namespace}"`)
   await sql.unsafe("CREATE TABLE quotation_line_items(id uuid PRIMARY KEY); CREATE TABLE payment_milestones(id text PRIMARY KEY, amount numeric); INSERT INTO payment_milestones VALUES ('legacy',100)")
   await sql.unsafe(readFileSync(new URL("../db/migrations/0106_billing_schedule_line_source.sql",import.meta.url),"utf8"))
   expect((await sql`SELECT quotation_line_item_id FROM payment_milestones WHERE id = 'legacy'`)[0].quotation_line_item_id).toBeNull()
   const line = randomUUID()
   await sql`INSERT INTO quotation_line_items VALUES (${line})`
   await sql`INSERT INTO payment_milestones VALUES ('first',40,${line}),('second',60,${line})`
   expect((await sql`SELECT sum(amount)::text total FROM payment_milestones WHERE quotation_line_item_id = ${line}`)[0].total).toBe("100")
   await sql`DELETE FROM quotation_line_items WHERE id = ${line}`
   expect((await sql`SELECT count(*)::int n FROM payment_milestones WHERE quotation_line_item_id IS NULL`)[0].n).toBe(3)
  } finally {await sql.unsafe("SET search_path TO public");await sql.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);await sql.end()}
 })
})
