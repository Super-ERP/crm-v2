import { PgDialect } from "drizzle-orm/pg-core"
import type { SQL } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("@/lib/access-scope", () => ({
  visibleMemberIds: vi.fn(async () => ["self"]),
  ownerScope: vi.fn(() => undefined), accountReadScope: vi.fn(() => undefined),
}))
import { auditRecordIdentities } from "@/app/(app)/audit/record-identities"
import { accounts, funnels, opportunities } from "@/db/schema"
import { ownerScope, accountReadScope } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"
import type { Tx, ServerContext } from "@/lib/actions"

beforeEach(() => vi.clearAllMocks())
function setup(allowed = true) {
  const selections: unknown[] = []
  const predicates: string[] = []
  const tx = { select: vi.fn(() => ({ from: (table: unknown) => {
    selections.push(table)
    return { where: vi.fn(async (predicate: SQL) => { predicates.push(new PgDialect().sqlToQuery(predicate).sql); return table === opportunities ? [{ id: "container", name: "Opportunity" }] : table === funnels ? [{ id: "legacy", name: "Legacy Funnel" }] : [] }) }
  } })) } as unknown as Tx
  const ctx = { can: vi.fn(() => allowed) } as unknown as ServerContext
  return { tx, ctx, selections, predicates }
}
describe("audit authorized identity lookup", () => {
  it("uses container routes first and resolves legacy Funnel IDs separately", async () => {
    const { tx, ctx, selections } = setup()
    const results = await auditRecordIdentities(tx, ctx, [
      { entityType: "opportunity", entityId: "container" }, { entityType: "opportunity", entityId: "legacy" },
    ])
    expect(selections).toEqual([opportunities, funnels])
    expect(results.map(record => record?.href)).toEqual(["/opportunities/container", "/funnel/legacy"])
    expect(ownerScope).toHaveBeenCalledWith(opportunities.ownerMemberId, ["self"])
    expect(ownerScope).toHaveBeenCalledWith(funnels.ownerMemberId, ["self"])
  })
  it("does not query or disclose names without the module's record permission", async () => {
    const { tx, ctx, selections } = setup(false)
    expect(await auditRecordIdentities(tx, ctx, [{ entityType: "account", entityId: "a" }])).toEqual([null])
    expect(ctx.can).toHaveBeenCalledWith(PERMISSIONS.ACCOUNT_VIEW)
    expect(selections).toEqual([])
  })
  it("uses the Account shared-reseller scope and omits missing/deleted rows", async () => {
    const { tx, ctx, selections, predicates } = setup()
    expect(await auditRecordIdentities(tx, ctx, [{ entityType: "account", entityId: "missing" }])).toEqual([null])
    expect(selections).toEqual([accounts])
    expect(predicates[0]).toContain('"accounts"."deleted_at" is null')
    expect(accountReadScope).toHaveBeenCalledWith(["self"])
  })
})
