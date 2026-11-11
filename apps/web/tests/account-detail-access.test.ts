import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ get: vi.fn(), withTenant: vi.fn(), can: vi.fn(), manages: vi.fn(), owns: vi.fn() }))
vi.mock("@/lib/actions", () => ({ withTenant: mocks.withTenant }))
vi.mock("@/lib/api-readers", () => ({ accountsGet: mocks.get }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: vi.fn(async () => ["self"]), canManageAllRecords: mocks.manages, ownsOrManages: mocks.owns, ownerScope: vi.fn() }))
import { getAccount } from "@/app/(app)/accounts/actions"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.withTenant.mockImplementation(async (_permission, work) => work({}, { can: mocks.can }))
  mocks.get.mockResolvedValue({ account: { id: "shared", accountType: "reseller", ownerMemberId: "other" } })
})
describe("account detail editing access", () => {
  it.each([
    { permission: true, manager: false, owner: false, expected: false },
    { permission: true, manager: false, owner: true, expected: true },
    { permission: true, manager: true, owner: false, expected: true },
    { permission: false, manager: true, owner: true, expected: false },
  ])("requires update permission plus ownership or management: %j", async ({permission, manager, owner, expected}) => {
    mocks.can.mockReturnValue(permission)
    mocks.manages.mockReturnValue(manager)
    mocks.owns.mockReturnValue(owner)
    expect(await getAccount("shared")).toMatchObject({ canEdit: expected })
  })
  it("preserves not-found for an inaccessible record", async () => {
    mocks.get.mockResolvedValue(null)
    expect(await getAccount("missing")).toBeNull()
  })
})
