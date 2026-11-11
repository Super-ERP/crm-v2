import { describe, expect, it } from "vitest"
import { validateVoidDecision } from "@/lib/funnel-void"

describe("void approval decisions", () => {
  it("forbids self approval and repeated decisions", () => {
    expect(() => validateVoidDecision({ status: "pending", requesterMemberId: "heng" }, "heng", true, "")).toThrow(/own request/)
    expect(() => validateVoidDecision({ status: "approved", requesterMemberId: "heng" }, "admin", true, "")).toThrow(/pending/)
  })
  it("requires a rejection reason and limits decision notes", () => {
    expect(() => validateVoidDecision({ status: "pending", requesterMemberId: "heng" }, "admin", false, " ")).toThrow(/reason/)
    expect(() => validateVoidDecision({ status: "pending", requesterMemberId: "heng" }, "admin", true, "x".repeat(1001))).toThrow()
  })
  it("accepts Sales Admin decisions and trims notes", () => {
    expect(validateVoidDecision({ status: "pending", requesterMemberId: "heng" }, "admin", false, " Keep this deal ")).toBe("Keep this deal")
  })
})
