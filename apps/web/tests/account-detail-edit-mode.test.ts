import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
const navigation = vi.hoisted(() => ({ edit: false }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, replace() {} }), useSearchParams: () => new URLSearchParams(navigation.edit ? "edit=1" : "") }))
vi.mock("@/app/(app)/accounts/actions", () => ({ updateAccount: vi.fn() }))
vi.mock("@/components/activity/activity-timeline", () => ({ ActivityTimeline: () => null }))
vi.mock("@/components/documents-section", () => ({ DocumentsSection: () => null }))
vi.mock("@/app/(app)/accounts/[id]/account-contacts", () => ({ AccountContacts: () => null }))
vi.mock("@/components/data-table", () => ({ DataTable: () => null, SortableHeader: () => null, linkCell: () => null, moneyCell: () => null, rightHeader: () => null }))
vi.mock("@/components/ui/tabs", () => {
  const container = ({children}: {children: ReactNode}) => createElement("div", null, children)
  return { TabsContent: container, TabsList: container }
})
vi.mock("@/components/detail-page", () => {
  const container = ({children}: {children: ReactNode}) => createElement("div", null, children)
  return { DetailAside: container, DetailTabs: container, FieldSection: container, FieldRow: container, CountTab: container, RelatedCard: () => null, DetailCardHeader: ({actions}: {actions: ReactNode}) => createElement("header", null, actions) }
})
import { AccountDetailBody, type AccountDetailData } from "@/app/(app)/accounts/[id]/account-detail-body"
const data = {
  accountId: "sample", canEdit: true, record: { name: "Sample", currency: "MYR", accountType: "client" },
  sections: [{ title: "Account Information", fields: [{ label: "Name", value: "Sample", editKey: "name" }, { label: "Type", value: "Client", editKey: "accountType" }] }],
  industries: [], parentOptions: [], currencies: ["MYR"], countries: [], members: [], contacts: [], opportunities: [], pipelines: [], projects: [], quotations: [], childAccounts: [], activity: [], documents: [],
} as unknown as AccountDetailData
function render(canEdit = true) { return renderToStaticMarkup(createElement(AccountDetailBody, {...data, canEdit})) }
describe("account detail view and edit modes", () => {
  it("shows read-only values and one Edit action by default", () => {
    navigation.edit = false
    const html = render()
    expect(html).toContain(">Edit</button>")
    expect(html).not.toContain("Click to edit name")
    expect(html).not.toContain("Click to change account type")
    expect(html).not.toContain("Save changes")
    expect(html.match(/Sample/g)).toHaveLength(1)
    expect(html).not.toContain("Account details</h2>")
  })
  it("enables in-place editors and shared Save/Cancel without a replacement form", () => {
    navigation.edit = true
    const html = render()
    expect(html.match(/Click to edit name/g)).toHaveLength(1)
    expect(html.match(/Click to change account type/g)).toHaveLength(1)
    expect(html).toContain("Save changes")
    expect(html).toContain("Cancel")
    expect(html).not.toContain("<form")
  })
  it("does not allow edit query parameters to bypass permissions", () => {
    navigation.edit = true
    const html = render(false)
    expect(html).not.toContain("Save changes")
    expect(html).not.toContain("Click to change account type")
  })
})
