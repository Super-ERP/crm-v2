import { beforeEach, expect, it, vi } from "vitest"
type MockTx = Record<"select" | "insert" | "update", ReturnType<typeof vi.fn>>
type MockQuery = Record<"from" | "where" | "limit" | "for" | "values" | "returning" | "set", ReturnType<typeof vi.fn>> & { then: Promise<unknown>["then"] }
const state = vi.hoisted(() => ({ enabled: true, tx: {} as MockTx, next: vi.fn(async () => "GENERATED") }))
vi.mock("@/lib/actions", () => ({ withModule: async (_module: string, _permission: string, work: (tx: MockTx, context: { tenantId: string; memberId: string; can: () => boolean }) => Promise<unknown>) => {
  if (!state.enabled) throw new Error("projects module unavailable")
  return work(state.tx, { tenantId: "tenant", memberId: "owner", can: () => true })
} }))
vi.mock("@/lib/action-result", () => ({ runAction: async (work: () => Promise<unknown>) => { try { return { ok: true, data: await work() } } catch (e) { return { ok: false, error: (e as Error).message } } } }))
vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn() }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: async () => ["owner"], ownsOrManages: (visible: string[], owner: string) => visible.includes(owner), canManageAllRecords: () => false, ownerScope: vi.fn() }))
vi.mock("@/server/services/numbering", () => ({ nextProjectCode: state.next, isDuplicateNumberError: () => false }))
vi.mock("@/server/services/activity", () => ({ logActivity: vi.fn() }))
vi.mock("@/server/audit", () => ({ writeAudit: vi.fn() }))
vi.mock("@/server/services/changes/record", () => ({ recordChanges: vi.fn() }))
vi.mock("@/server/services/tenant-currency", () => ({ tenantDefaultCurrency: async () => "MYR" }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { createProject, updateProject } from "@/app/(app)/projects/actions"
function query(value: unknown) {
  const q = { then: Promise.resolve(value).then.bind(Promise.resolve(value)) } as MockQuery
  for (const name of ["from", "where", "limit", "for", "values", "returning", "set"] as const) q[name] = vi.fn(() => q)
  return q
}
function fixture(project: unknown[] = [], sourceOverrides = {}) {
  const rows = [[{ code: "ACME", ownerMemberId: "owner" }], [{ id: "f", accountId: "a", ownerMemberId: "owner", projectCode: "CRM-1", projectCodeActive: true, ...sourceOverrides }], project]
  state.tx = { select: vi.fn(() => query(rows.shift() ?? [])), insert: vi.fn(() => query([{ id: "new", projectCode: "CRM-1" }])), update: vi.fn(() => query([])) }
}
beforeEach(() => { vi.clearAllMocks(); state.enabled = true; fixture() })
it("creates delivery with the source code without consuming a counter", async () => {
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toEqual({ ok: true, data: { id: "new", projectCode: "CRM-1" } })
  expect(state.next).not.toHaveBeenCalled()
  const values = state.tx.insert.mock.results[0].value.values.mock.calls[0][0]
  expect(values.projectCode).toBe("CRM-1")
})
it("returns the same-code existing delivery instead of inserting a duplicate", async () => {
  fixture([{ id: "existing", projectCode: "CRM-1", accountId: "a", ownerMemberId: "owner", deletedAt: null }])
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toEqual({ ok: true, data: { id: "existing", projectCode: "CRM-1" } })
  expect(state.tx.insert).not.toHaveBeenCalled()
  expect(state.next).not.toHaveBeenCalled()
})
it("rejects conflicting account and scope without creating", async () => {
  fixture([{ id: "existing", projectCode: "CRM-1", accountId: "other", ownerMemberId: "owner", deletedAt: null }])
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("conflict") })
  expect(state.tx.insert).not.toHaveBeenCalled()
})
it("rejects source account mismatch", async () => {
  fixture([], { accountId: "other" })
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("account") })
  expect(state.next).not.toHaveBeenCalled()
})
it("blocks delivery creation when the module is disabled", async () => {
  state.enabled = false
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("module") })
  expect(state.tx.select).not.toHaveBeenCalled()
})
it("rejects an existing explicit delivery link with a different code", async () => {
  fixture([{ id: "existing", projectCode: "OLD", accountId: "a", ownerMemberId: "owner", deletedAt: null }])
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("different code") })
  expect(state.tx.insert).not.toHaveBeenCalled()
  expect(state.next).not.toHaveBeenCalled()
})
it("rejects an existing same-code delivery outside visible ownership", async () => {
  fixture([{ id: "existing", projectCode: "CRM-1", accountId: "a", ownerMemberId: "invisible", deletedAt: null }])
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("conflict") })
  expect(state.tx.insert).not.toHaveBeenCalled()
})
it("persists a newly allocated delivery code onto an empty source funnel", async () => {
  fixture([], { projectCode: null })
  const result = await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })
  expect(result.ok).toBe(true)
  expect(state.next).toHaveBeenCalledOnce()
  expect(state.tx.update.mock.results[0].value.set.mock.calls[0][0]).toMatchObject({ projectCode: "GENERATED" })
})
it("retains existing delivery identity when the source has no code", async () => {
  fixture([{ id: "existing", projectCode: "DELIVERY", accountId: "a", ownerMemberId: "owner", deletedAt: null }], { projectCode: null })
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toEqual({ ok: true, data: { id: "existing", projectCode: "DELIVERY" } })
  expect(state.next).not.toHaveBeenCalled()
  expect(state.tx.update.mock.results[0].value.set.mock.calls[0][0]).toMatchObject({ projectCode: "DELIVERY" })
})

