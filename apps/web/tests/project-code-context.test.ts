import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { PERMISSIONS } from "@/lib/permissions"
const mocks = vi.hoisted(() => ({ requireContext: vi.fn(), runInTenant: vi.fn(), visibleMemberIds: vi.fn(), canAccessAttachable: vi.fn() }))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/server-context", () => ({ requireContext: mocks.requireContext }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: mocks.visibleMemberIds, canAccessAttachable: mocks.canAccessAttachable }))
import { listRelatedProjectCodes } from "@/app/(app)/_shared/project-code-actions"
describe("project codes without the Project module", () => {
  const execute = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "rep", can: () => true })
    mocks.runInTenant.mockImplementation(async (_tenant, work) => work({ execute }))
    mocks.visibleMemberIds.mockResolvedValue(["rep"])
    mocks.canAccessAttachable.mockResolvedValue(true)
    execute.mockResolvedValue([])
  })
  it("uses CRM permissions and owner scope even for shared reseller accounts", async () => {
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "rep", can: (p: string) => p !== PERMISSIONS.PROJECT_VIEW })
    await listRelatedProjectCodes("account", "account", 1)
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
    expect(query.sql).toContain("f.owner_member_id IN")
    expect(query.sql).toContain("bill_to_account_id")
    expect(query.params).toContain("rep")
    expect(query.params.slice(-2)).toEqual([26, 25])
  })
  it("links contacts through explicit funnel/opportunity/quotation relationships", async () => {
    await listRelatedProjectCodes("person", "contact")
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0])
    expect(query.sql).toContain("owner_contact_id")
    expect(query.sql).toContain("attention_contact_id")
    expect(query.sql).not.toContain("persons.account_id")
  })
  it("denies inaccessible parent records and missing CRM view permission", async () => {
    mocks.canAccessAttachable.mockResolvedValue(false)
    expect((await listRelatedProjectCodes("account", "hidden")).rows).toEqual([])
    expect(execute).not.toHaveBeenCalled()
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "rep", can: () => false })
    expect((await listRelatedProjectCodes("account", "hidden")).rows).toEqual([])
    expect(execute).not.toHaveBeenCalled()
  })
  it("bounds pages without dropping project code relationships", async () => {
    execute.mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ funnelId: String(i), projectCode: "SF-" + i })))
    const result = await listRelatedProjectCodes("account", "account")
    expect(result.rows).toHaveLength(25)
    expect(result.hasNextPage).toBe(true)
  })
})
