import { describe, expect, it } from "vitest"
import { assertConversionSnapshot, validateConversionInput, validateConversionReview, normalizeRegistrationNumber } from "@/lib/lead-conversion-approval"

describe("lead conversion approval validation", () => {
  it("rejects an edited lead snapshot instead of converting unapproved details", () => {
    expect(() => assertConversionSnapshot({ name: "Approved" }, { name: "Changed" })).toThrow("changed")
  })
  it("accepts unchanged snapshots irrespective of object key order", () => {
    expect(() => assertConversionSnapshot({ name: "A", email: "a@b.co" }, { email: "a@b.co", name: "A" })).not.toThrow()
  })
  it("requires an SSM number when requesting a new account", () => {
    expect(() => validateConversionInput({ leadId: "lead" })).toThrow("SSM")
  })
  it("rejects invalid conversion dates before submitting", () => {
    expect(() => validateConversionInput({ leadId: "lead", existingAccountId: "account", expectedCloseDate: "2026-02-31" })).toThrow("date")
  })
  it("does not let the requester assign the reviewed code", () => {
    const input = { leadId: "lead", newAccount: { code: "SALES", registrationNumber: "123-A" } }
    expect(validateConversionReview(input, { accountCode: "ADMIN", registrationChecked: true, independentAccountConfirmed: true }).newAccount?.code).toBe("ADMIN")
    expect(() => validateConversionReview(input)).toThrow("company code")
    expect(validateConversionReview(input, { accountCode: "NEW" }).newAccount?.code).toBe("NEW")
  })
  it("requires Project Nature whenever conversion creates a Funnel", () => {
    expect(() => validateConversionInput({ leadId: "lead", existingAccountId: "account", createOpportunity: true })).toThrow("Project Nature")
  })
  it("matches SSM identifiers despite punctuation, case and spacing", () => {
    expect(normalizeRegistrationNumber(" 2026-00123 (a) ")).toBe(normalizeRegistrationNumber("202600123A"))
  })
})
