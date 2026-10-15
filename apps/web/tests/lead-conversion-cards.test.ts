import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("@/app/(app)/approvals/lead-conversion-actions", () => ({ decideLeadConversionAction: vi.fn() }))
import { LeadConversionApprovalCard } from "@/app/(app)/approvals/lead-conversion-cards"
import type { LeadConversionApprovalRow } from "@/app/(app)/approvals/lead-conversion-actions"
const row: LeadConversionApprovalRow = {
  id: "request", leadId: "lead", leadName: "Customer contact", companyName: "New Customer", status: "pending", requesterName: "Rep", approverName: "Manager",
  requestedAt: "2026-10-15T00:00:00Z", decidedAt: null, rejectionReason: null, canCancel: true, accountName: "New Customer", opportunityName: "Sales pursuit",
  email: "contact@example.test", phone: "1234", inputSnapshot: { leadId: "lead", createOpportunity: true, opportunityName: "Sales pursuit", funnelName: "First deal", expectedCloseDate: "2026-12-31", newAccount: { code: "NEW", accountType: "client", address: { line1: "Billing street", country: "Malaysia" } } },
}
describe("lead conversion review cards", () => {
  it("shows saved conversion and contact details before approval", () => {
    const html = renderToStaticMarkup(createElement(LeadConversionApprovalCard, { row, incoming: true }))
    for (const value of ["Lead conversion", "Submitted conversion details", "NEW", "Billing street", "Malaysia", "contact@example.test", "First deal", "2026-12-31", "Approve", "Reject", "View lead"]) expect(html).toContain(value)
    expect(html).not.toContain("Cancel request")
  })
  it("lets requesters cancel pending requests without decision actions", () => {
    const html = renderToStaticMarkup(createElement(LeadConversionApprovalCard, { row, incoming: false }))
    expect(html).toContain("Cancel request")
    expect(html).not.toContain(">Approve<")
    expect(renderToStaticMarkup(createElement(LeadConversionApprovalCard, { row: { ...row, status: "approved", canCancel: false }, incoming: false }))).not.toContain("Cancel request")
  })
})
