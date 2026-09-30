import { describe, expect, it } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import type { SQL } from "drizzle-orm"
import type { Tx } from "@/db"
import { persons, opportunities, funnels, projects, contracts } from "@/db/schema"
import { cascadeAccountOwner } from "@/server/services/owner-cascade"

describe("account owner cascade", () => {
  it("reassigns every owned account record within the same tenant", async () => {
    const dialect = new PgDialect()
    const updates: { table: unknown; owner: string; predicate: SQL }[] = []
    const tx = {
      update(table: unknown) {
        let owner = ""
        let predicate: SQL
        return {
          set(values: { ownerMemberId: string }) {
            owner = values.ownerMemberId
            return this
          },
          where(value: SQL) {
            predicate = value
            return this
          },
          async returning() {
            updates.push({ table, owner, predicate })
            return [{ id: "record-1" }]
          },
        }
      },
    } as unknown as Tx

    const counts = await cascadeAccountOwner(tx, "tenant-1", "account-1", "member-2")

    expect(counts).toEqual({ persons: 1, opportunities: 1, funnels: 1, projects: 1, contracts: 1 })
    expect(updates.map((entry) => entry.table)).toEqual([persons, opportunities, funnels, projects, contracts])
    for (const entry of updates) {
      expect(entry.owner).toBe("member-2")
      const query = dialect.sqlToQuery(entry.predicate)
      expect(query.sql).toContain("tenant_id")
      expect(query.sql).toContain("account_id")
      expect(query.sql).toContain("deleted_at")
      expect(query.params).toEqual(["tenant-1", "account-1"])
    }
  })
})
