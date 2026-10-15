import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { MilestonesPanel, type MilestoneItemBase } from "@/components/milestones-panel"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function render(milestones: MilestoneItemBase[], canManage = true) {
  const action = async () => ({ ok: true as const, data: undefined })
  return renderToStaticMarkup(createElement(MilestonesPanel, {
    milestones, valueCeiling: "100", currency: "MYR", canManage,
    onCreate: action, onUpdate: action, onDelete: action, onReorder: action, onSplit: action,
  }))
}

const milestone: MilestoneItemBase = {
  id: "payment", title: "Full payment", amount: "100", dueDate: null,
  status: "pending_invoicing", sortOrder: 0,
}

describe("explicit milestone setup", () => {
  it("offers setup without creating a default milestone", () => {
    const html = render([])
    expect(html).toContain("Payment schedule not configured")
    expect(html).toContain("Create payment schedule")
    expect(html).not.toContain("Full payment")
  })
  it("allows splitting and invoicing a pending full-value milestone", () => {
    const html = render([milestone])
    expect(html).toContain("Split payment")
    expect(html).toContain("Mark invoiced")
    expect(html).toContain("Pending invoicing")
  })
  it("does not offer splitting or another invoice for an invoiced milestone", () => {
    const html = render([{ ...milestone, status: "invoiced" }])
    expect(html).not.toContain("Split payment")
    expect(html).not.toContain("Mark invoiced")
  })
  it("does not offer schedule setup without manage permission", () => {
    expect(render([], false)).not.toContain("Create payment schedule")
  })
})