it("refuses to relink a delivery project to a funnel with a different identity", async () => {
  const rows = [[{ id: "p", projectCode: "ORIGINAL", accountId: "a", ownerMemberId: "owner", funnelId: "old", quotationId: null }], [{ ownerMemberId: "owner" }], [{ id: "new", accountId: "a", ownerMemberId: "owner", projectCode: "OTHER", projectCodeActive: true }]]
  state.tx.select = vi.fn(() => query(rows.shift() ?? []))
  expect(await updateProject("p", { funnelId: "new" })).toMatchObject({ ok: false, error: expect.stringContaining("source funnel code") })
  expect(state.tx.update).not.toHaveBeenCalled()
})
it("rejects relinking to an empty-code funnel already linked to another delivery project", async () => {
  const rows = [
    [{ id: "p-a", projectCode: "CODE-A", accountId: "a", ownerMemberId: "owner", funnelId: "old", quotationId: null }],
    [{ ownerMemberId: "owner" }],
    [{ id: "f", accountId: "a", ownerMemberId: "owner", projectCode: null, projectCodeActive: true }],
    [{ id: "p-b", projectCode: "CODE-B" }],
  ]
  state.tx.select = vi.fn(() => query(rows.shift() ?? []))
  expect(await updateProject("p-a", { funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("conflict") })
  expect(state.tx.update).not.toHaveBeenCalled()
})

it("does not allocate or attach a code to a source funnel below 4A", async () => {
  fixture([], { projectCode: null, projectCodeActive: false })
  expect(await createProject({ name: "Delivery", accountId: "a", funnelId: "f" })).toMatchObject({ ok: false, error: expect.stringContaining("4A") })
  expect(state.next).not.toHaveBeenCalled()
  expect(state.tx.insert).not.toHaveBeenCalled()
  expect(state.tx.update).not.toHaveBeenCalled()
})

it("allows an existing delivery name edit after rollback without assigning a code to the inactive funnel", async () => {
  const rows = [
    [{ id: "p", projectCode: "KEEP", accountId: "a", ownerMemberId: "owner", funnelId: "f", quotationId: null, status: "active", value: null }],
    [{ ownerMemberId: "owner" }],
    [{ id: "f", accountId: "a", ownerMemberId: "owner", projectCode: null, projectCodeActive: false }],
    [],
  ]
  state.tx.select = vi.fn(() => query(rows.shift() ?? []))
  expect(await updateProject("p", { name: "New delivery name" })).toMatchObject({ ok: true })
  expect(state.tx.update).toHaveBeenCalledTimes(1)
  expect(state.tx.update.mock.results[0].value.set.mock.calls[0][0]).not.toHaveProperty("projectCode")
  expect(state.next).not.toHaveBeenCalled()
})
