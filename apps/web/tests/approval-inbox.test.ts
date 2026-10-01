import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"
import { APPROVAL_PAGE_SIZE, normalizeApprovalPage } from "@/lib/approval-pagination"

const mocks = vi.hoisted(() => ({
  runInTenant: vi.fn(),
  requireContext: vi.fn(),
}))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/server-context", () => ({ requireContext: mocks.requireContext, assertCan: vi.fn() }))
vi.mock("@/lib/access-scope", () => ({ canAccessAttachable: vi.fn() }))
vi.mock("@/server/services/stage", () => ({ decideApproval: vi.fn() }))
vi.mock("@/lib/action-result", () => ({ runAction: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { listIncomingApprovals, listMyApprovals } from "@/app/(app)/approvals/actions"

function fixture() {
  const rows = Array.from({ length: APPROVAL_PAGE_SIZE + 1 }, (_, index) => ({
    id: String(index), funnelId: "funnel", opportunityName: "Deal", requesterUserId: "rep",
    approverMemberId: "manager", fromStageName: "Qualified", targetStageName: "Proposal",
    reason: "Ready", status: "pending", decisionNote: null, requestedAt: new Date(), decidedAt: null,
  }))
  const reads = [rows, [{ memberId: "rep", name: "Salesperson" }, { memberId: "manager", name: "Manager" }]]
  const chains: Array<Record<string, ReturnType<typeof vi.fn>>> = []
  const tx = {
    select: vi.fn(() => {
      const result = reads.shift() ?? []
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      for (const method of ["from", "where", "innerJoin", "leftJoin", "orderBy", "limit", "offset"]) chain[method] = vi.fn(() => chain)
      chain.then = vi.fn(Promise.resolve(result).then.bind(Promise.resolve(result)))
      chains.push(chain)
      return chain
    }),
  }
  mocks.runInTenant.mockImplementation(async (_tenant, work) => work(tx))
  return { tx, chains }
}

describe("bounded manager-only approval inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: () => true })
  })

  it("limits assigned incoming requests even for a member with every permission", async () => {
    const { tx, chains } = fixture()
    const page = await listIncomingApprovals(2)
    expect(page.rows).toHaveLength(25)
    expect(page).toMatchObject({ pageIndex: 2, hasNextPage: true })
    expect(chains[0].limit).toHaveBeenCalledWith(26)
    expect(chains[0].offset).toHaveBeenCalledWith(50)
    const predicate = new PgDialect().sqlToQuery(chains[0].where.mock.calls[0][0])
    expect(predicate.params).toEqual(["pending", "manager"])
    // One bounded row query and one batched display-name query; no per-card reads.
    expect(tx.select).toHaveBeenCalledTimes(2)
  })

  it("pages only the requester's history and normalizes malformed page inputs", async () => {
    const { chains } = fixture()
    expect((await listMyApprovals(-1)).pageIndex).toBe(0)
    expect(chains[0].limit).toHaveBeenCalledWith(26)
    expect(chains[0].offset).toHaveBeenCalledWith(0)
    expect(new PgDialect().sqlToQuery(chains[0].where.mock.calls[0][0]).params).toEqual(["manager"])
    for (const value of [NaN, Infinity, -1, 0.5, "bad", 10001]) expect(normalizeApprovalPage(value)).toBe(0)
  })

  it("does not query an incoming queue when approval permission has been removed", async () => {
    mocks.requireContext.mockResolvedValue({ tenantId: "tenant", memberId: "manager", isSuperadmin: false, can: () => false })
    const { tx } = fixture()
    expect(await listIncomingApprovals()).toMatchObject({ rows: [], hasNextPage: false })
    expect(tx.select).not.toHaveBeenCalled()
  })
})
