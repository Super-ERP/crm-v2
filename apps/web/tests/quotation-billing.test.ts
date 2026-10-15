import { describe, expect, it } from "vitest"
import { resolveQuotationBillingAccount, canSelectBillToAccount } from "@/lib/quotation-billing"
import { resolveSourceBillTo } from "@/db/import/quotation-billing"

describe("quotation billing", () => {
  it("uses the quote bill-to without moving the end-user funnel", () => {
    expect(resolveQuotationBillingAccount("mcmc", "uniti")).toBe("uniti")
    expect(resolveQuotationBillingAccount("mcmc", null)).toBe("mcmc")
  })
  it("shares reseller selection without exposing other customer accounts", () => {
    expect(canSelectBillToAccount({ id: "reseller", accountType: "reseller", ownerMemberId: "other" }, ["me"], null)).toBe(true)
    expect(canSelectBillToAccount({ id: "client", accountType: "client", ownerMemberId: "other" }, ["me"], null)).toBe(false)
    expect(canSelectBillToAccount({ id: "client", accountType: "client", ownerMemberId: "other" }, ["me"], "client")).toBe(true)
  })
})

describe("Salesforce bill-to reconstruction", () => {
  const accounts = [{ id: "mcmc", name: "MCMC" }, { id: "uniti", name: "UNITI OFFICE SDN BHD" }]
  it("captures the explicit bill-to corroborated by the quote contact", () => {
    expect(resolveSourceBillTo({ billToName: "Uniti Office Sdn Bhd", contactAccountId: "uniti", endUserAccountId: "mcmc", accounts })).toEqual({ accountId: "uniti", issue: null })
  })
  it("resolves a unique explicit name without a contact, including customer-typed intermediaries", () => {
    expect(resolveSourceBillTo({ billToName: "UNITI OFFICE SDN BHD", contactAccountId: null, endUserAccountId: "mcmc", accounts }).accountId).toBe("uniti")
  })
  it("does not guess on conflicting contacts or ambiguous names", () => {
    expect(resolveSourceBillTo({ billToName: "UNITI OFFICE SDN BHD", contactAccountId: "mcmc", endUserAccountId: "mcmc", accounts }).accountId).toBeNull()
    expect(resolveSourceBillTo({ billToName: "UNITI OFFICE SDN BHD", contactAccountId: null, endUserAccountId: "mcmc", accounts: [...accounts, { id: "duplicate", name: "UNITI OFFICE SDN BHD" }] }).accountId).toBeNull()
  })
  it("does not infer a billing company from contact alone", () => {
    expect(resolveSourceBillTo({ billToName: "", contactAccountId: "uniti", endUserAccountId: "mcmc", accounts })).toEqual({ accountId: "mcmc", issue: null })
  })
})
