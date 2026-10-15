import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  PAYMENT_MILESTONE_STATUSES,
  canTransitionPaymentMilestone,
  isPaymentMilestoneEligible,
} from "@/lib/payment-milestone-lifecycle"

describe("payment milestone lifecycle", () => {
  it("uses invoicing statuses independent of funnel closure", () => {
    expect(PAYMENT_MILESTONE_STATUSES).toEqual(["pending_invoicing", "invoiced"])
    expect(canTransitionPaymentMilestone("pending_invoicing", "invoiced")).toBe(true)
    expect(canTransitionPaymentMilestone("invoiced", "pending_invoicing")).toBe(false)
  })
  it.each(["4a", "won"])("allows an accepted quotation at %s", (stageCode) => {
    expect(isPaymentMilestoneEligible({ stageCode, stageKind: stageCode === "won" ? "WON" : "OPEN", funnelStatus: stageCode === "won" ? "won" : "open", quotationStatus: "accepted" })).toBe(true)
  })
  it.each(["0e", "1d", "2c", "3b", "lost", "kiv"])("hides milestones at %s", (stageCode) => {
    expect(isPaymentMilestoneEligible({ stageCode, stageKind: "OPEN", funnelStatus: "open", quotationStatus: "accepted" })).toBe(false)
  })
  it.each(["draft", "pending_approval", "approved", "sent", "rejected", "void", null])("requires customer acceptance, not %s", (quotationStatus) => {
    expect(isPaymentMilestoneEligible({ stageCode: "4a", stageKind: "OPEN", funnelStatus: "open", quotationStatus })).toBe(false)
  })
  it.each(["lost", "on_hold"])("blocks eligibility for %s funnels", (funnelStatus) => {
    expect(isPaymentMilestoneEligible({ stageCode: "4a", stageKind: "OPEN", funnelStatus, quotationStatus: "accepted" })).toBe(false)
  })

  it("adds a compatibility migration that maps legacy statuses and preserves invoice columns", async () => {
    const migration = await readFile(
      path.resolve(process.cwd(), "db/migrations/0083_payment_milestone_decoupling.sql"),
      "utf8"
    )

    expect(migration).toMatch(/pending[\s\S]{0,160}won/i)
    expect(migration).toMatch(/paid[\s\S]{0,160}invoiced/i)
    expect(migration).toMatch(/invoice_number/i)
    expect(migration).toMatch(/invoice_date/i)
    expect(migration).toMatch(/milestone_id/i)
    expect(migration).toMatch(/DROP TYPE/i)
  })

  it("removes invoice creation, finance-tab, and project-completion coupling from milestone flows", async () => {
    const files = [
      "app/(app)/billing/actions.ts",
      "app/(app)/payment-milestones/[id]/page.tsx",
      "app/(app)/payment-milestones/payment-milestone-detail-body.tsx",
      "app/(app)/projects/[id]/billing-panel.tsx",
      "app/(app)/projects/actions.ts",
      "server/services/finance.ts",
    ]
    const contents = await Promise.all(
      files.map((file) =>
        readFile(path.resolve(process.cwd(), file), "utf8")
      )
    )
    const source = contents.join("\n")

    expect(source).not.toMatch(/createInvoiceFromMilestone/)
    expect(source).not.toMatch(/listMilestoneFinanceDocs/)
    expect(source).not.toMatch(/maybeCompleteProject/)
    expect(source).not.toMatch(/paymentMilestones\.status.*paid/)
  })
})
