import { beforeEach, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import type { Tx, ServerContext } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
const mocks = vi.hoisted(() => ({ visible: vi.fn(async (): Promise<string[] | null> => ["rep"]) }))
vi.mock("@/lib/access-scope", async original => ({ ...await original<typeof import("@/lib/access-scope")>(), visibleMemberIds: mocks.visible }))
import { listProjectCodes, getProjectCode } from "@/server/services/project-codes"
const execute = vi.fn()
const tx = { execute } as unknown as Tx
const ctx = { tenantId: "tenant", memberId: "rep", can: () => true } as unknown as ServerContext
beforeEach(() => { vi.clearAllMocks(); mocks.visible.mockResolvedValue(["rep"]); execute.mockResolvedValue([]) })
it("searches literal historical codes in a tenant and owner scoped active directory", async () => {
  await listProjectCodes(tx, ctx, { search: "A%_\\/", page: 1 })
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
  expect(query.sql).toContain('"funnels"."owner_member_id"')
  expect(query.sql).toContain("code_stage.kind = 'WON'")
  expect(query.sql).toContain("code_stage.code = '4a'")
  expect(query.params).toContain("tenant")
  expect(query.params).toContain("rep")
  expect(query.params).toContain("%A\\%\\_\\\\/%")
  expect(query.params.slice(-2)).toEqual([26, 25])
})
it("denies code reads without pipeline permission or record visibility", async () => {
  expect((await listProjectCodes(tx, { ...ctx, can: () => false }, {})).rows).toEqual([])
  mocks.visible.mockResolvedValue([])
  expect(await getProjectCode(tx, ctx, "secret", 0, false)).toBeNull()
  expect(execute).not.toHaveBeenCalled()
})
it("bounds the directory without truncating the next-page signal", async () => {
  execute.mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ code: "C" + i, funnelCount: 1 })))
  const page = await listProjectCodes(tx, ctx, {})
  expect(page.rows).toHaveLength(25)
  expect(page.hasNextPage).toBe(true)
})
it("does not query related records for an inactive or inaccessible code", async () => {
  expect(await getProjectCode(tx, ctx, "unknown", 0, false)).toBeNull()
  expect(execute).toHaveBeenCalledTimes(1)
})
it("omits related record categories the user cannot view, including Projects when disabled", async () => {
  execute.mockResolvedValueOnce([{ id: "f", name: "Funnel", accountId: "a", opportunityId: "o", opportunityOwner: "other", primary: true }])
  const result = await getProjectCode(tx, { ...ctx, can: p => p === PERMISSIONS.OPPORTUNITY_VIEW }, "CODE", 0, false)
  expect(result?.quotations).toEqual([])
  expect(result?.accounts).toEqual([])
  expect(result?.contacts).toEqual([])
  expect(result?.projects).toEqual([])
  expect(result?.funnels[0].opportunity).toBeNull()
  expect(execute).toHaveBeenCalledTimes(1)
})

it("uses the shared table's page size and sorting before limiting directory rows", async () => {
  await listProjectCodes(tx, ctx, { page: 1, pageSize: 50, sort: { id: "funnelCount", desc: true } })
  const q = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
  expect(q.sql).toContain('ORDER BY "funnelCount" DESC')
  expect(q.params.slice(-2)).toEqual([51, 50])
})
it("keeps an accessible code page available when its funnel search has no matches", async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ present: 1 }])
  const result = await getProjectCode(tx, ctx, "CODE", 0, false, { search: "unmatched" })
  expect(result).toMatchObject({ code: "CODE", total: 0, funnels: [], quotations: [] })
})
