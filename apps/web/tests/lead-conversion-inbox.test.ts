import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { PERMISSIONS } from "@/lib/permissions"

const mocks = vi.hoisted(() => ({ runInTenant: vi.fn(), requireContext: vi.fn(), visibleMemberIds: vi.fn() }))
vi.mock("@/lib/actions", () => ({ withTenant: vi.fn() }))
vi.mock("@/lib/action-result", () => ({ runAction: vi.fn() }))
vi.mock("@/server/services/conversion", () => ({ decideLeadConversion: vi.fn() }))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/server-context", () => ({ requireContext: mocks.requireContext }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: mocks.visibleMemberIds }))
import { listLeadConversionApprovals } from "@/app/(app)/approvals/lead-conversion-actions"

describe("lead conversion approval inbox", () => {
  const execute = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: () => true })
    mocks.visibleMemberIds.mockResolvedValue(["manager", "rep"])
    mocks.runInTenant.mockImplementation(async (_tenant, work) => work({ execute }))
    execute.mockResolvedValue([])
  })
  it("restricts incoming lead conversions to the assigned approver, pending status, visible owners and live records", async () => {
    await listLeadConversionApprovals("incoming", 2)
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
    expect(query.sql).toContain('r.status = \'pending\'')
    expect(query.sql).toContain('current_approver."memberId" =')
    expect(query.sql).toContain('WITH RECURSIVE reporting_line')
    expect(query.sql).toContain('p.member_id = r.requester_member_id')
    expect(query.sql).toContain('l.deleted_at IS NULL')
    expect(query.sql).toContain('r.tenant_id =')
    expect(query.sql).toContain('l.owner_member_id IN')
    expect(query.params).toContain("tenant")
    expect(query.params).toContain("manager")
    expect(query.params.slice(-2)).toEqual([26, 50])
  })
  it("uses actual submission actor for My requests, never account owner", async () => {
    await listLeadConversionApprovals("mine")
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
    expect(query.sql).toContain('r.requester_member_id =')
    expect(query.sql).toContain('LEFT JOIN LATERAL')
  })
  it("fails closed when lead view or conversion approval permission is absent", async () => {
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: (p: string) => p !== PERMISSIONS.LEAD_CONVERT_APPROVE })
    expect((await listLeadConversionApprovals("incoming")).rows).toEqual([])
    expect(execute).not.toHaveBeenCalled()
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: () => false })
    expect((await listLeadConversionApprovals("mine")).rows).toEqual([])
    expect(execute).not.toHaveBeenCalled()
  })
  it("bounds pages and serializes dates for client cards", async () => {
    execute.mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ id: String(i), requestedAt: new Date("2026-10-15T00:00:00Z"), decidedAt: null })))
    const page = await listLeadConversionApprovals("incoming", "bad")
    expect(page).toMatchObject({ pageIndex: 0, hasNextPage: true })
    expect(page.rows).toHaveLength(25)
    expect(page.rows[0].requestedAt).toBe("2026-10-15T00:00:00.000Z")
  })
})
