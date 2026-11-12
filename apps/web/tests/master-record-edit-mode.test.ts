import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mode = vi.hoisted(() => ({ editing: false, permitted: true }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }))
vi.mock("@/components/command-palette", () => ({ usePermissions: () => ({ has: () => mode.permitted }) }))
vi.mock("@/components/use-record-editor", () => ({ useRecordEditor: ({initial}: {initial: object}) => ({ record: initial, editing: mode.editing, saving: false, session: 0, error: "", stage() {}, start() {}, save() {}, cancel() {}, markDirty() {} }) }))
vi.mock("@/components/record-void-button", () => ({ RecordVoidButton: () => createElement("button", null, "More") }))
vi.mock("@/app/(app)/leads/actions", () => ({ updateLead: vi.fn(), setLeadStatus: vi.fn(), setLeadStage: vi.fn() }))
vi.mock("@/app/(app)/persons/actions", () => ({ updatePerson: vi.fn() }))
vi.mock("@/app/(app)/projects/actions", () => ({ updateProject: vi.fn() }))
vi.mock("@/app/(app)/products/actions", () => ({ updateProduct: vi.fn(), listProductUsagePage: vi.fn() }))
vi.mock("@/app/(app)/opportunities/actions", () => ({ updateOpportunityContainer: vi.fn() }))
vi.mock("@/components/activity/activity-timeline", () => ({ ActivityTimeline: () => null }))
vi.mock("@/components/documents-section", () => ({ DocumentsSection: () => null }))
vi.mock("@/components/stage-path-view", () => ({ StagePathView: ({onStepClick}: {onStepClick?: unknown}) => createElement("button", {disabled: !onStepClick}, "Progress stage") }))
vi.mock("@/components/opportunity-analysis", () => ({ OpportunityAnalysis: () => null }))
vi.mock("@/app/(app)/projects/[id]/milestones-panel", () => ({ MilestonesPanel: () => null }))
vi.mock("@/app/(app)/projects/[id]/billing-panel", () => ({ BillingPanel: () => null }))
vi.mock("@/app/(app)/sales-orders/project-sales-orders", () => ({ ProjectSalesOrders: () => null }))
vi.mock("@/components/phone-input", () => ({ PhoneNumberDisplay: ({value}: {value: string}) => createElement("span", null, value) }))
vi.mock("@/components/record-phone-field", () => ({ RecordPhoneField: ({value}: {value: string}) => createElement("input", {"aria-label": "Phone", value, readOnly: true}) }))
vi.mock("@/components/inline-combobox", () => ({ InlineCombobox: ({title}: {title: string}) => createElement("select", {"aria-label": title}) }))
vi.mock("@/components/data-table", () => ({ DataTable: () => null, SortableHeader: () => null, linkCell: () => null, moneyCell: () => null, rightHeader: () => null }))
vi.mock("@/components/ui/tabs", () => {
  const container = ({children}: {children: ReactNode}) => createElement("div", null, children)
  return { TabsContent: container, TabsList: container, TabsTrigger: container }
})
vi.mock("@/components/detail-page", () => {
  const container = ({children}: {children: ReactNode}) => createElement("div", null, children)
  return { DetailAside: container, DetailTabs: container, TabsCard: container, FieldSection: container, FieldRow: container, CountTab: container, RelatedCard: () => null, DetailCardHeader: ({actions}: {actions: ReactNode}) => createElement("header", null, actions) }
})
import { LeadDetailBody, type LeadDetailData } from "@/app/(app)/leads/[id]/lead-detail-body"
import { PersonDetailBody, type PersonDetailData } from "@/app/(app)/persons/[id]/person-detail-body"
import { ProjectDetailBody, type ProjectDetailData } from "@/app/(app)/projects/[id]/project-detail-body"
import { ProductDetailBody } from "@/app/(app)/products/product-detail-body"
import { OpportunityDetailBody } from "@/app/(app)/opportunities/[id]/opportunity-detail-body"
const lead = { leadId: "l", canVoid: true, status: "new", record: {name: "Lead", email: "lead@example.com", phone: "+60123456789"}, sections: [{title: "Details", fields: [{label: "Name", value: "Lead", editKey: "name"}, {label: "Phone", value: "+60123456789", editKey: "phone"}]}], leadSteps: [], activity: [], files: [] } as unknown as LeadDetailData
const person = { personId: "p", canEdit: true, record: {firstName: "Contact", accountId: "a"}, sections: [{title: "Details", fields: [{label: "First name", value: "Contact", editKey: "firstName"}]}], accounts: [], funnels: [], projects: [], activity: [], documents: [] } as unknown as PersonDetailData
const project = { projectId: "j", canManage: true, record: {name: "Project", status: "active", value: "100", quotationId: "q", startDate: null, notes: "Notes"}, fields: ["name", "status", "value", "quotationId"].map(editKey => ({label: editKey, value: editKey, editKey})), quotationOptions: [{id: "q", quoteNumber: "Q1"}], milestones: [], salesOrders: [], activity: [], documents: [] } as unknown as ProjectDetailData
const product = { product: {id: "r", name: "Product", standardPrice: "100", currency: "MYR", isActive: true}, productCodes: [], usage: [], deals: [], canEdit: true } as unknown as React.ComponentProps<typeof ProductDetailBody>
const opportunity = {detail: { opportunity: {id: "o", name: "Opportunity", currency: "MYR", projectNatures: [], estimatedTotalsByCurrency: []}, funnels: [], quotations: [], products: [], accountId: "a"}, activity: [], documents: [], projectNatures: [{code: "T", name: "Training"}], persons: [], canEdit: true} as unknown as React.ComponentProps<typeof OpportunityDetailBody>
const render = (element: React.ReactElement) => renderToStaticMarkup(element)
beforeEach(() => { mode.editing = false; mode.permitted = true })
describe("master record detail editing", () => {
  it("opens all five records as read-only values with actions in their card header", () => {
    for (const element of [createElement(LeadDetailBody, lead), createElement(PersonDetailBody, person), createElement(ProjectDetailBody, project), createElement(ProductDetailBody, product), createElement(OpportunityDetailBody, opportunity)]) {
      const html = render(element)
      expect(html).toMatch(/<header>.*>Edit<\/button>.*<\/header>/)
      expect(html).not.toContain("<input")
      expect(html).not.toContain("<select")
      expect(html).not.toContain("Save changes")
    }
  })
  it("preserves project modal capabilities in the same editable record draft", () => {
    mode.editing = true
    const html = render(createElement(ProjectDetailBody, project))
    for (const label of ["name", "Status", "value", "Quotation", "notes"]) expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain("Save changes")
    expect(html).toContain("Cancel")
    expect(html).not.toContain("<form")
  })
  it("uses a controlled phone field during lead editing", () => {
    mode.editing = true
    expect(render(createElement(LeadDetailBody, lead))).toContain('aria-label="Phone"')
  })
  it("locks lead progress and conversion workflows for the whole record edit session", () => {
    const props = {...lead, workflowActions: createElement("button", null, "Convert lead")}
    const viewing = render(createElement(LeadDetailBody, props))
    expect(viewing).toContain("Convert lead")
    expect(viewing).toContain(">Progress stage</button>")
    expect(viewing).not.toContain('<button disabled="">Progress stage')
    mode.editing = true
    const editing = render(createElement(LeadDetailBody, props))
    expect(editing).not.toContain("Convert lead")
    expect(editing).toContain('<button disabled="">Progress stage</button>')
  })
  it("has one product editor per field and no duplicate details tab", () => {
    mode.editing = true
    const html = render(createElement(ProductDetailBody, product))
    for (const label of ["name", "description", "unit", "standard price"]) expect(html.match(new RegExp(`aria-label="${label}"`, "g"))).toHaveLength(1)
    expect(html).not.toContain(">Details</div>")
  })
  it("retains terminal lead locks and update permission gates", () => {
    mode.editing = true
    expect(render(createElement(LeadDetailBody, {...lead, status: "converted"}))).not.toContain("<input")
    expect(render(createElement(PersonDetailBody, {...person, canEdit: false}))).not.toContain("<input")
    expect(render(createElement(ProjectDetailBody, {...project, canManage: false}))).not.toContain("<input")
    expect(render(createElement(ProductDetailBody, {...product, canEdit: false}))).not.toContain("<input")
    expect(render(createElement(OpportunityDetailBody, {...opportunity, canEdit: false}))).not.toContain("<input")
  })
})
