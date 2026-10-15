import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/app/(app)/quotations/actions", () => ({ approveQuotation: vi.fn(), rejectQuotation: vi.fn(), recallQuotation: vi.fn() }))
import { QuotationApprovalCard } from "@/app/(app)/approvals/quotation-cards"
import type { QuotationApprovalRow } from "@/app/(app)/approvals/quotation-actions"
const row: QuotationApprovalRow = {
  id: "quote-1", quoteNumber: "QM-001", funnelName: "MCMC deal", customerName: "MCMC", billToName: "Uniti",
  total: "1200", currency: "MYR", status: "pending_approval", requesterName: "Shelly", approverName: "Manager",
  requestedAt: "2026-10-15T00:00:00Z", decidedAt: null, rejectionReason: null, canRecall: true,
}
describe("quotation approval cards", () => {
  it("shows billing parties, value, requester and decision actions in Incoming", () => {
    const html = renderToStaticMarkup(createElement(QuotationApprovalCard, { row, incoming: true }))
    for (const text of ["Quotation", "QM-001", "MCMC deal", "MCMC", "Uniti", "1,200", "Shelly", "View quotation", "Approve", "Reject"]) expect(html).toContain(text)
    expect(html).toContain('/quotations/quote-1')
    expect(html).not.toContain("Recall to Draft")
  })
  it("only offers recall for eligible pending requests in My requests", () => {
    const html = renderToStaticMarkup(createElement(QuotationApprovalCard, { row, incoming: false }))
    expect(html).toContain("Recall to Draft")
    expect(html).not.toContain(">Approve<")
    const completed = renderToStaticMarkup(createElement(QuotationApprovalCard, { row: { ...row, status: "draft", canRecall: false, rejectionReason: "Revise pricing" }, incoming: false }))
    expect(completed).toContain("Revise pricing")
    expect(completed).not.toContain("Recall to Draft")
  })
})
