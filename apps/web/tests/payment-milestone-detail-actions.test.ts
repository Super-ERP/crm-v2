import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PaymentMilestoneDetailBody } from "@/app/(app)/payment-milestones/payment-milestone-detail-body"
import type { PaymentMilestoneDetail } from "@/app/(app)/payment-milestones/actions"

const state = vi.hoisted(() => ({ editing: false, saving: false }))
vi.mock("@/components/use-record-editor", () => ({ useRecordEditor: ({ initial }: { initial: object }) => ({ record: initial, editing: state.editing, saving: state.saving, session: 0, stage: vi.fn(), start: vi.fn(), save: vi.fn(), cancel: vi.fn() }) }))
vi.mock("@/components/record-header-actions", () => ({ RecordHeaderActions: ({ canEdit, voidTarget }: { canEdit: boolean; voidTarget?: { type: string } }) => createElement("div", { "data-record-actions": true }, canEdit ? "Edit record" : "", voidTarget ? "Void record" : "") }))
vi.mock("@/app/(app)/payment-milestones/actions", () => ({ updateFunnelMilestone: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
const milestone = { id: "m1", title: "Deposit", amount: "100", status: "pending_invoicing", dueDate: null, description: null } as PaymentMilestoneDetail
function render(status = "pending_invoicing", canManage = true, canVoid = true) {
  return renderToStaticMarkup(createElement(PaymentMilestoneDetailBody, { milestone: { ...milestone, status } as PaymentMilestoneDetail, canManage, canVoid }))
}
beforeEach(() => { state.editing = false; state.saving = false })
describe("milestone record actions", () => {
  it("shows explicit edit and independent void permissions without inline editing in view mode", () => {
    const html = render()
    expect(html).toContain("Edit record")
    expect(html).toContain("Void record")
    expect(html).not.toContain("Click to edit")
    expect(html).toContain("Workflow actions")
    expect(html).toContain("Mark invoiced")
    expect(html).not.toContain("Highlights")
  })
  it("keeps project-only milestones read-only while preserving their void permission", () => {
    const html = render("pending_invoicing", false, true)
    expect(html).not.toContain("Edit record")
    expect(html).toContain("Void record")
    expect(html).not.toContain("Mark invoiced")
  })
  it("disables fields while saving and status workflow during a draft", () => {
    state.editing = true
    state.saving = true
    const html = render()
    expect(html).toMatch(/<fieldset[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Mark invoiced<\/button>/)
  })
  it("keeps invoiced amount locked during an edit session", () => {
    state.editing = true
    const html = render("invoiced")
    expect(html).not.toContain("Click to edit amount")
    expect(html).toContain("Click to edit name")
    expect(html).not.toContain("Mark invoiced")
  })
})
