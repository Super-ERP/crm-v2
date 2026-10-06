import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { describe, it, expect } from "vitest"
import postgres from "postgres"

const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("payment milestone planning migration", () => {
  it("repairs premature wins, preserves invoiced and confirmed history, and defaults new plans correctly", async () => {
    const sql = postgres(databaseUrl!, { max: 1 })
    const schema = `milestone_test_${randomUUID().replaceAll("-", "")}`
    try {
      await sql.unsafe(`CREATE SCHEMA "${schema}"`)
      await sql.unsafe(`SET search_path TO "${schema}"`)
      await sql.unsafe(`
        CREATE TYPE payment_milestone_status AS ENUM ('won', 'invoiced');
        CREATE TABLE funnels (id text PRIMARY KEY, tenant_id text, status text);
        CREATE TABLE projects (id text PRIMARY KEY, tenant_id text, funnel_id text);
        CREATE TABLE payment_milestones (id text PRIMARY KEY, tenant_id text, funnel_id text, project_id text,
          status payment_milestone_status NOT NULL DEFAULT 'won', updated_at timestamptz DEFAULT now());
        INSERT INTO funnels VALUES ('draft-quote', 't', 'open'), ('approved-quote', 't', 'open'),
          ('accepted-pending-win-approval', 't', 'open'), ('won-deal', 't', 'won'), ('lost-deal', 't', 'lost');
        INSERT INTO projects VALUES ('project', 't', 'draft-quote');
        INSERT INTO payment_milestones (id, tenant_id, funnel_id, project_id, status) VALUES
          ('draft', 't', 'draft-quote', null, 'won'),
          ('approved', 't', 'approved-quote', null, 'won'),
          ('pending-win', 't', 'accepted-pending-win-approval', null, 'won'),
          ('confirmed', 't', 'won-deal', null, 'won'),
          ('invoiced', 't', 'draft-quote', null, 'invoiced'),
          ('lost', 't', 'lost-deal', null, 'won'),
          ('project-plan', 't', null, 'project', 'won');
      `)
      const migration = readFileSync(new URL("../db/migrations/0093_payment_milestone_planning.sql", import.meta.url), "utf8")
      await sql.begin(async (tx) => { await tx.unsafe(migration) })
      const rows = await sql`SELECT id, status::text FROM payment_milestones ORDER BY id`
      expect(Object.fromEntries(rows.map(r => [r.id, r.status]))).toEqual({
        draft: "planned", approved: "planned", "pending-win": "planned", confirmed: "won",
        invoiced: "invoiced", lost: "planned", "project-plan": "planned",
      })
      await sql`INSERT INTO payment_milestones (id) VALUES ('new-draft')`
      expect((await sql`SELECT status::text FROM payment_milestones WHERE id = 'new-draft'`)[0].status).toBe("planned")
      // Actual Closed Won propagation must preserve already-invoiced rows.
      await sql`UPDATE payment_milestones SET status = 'won' WHERE funnel_id = 'draft-quote' AND status = 'planned'`
      expect((await sql`SELECT status::text FROM payment_milestones WHERE id = 'draft'`)[0].status).toBe("won")
      expect((await sql`SELECT status::text FROM payment_milestones WHERE id = 'invoiced'`)[0].status).toBe("invoiced")
    } finally {
      await sql.unsafe(`SET search_path TO public`)
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await sql.end()
    }
  })
})
