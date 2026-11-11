import { describe, expect, it, vi } from "vitest"
vi.mock("@/server/audit", () => ({ writeAudit: vi.fn() }))
vi.mock("@/server/services/activity", () => ({ logActivity: vi.fn() }))
vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn() }))
vi.mock("@/lib/server-context", () => ({ assertCan: vi.fn() }))
vi.mock("@/server/services/record-void-lock", () => ({ lockRecordVoidGraph: vi.fn() }))
import { writeAudit } from "@/server/audit"
import { getFinanceVoidImpact, executeFinanceVoid } from "@/server/services/record-void-finance"
import type { Tx } from "@/lib/actions"
import type { ServerContext } from "@/lib/server-context"

function transaction(results: unknown[][]) {
  const chain: Record<string, unknown> = {}
  for (const method of ["select", "from", "where", "leftJoin", "innerJoin"]) chain[method] = vi.fn(() => chain)
  chain.limit = vi.fn(async () => results.shift() ?? [])
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(results.shift() ?? []).then(resolve)
  chain.update = vi.fn(() => chain)
  chain.set = vi.fn(() => chain)
  chain.returning = vi.fn(async () => results.shift() ?? [])
  return chain as unknown as Tx
}
const ctx = { tenantId: "tenant", can: () => true } as unknown as ServerContext
const target = { type: "finance_doc", id: "doc" } as const

describe("reviewed finance void dependencies", () => {
  it("cancels a receipt and records the parent reopening in the same transaction", async () => {
    const receipt = { id: "doc", number: "RCT-1", status: "issued", kind: "receipt", parentId: "invoice" }
    const tx = transaction([[receipt], [], [{ number: "INV-1", status: "settled", amount: "100", currency: "MYR" }], [{ amount: "40" }],
      [{ ...receipt, status: "cancelled" }], [{ amount: "40" }], [{ id: "invoice", number: "INV-1" }]])
    await executeFinanceVoid(tx, ctx, target, "Duplicate bank posting")
    expect(writeAudit).toHaveBeenCalledWith(tx, ctx, expect.objectContaining({
      action: "finance.settlement_reopened", entityId: "invoice", before: { status: "settled" },
      after: { status: "issued", reason: "Duplicate bank posting", reversedDocumentId: "doc", remainingPayments: "40" },
    }))
  })
  it.each(["draft", "issued", "settled"])("blocks a live %s child before reversing its parent", async status => {
    const tx = transaction([[{ id: "doc", number: "INV-1", status: "issued", kind: "invoice" }], [{ number: "CN-1", status }]])
    const impact = await getFinanceVoidImpact(tx, ctx, target)
    expect(impact.blockers).toContainEqual({ code: "live_finance_child", message: `Resolve a linked finance document (${status}) first` })
    await expect(executeFinanceVoid(transaction([[{ id: "doc", number: "INV-1", status: "issued", kind: "invoice" }], [{ number: "CN-1", status }]]), ctx, target, "Duplicate")).rejects.toThrow("Resolve a linked finance document")
  })
  it("requires finance reversal permission for a settled leaf", async () => {
    const tx = transaction([[{ number: "INV-1", status: "settled", kind: "invoice" }], []])
    const impact = await getFinanceVoidImpact(tx, { ...ctx, can: () => false } as ServerContext, target)
    expect(impact.blockers.map(b => b.code)).toContain("finance_reverse_required")
  })
  it("does not infer cross-entity reversals for a mirrored invoice", async () => {
    const tx = transaction([[{ number: "INV-1", status: "draft", kind: "invoice", counterpartDocId: "partner" }], []])
    expect((await getFinanceVoidImpact(tx, ctx, target)).blockers.map(b => b.code)).toContain("intercompany_reconciliation")
  })
  it("blocks sales order void while any live financial dependency remains", async () => {
    const tx = transaction([[{ id: "so", soNumber: "SO-1", status: "approved" }], [{ number: "RFQ-1", status: "draft" }]])
    expect((await getFinanceVoidImpact(tx, ctx, { type: "sales_order", id: "so" })).blockers.map(b => b.code)).toEqual(["live_finance_document"])
  })
  it("previews settlement reopening when a reversed receipt removes coverage", async () => {
    const tx = transaction([[{ id: "doc", number: "RCT-1", status: "issued", kind: "receipt", parentId: "invoice" }], [], [{ number: "INV-1", status: "settled", amount: "100", currency: "MYR" }], [{ amount: "40" }]])
    const impact = await getFinanceVoidImpact(tx, ctx, target)
    expect(impact.effects).toContain("INV-1 reopens as issued because remaining payments no longer cover it")
  })
})
