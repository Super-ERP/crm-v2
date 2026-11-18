import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ execute: vi.fn(), visible: vi.fn(), can: vi.fn() }))
vi.mock("@/lib/actions", () => ({ withTenant: (_permission: string, work: (tx: unknown, ctx: unknown) => unknown) => work({ execute: mocks.execute }, { tenantId: "tenant", can: mocks.can }) }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: mocks.visible }))
import { checkConversionDuplicates } from "@/app/(app)/leads/conversion-duplicate-actions"
describe("conversion inline duplicate checks", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.visible.mockResolvedValue(null); mocks.can.mockReturnValue(true) })
  it("returns collision flags without exposing account details", async () => {
    mocks.execute.mockResolvedValueOnce([{ companyName: "Acme Sdn Bhd", name: "Contact" }]).mockResolvedValueOnce([{ registrationDuplicate: true, codeDuplicate: true }])
    expect(await checkConversionDuplicates("lead", "SSM-123", "ACME")).toEqual({ registrationDuplicate: true, codeDuplicate: true })
  })
  it("refuses a lead outside the caller's scope before searching accounts", async () => {
    mocks.execute.mockResolvedValueOnce([])
    await expect(checkConversionDuplicates("hidden", "SSM")).rejects.toThrow("Lead not available")
    expect(mocks.execute).toHaveBeenCalledTimes(1)
  })
  it("requires review permissions for account code lookups", async () => {
    mocks.execute.mockResolvedValueOnce([{ companyName: "Acme Sdn Bhd", name: "Contact" }]); mocks.can.mockReturnValue(false)
    await expect(checkConversionDuplicates("lead", "SSM", "CODE")).rejects.toThrow("Not permitted")
    expect(mocks.execute).toHaveBeenCalledTimes(1)
  })
})
