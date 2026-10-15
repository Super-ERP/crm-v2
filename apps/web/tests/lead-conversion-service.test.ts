import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ServerContext } from "@/lib/server-context"
import { PgDialect } from "drizzle-orm/pg-core"
const mocks = vi.hoisted(() => ({ runInTenant: vi.fn(), visibleMemberIds: vi.fn(), route: vi.fn(), manager: vi.fn(), audit: vi.fn() }))
vi.mock("@/db", () => ({ runInTenant: mocks.runInTenant }))
vi.mock("@/lib/access-scope", () => ({ visibleMemberIds: mocks.visibleMemberIds, ownsOrManages: (ids: string[] | null, owner: string) => ids === null || ids.includes(owner), canManageAllRecords: () => false }))
vi.mock("@/server/services/approval-routing", () => ({ resolveApprovalRoute: mocks.route, findManagerApprover: mocks.manager }))
vi.mock("@/server/audit", () => ({ writeAudit: mocks.audit }))
vi.mock("@/server/services/tenant-currency", () => ({}))
vi.mock("@/server/services/opportunity-container", () => ({}))
import { convertLead, decideLeadConversion } from "@/server/services/conversion"

const lead = { id: "lead", tenantId: "tenant", name: "Alice", email: "alice@example.com", status: "qualified", ownerMemberId: "rep" }
const ctx = { tenantId: "tenant", memberId: "rep", isSuperadmin: false, can: () => true } as unknown as ServerContext
const input = { leadId: "lead", newAccount: { code: "ACME" }, createOpportunity: true }

describe("lead conversion service approval boundary", () => {
  const execute = vi.fn(), insert = vi.fn(), update = vi.fn(), lock = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    const query = { from: () => query, where: () => query, limit: () => query, for: lock }
    lock.mockResolvedValue([lead])
    mocks.runInTenant.mockImplementation(async (_tenant, work) => work({ select: () => query, execute, insert, update }))
    mocks.visibleMemberIds.mockResolvedValue(["rep"])
    mocks.route.mockResolvedValue({ direct: false, approverMemberId: "manager" })
    mocks.manager.mockResolvedValue("manager")
    execute.mockResolvedValue([])
  })
  it("submits frozen input without creating accounts, people or opportunities or updating the lead", async () => {
    execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "request" }])
    const result = await convertLead(ctx, input)
    expect(result).toMatchObject({ pending: true, requestId: "request", opportunityId: null })
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0])
    expect(query.sql).toContain("INSERT INTO lead_conversion_approval_requests")
    expect(query.params).toContain(JSON.stringify(lead))
    expect(query.params).toContain(JSON.stringify(input))
  })
  it("rejects duplicate pending submissions", async () => {
    execute.mockResolvedValueOnce([{ id: "pending" }])
    await expect(convertLead(ctx, input)).rejects.toThrow("already pending")
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it("cannot bypass conversion permission by calling the service directly", async () => {
    await expect(convertLead({ ...ctx, can: () => false }, input)).rejects.toThrow("FORBIDDEN")
    expect(mocks.runInTenant).not.toHaveBeenCalled()
  })
  it("does not convert when no eligible reporting manager exists", async () => {
    mocks.route.mockRejectedValue(new Error("No eligible manager"))
    await expect(convertLead(ctx, input)).rejects.toThrow("No eligible manager")
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it("refuses self approval even for a requester with approval permission", async () => {
    execute.mockResolvedValueOnce([{ id: "request", lead_id: "lead", requester_member_id: "rep", status: "pending" }])
    await expect(decideLeadConversion(ctx, "request", "approved")).rejects.toThrow("assigned reporting manager")
    expect(insert).not.toHaveBeenCalled()
  })
  it("requires a rejection reason", async () => {
    await expect(decideLeadConversion(ctx, "request", "rejected", " ")).rejects.toThrow("reason")
    expect(execute).not.toHaveBeenCalled()
  })
  it("only the submitting member can cancel", async () => {
    execute.mockResolvedValueOnce([{ id: "request", lead_id: "lead", requester_member_id: "someone-else", status: "pending" }])
    await expect(decideLeadConversion(ctx, "request", "cancelled")).rejects.toThrow("Only the requester")
  })
  it("does not apply a conversion whose source lead changed after submission", async () => {
    execute.mockResolvedValueOnce([{ id: "request", lead_id: "lead", requester_member_id: "rep", status: "pending", input_snapshot: input, lead_snapshot: { ...lead, name: "Old name" } }])
    await expect(decideLeadConversion({ ...ctx, memberId: "manager" }, "request", "approved")).rejects.toThrow("changed")
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it("refuses an assigned manager who cannot access the lead owner", async () => {
    mocks.visibleMemberIds.mockResolvedValue(["manager"])
    execute.mockResolvedValueOnce([{ id: "request", lead_id: "lead", requester_member_id: "rep", status: "pending" }])
    await expect(decideLeadConversion({ ...ctx, memberId: "manager" }, "request", "rejected", "Revise")).rejects.toThrow("not permitted on this lead")
  })
  it("refuses superadmin self approval", async () => {
    execute.mockResolvedValueOnce([{ id: "request", lead_id: "lead", requester_member_id: "rep", status: "pending" }])
    await expect(decideLeadConversion({ ...ctx, isSuperadmin: true }, "request", "approved")).rejects.toThrow("own request")
  })
  it("rejects arbitrary runtime decisions", async () => {
    await expect(decideLeadConversion(ctx, "request", "surprise" as "approved")).rejects.toThrow("Invalid decision")
    expect(execute).not.toHaveBeenCalled()
  })
})
