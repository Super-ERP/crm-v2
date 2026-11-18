import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MilestonesPanel, type MilestoneItemBase } from "@/components/milestones-panel"

const access = vi.hoisted(() => ({ permissions: new Set<string>() }))
vi.mock("@/components/command-palette", () => ({ usePermissions: () => access.permissions }))
vi.mock("@/components/record-void-button", () => ({ RecordVoidButton: ({ target, allowVoid, menuItems, actionLabel }: { target: { type: string; id: string }; allowVoid: boolean; menuItems?: ReactNode; actionLabel?: string }) => createElement("div", {}, createElement("button", { "aria-label": actionLabel }, "More"), menuItems, allowVoid ? createElement("button", { "data-void-type": target.type, "data-void-id": target.id }, "Void") : null) }))
vi.mock("@/components/ui/dropdown-menu", () => ({ DropdownMenuItem: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => createElement("button", { role: "menuitem", disabled }, children) }))
beforeEach(() => { access.permissions = new Set(["payment_milestone.manage", "payment_milestone.view"]) })
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace:vi.fn() }), useSearchParams:()=>new URLSearchParams(), usePathname:()=>"/funnel/demo" }))

function render(milestones: MilestoneItemBase[], canManage = true) {
  const action = async () => ({ ok: true as const, data: undefined })
  return renderToStaticMarkup(createElement(MilestonesPanel, {
    milestones, valueCeiling: "100", currency: "MYR", canManage,
    onCreate: action, onUpdate: action, onReorder: action, onSplit: action,
  }))
}

const milestone: MilestoneItemBase = {
  id: "payment", title: "Full payment", amount: "100", dueDate: null,
  status: "pending_invoicing", sortOrder: 0,
}

describe("explicit milestone setup", () => {
  it("requests reviewed void instead of deleting, independently of project edit permission", () => {
    const html = render([milestone], false)
    expect(html).toContain('data-void-type="payment_milestone"')
    expect(html).toContain('data-void-id="payment"')
    expect(html).toContain("Void")
    expect(html).not.toContain("Delete")
    expect(html).not.toContain("Move milestone")
  })
  it("hides void without the milestone request permission", () => {
    access.permissions = new Set(["payment_milestone.view"])
    expect(render([milestone])).not.toContain("Void")
  })
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
    expect(html).toContain('aria-label="More actions for Full payment"')
    expect(html).not.toContain("<summary")
    expect(html).toContain("Pending invoicing")
  })
  it("does not offer splitting or another invoice for an invoiced milestone", () => {
    const html = render([{ ...milestone, status: "invoiced" }])
    expect(html).not.toContain("Split payment")
    expect(html).not.toContain("Mark invoiced</button>")
  })
  it("does not offer schedule setup without manage permission", () => {
    expect(render([], false)).not.toContain("Create payment schedule")
  })
  it("does not offer a Funnel-only split action through the Project adapter",()=>{
    const action=async()=>({ok:true as const,data:undefined})
    const html=renderToStaticMarkup(createElement(MilestonesPanel,{milestones:[milestone],valueCeiling:'100',currency:'MYR',canManage:true,onCreate:action,onUpdate:action,onReorder:action,linkRecords:false}))
    expect(html).not.toContain('>Split</button>')
    expect(html).not.toContain('/payment-milestones/payment')
  })

  it("uses saved order even when due dates would sort differently",()=>{
    const html=render([{...milestone,id:'late',title:'Later position',sortOrder:2,dueDate:'2026-01-01'},{...milestone,id:'early',title:'Earlier position',sortOrder:1,dueDate:'2027-01-01'}],false)
    expect(html.indexOf('Earlier position')).toBeLessThan(html.indexOf('Later position'))
  })

  it('keeps quotation plan navigation available before invoicing eligibility',()=>{
    const action=async()=>({ok:true as const,data:undefined})
    const html=renderToStaticMarkup(createElement(MilestonesPanel,{milestones:[milestone],valueCeiling:'100',currency:'MYR',canManage:false,canEditPlan:true,planHref:'/quotations/q?tab=milestones',onCreate:action,onUpdate:action,onReorder:action}))
    expect(html).toContain('Edit payment plan')
    expect(html).toContain('/quotations/q?tab=milestones')
    expect(html).not.toContain('Mark invoiced')
  })

})
