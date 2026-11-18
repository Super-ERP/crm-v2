import postgres from "postgres"
import { PgDialect } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { similarCompanyName } from "@/server/services/company-name-match"
const url = process.env.TEST_DATABASE_ADMIN_URL

describe.skipIf(!url)("company name similarity in PostgreSQL", () => {
  it("flags added locations in both directions without matching one common word", async () => {
    const client = postgres(url!, { max: 1 })
    try {
      for (const [incoming, existing, expected] of [
        ["Meridian Manufacturing Malaysia", "Meridian Manufacturing", true],
        ["Meridian Manufacturing", "Meridian Manufacturing Malaysia Sdn Bhd", true],
        ["MERIDIAN Manufacturing Sdn. Bhd.", "Meridian Manufacturing", true],
        ["Meridian Manufacturing", "Atlas Manufacturing", false],
        ["Atlas", "Atlas Ventures", false],
        ["Atlas Sdn Bhd", "Atlas Limited", true],
        ["Sdn Bhd", "Sdn Bhd", false],
      ] as const) {
        const query = new PgDialect().sqlToQuery(sql`SELECT ${similarCompanyName(incoming, sql`${existing}`)} AS matches`)
        const [row] = await client.unsafe(query.sql, query.params.map(value => String(value)))
        expect(row.matches, `${incoming} / ${existing}`).toBe(expected)
      }
    } finally { await client.end() }
  })
})
