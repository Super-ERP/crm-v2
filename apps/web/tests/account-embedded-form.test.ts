import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/accounts/actions", () => ({ createAccount: vi.fn(), updateAccount: vi.fn(), findSimilarAccounts: vi.fn() }))
vi.mock("@/components/quick-create-account", () => ({ AccountQuickCreate: () => null }))
import { AccountForm } from "@/app/(app)/accounts/account-form"
import type { AccountRow } from "@/app/(app)/accounts/actions"

const account = { id: "sample", name: "Sample account", currency: "MYR", code: "SMP", accountType: "client", ownerMemberId: "owner", billingAddress: { country: "Malaysia" } } as AccountRow

describe("embedded account editor", () => {
  it("renders all account controls and explicit actions directly in the page without a dialog", () => {
    const html = renderToStaticMarkup(createElement(AccountForm, {
      embedded: true, account, parentOptions: [], endUserOptions: [], industries: [], currencies: ["MYR"],
      members: [{ memberId: "owner", name: "Sample owner" }],
    }))
    for (const label of ["Name", "Type", "Account owner", "Currency", "Website", "Office phone", "Cancel", "Save changes"]) expect(html).toContain(label)
    expect(html).toContain("Sample account")
    expect(html).toContain("Client (end user)")
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain('type="submit"')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Save changes<\/button>/)
  })
})
