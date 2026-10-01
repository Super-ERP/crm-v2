import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as databaseSchema from "@/db/schema"
import { recomputeOpportunityTotal } from "@/server/services/opportunity-container"
import { formatOpportunityEstimatedTotals } from "@/lib/opportunity-currency"

const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!databaseUrl)("Opportunity currency rollup migration", () => {
  it("backfills each currency and recomputes after child changes", async () => {
    const sql = postgres(databaseUrl!, { max: 1 })
    const schema = `opportunity_currency_${randomUUID().replaceAll("-", "")}`
    try {
      await sql.unsafe(`CREATE SCHEMA "${schema}"`)
      await sql.unsafe(`SET search_path TO "${schema}"`)
      await sql.unsafe(`
        CREATE TABLE opportunities (
          id uuid PRIMARY KEY, tenant_id text NOT NULL,
          total_estimated_funnel_amount numeric(14,2),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE funnels (
          id uuid PRIMARY KEY, tenant_id text NOT NULL,
          opportunity_id uuid NOT NULL, currency char(3) NOT NULL,
          estimated_amount numeric(14,2) NOT NULL,
          deleted_at timestamptz
        );
        CREATE TABLE activities (
          tenant_id text NOT NULL, member_id text, due_at timestamptz
        );
        INSERT INTO opportunities (id, tenant_id, total_estimated_funnel_amount) VALUES
          ('00000000-0000-0000-0000-000000000001', 't', 120),
          ('00000000-0000-0000-0000-000000000002', 't', 50),
          ('00000000-0000-0000-0000-000000000003', 't', 90);
        INSERT INTO funnels (id, tenant_id, opportunity_id, currency, estimated_amount, deleted_at) VALUES
          ('00000000-0000-0000-0000-000000000011', 't', '00000000-0000-0000-0000-000000000001', 'MYR', 100, null),
          ('00000000-0000-0000-0000-000000000012', 't', '00000000-0000-0000-0000-000000000001', 'USD', 20, null),
          ('00000000-0000-0000-0000-000000000013', 't', '00000000-0000-0000-0000-000000000002', 'MYR', 50, null),
          ('00000000-0000-0000-0000-000000000014', 't', '00000000-0000-0000-0000-000000000003', 'USD', 90, now());
      `)
      const migration = readFileSync(new URL("../db/migrations/0094_opportunity_currency_totals.sql", import.meta.url), "utf8")
      await sql.begin(async (tx) => { await tx.unsafe(migration) })
      const rows = await sql`SELECT id::text, total_estimated_funnel_amount::text AS scalar,
        estimated_totals_by_currency AS totals FROM opportunities ORDER BY id`
      expect(rows.map((row) => [row.scalar, row.totals])).toEqual([
        [null, [{ currency: "MYR", total: "100.00" }, { currency: "USD", total: "20.00" }]],
        ["50.00", [{ currency: "MYR", total: "50.00" }]],
        ["0.00", []],
      ])
      const [index] = await sql`SELECT indexdef FROM pg_indexes WHERE schemaname = ${schema} AND indexname = 'activities_due_member_idx'`
      expect(index.indexdef).toContain("(tenant_id, member_id, due_at)")
      await sql`UPDATE funnels SET currency = 'MYR' WHERE id = '00000000-0000-0000-0000-000000000012'`
      await drizzle(sql, { schema: databaseSchema }).transaction(async (tx) => {
        await recomputeOpportunityTotal(tx, "t", "00000000-0000-0000-0000-000000000001")
      })
      const [updated] = await sql`SELECT total_estimated_funnel_amount::text AS scalar,
        estimated_totals_by_currency AS totals FROM opportunities WHERE id = '00000000-0000-0000-0000-000000000001'`
      expect(updated).toMatchObject({ scalar: "120.00", totals: [{ currency: "MYR", total: "120.00" }] })
      expect(formatOpportunityEstimatedTotals(rows[0].totals, "MYR")).toContain("USD")
      expect(formatOpportunityEstimatedTotals([], "MYR")).toContain("MYR")
    } finally {
      await sql.unsafe("SET search_path TO public")
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await sql.end()
    }
  })
})
