import { describe, expect, it } from "vitest"
import { isProjectCodeActive, projectCodeHref } from "@/lib/project-code-policy"

describe("active project codes", () => {
  it.each(["0e", "1d", "2c", "3b", "lost", "kiv", null])("keeps %s inactive", code => {
    expect(isProjectCodeActive({ stageCode: code, stageKind: code === "lost" ? "LOST" : code === "kiv" ? "PARKED" : "OPEN", status: "open" })).toBe(false)
  })
  it("activates Commit and Won, but fails closed for inconsistent states", () => {
    expect(isProjectCodeActive({ stageCode: "4a", stageKind: "OPEN", status: "open" })).toBe(true)
    expect(isProjectCodeActive({ stageCode: "won", stageKind: "WON", status: "won" })).toBe(true)
    expect(isProjectCodeActive({ stageCode: "4a", stageKind: "OPEN", status: "lost" })).toBe(false)
    expect(isProjectCodeActive({ stageCode: "4a", stageKind: "PARKED", status: "open" })).toBe(false)
    expect(isProjectCodeActive({ stageCode: null, stageKind: null, status: "won" })).toBe(false)
  })
  it("preserves historical punctuation in central links", () => {
    const code = "2025/QM A&B #1%"
    const url = new URL(projectCodeHref(code), "https://crm.test")
    expect(url.pathname).toBe("/project-codes/view")
    expect(url.searchParams.get("code")).toBe(code)
  })
})
