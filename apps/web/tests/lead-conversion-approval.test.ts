import { describe, expect, it } from "vitest"
import { assertConversionSnapshot, validateConversionInput } from "@/lib/lead-conversion-approval"

describe("lead conversion approval validation", () => {
  it("rejects an edited lead snapshot instead of converting unapproved details", () => {
    expect(() => assertConversionSnapshot({ name: "Approved" }, { name: "Changed" })).toThrow("changed")
  })
  it("accepts unchanged snapshots irrespective of object key order", () => {
    expect(() => assertConversionSnapshot({ name: "A", email: "a@b.co" }, { email: "a@b.co", name: "A" })).not.toThrow()
  })
  it("requires a valid company code when requesting a new account", () => {
    expect(() => validateConversionInput({ leadId: "lead" })).toThrow("company code")
  })
  it("rejects invalid conversion dates before submitting", () => {
    expect(() => validateConversionInput({ leadId: "lead", existingAccountId: "account", expectedCloseDate: "2026-02-31" })).toThrow("date")
  })
})
