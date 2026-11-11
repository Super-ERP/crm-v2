import { describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { paymentMilestones, dealCosts, contractYears } from "@/db/schema"

vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: async () => null }))
vi.mock("@/lib/modules.server", () => ({ getEntitledModuleMap: async () => ({ finance: true }) }))
import { milestoneReadScope } from "@/server/services/milestone-access"
import { relatedEntityScope } from "@/server/services/table-controls/relationships"

const dialect = new PgDialect()
const ctx = { tenantId: "tenant", memberId: "sales", can: () => true } as unknown as ServerContext

describe("retained transactional rows", () => {
  it("stores archive metadata without changing the operational status or amounts", () => {
    for (const table of [paymentMilestones, dealCosts, contractYears]) {
      expect(table.deletedAt.name).toBe("deleted_at")
      expect(table.deletedAt.notNull).toBe(false)
      expect(table.amount.name).toBe("amount")
    }
  })

  it.each([true, false])("excludes archived milestones before either eligibility branch, including invoice history=%s", async includeHistory => {
    const query = dialect.sqlToQuery(await milestoneReadScope({} as Tx, ctx, includeHistory))
    expect(query.sql).toMatch(/^"payment_milestones"\."deleted_at" is null and \(/)
    expect(query.sql).toContain("or (")
  })

  it.each(["milestones", "costs", "contractYears"] as const)("excludes archived %s from relationship counts, filters and money totals", entity => {
    const query = dialect.sqlToQuery(relatedEntityScope(entity, "child", { ctx, visible: null, modules: { finance: true } }))
    expect(query.sql).toContain('"child"."tenant_id"')
    expect(query.sql).toMatch(/and "child"\."deleted_at" is null$/)
  })
})
