import { describe, expect, it, vi } from "vitest"
import type { ServerContext } from "@/lib/server-context"
import type { Tx } from "@/db"
import { resolveApprovalRoute } from "@/server/services/approval-routing"
const context = (approve: boolean) => ({ memberId: "manager", isSuperadmin: false, can: () => approve }) as unknown as ServerContext
function transaction(results: unknown[][]) {
  const execute = vi.fn()
  for (const result of results) execute.mockResolvedValueOnce(result)
  return { tx: { execute } as unknown as Tx, execute }
}
describe("consistent manager approval policy", () => {
  it("allows an active approver without any manager to proceed directly", async () => {
    const { tx } = transaction([[{ managerMemberId: null, status: "active" }]])
    expect(await resolveApprovalRoute(tx, context(true), "quotation.approve")).toEqual({ direct: true, approverMemberId: null })
  })
  it("routes a manager with someone above to that eligible manager", async () => {
    const { tx } = transaction([[{ managerMemberId: "head", status: "active" }], [{ memberId: "head" }]])
    expect(await resolveApprovalRoute(tx, context(true), "quotation.approve")).toEqual({ direct: false, approverMemberId: "head" })
  })
  it("blocks an ordinary rep with no manager rather than silently bypassing", async () => {
    const { tx } = transaction([[{ managerMemberId: null, status: "active" }], []])
    await expect(resolveApprovalRoute(tx, context(false), "quotation.approve")).rejects.toThrow("No eligible manager")
  })
  it("blocks an approver with a configured superior but no eligible upline", async () => {
    const { tx } = transaction([[{ managerMemberId: "head", status: "active" }], []])
    await expect(resolveApprovalRoute(tx, context(true), "quotation.approve")).rejects.toThrow("No eligible manager")
  })
  it("does not mistake a missing or inactive profile for a top manager", async () => {
    for (const profile of [[], [{ managerMemberId: null, status: "disabled" }]]) {
      const { tx } = transaction([profile, []])
      await expect(resolveApprovalRoute(tx, context(true), "quotation.approve")).rejects.toThrow()
    }
  })
})
