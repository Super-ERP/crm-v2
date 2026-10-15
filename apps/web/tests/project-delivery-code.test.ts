import { describe, expect, it, vi } from "vitest"
import { resolveDeliveryCode, validateDeliverySource, reusableDeliveryProject } from "@/lib/project-delivery-code"

describe("delivery project identity", () => {
  it("reuses the CRM code without consuming a number", async () => {
    const generate = vi.fn(async () => "NEW")
    expect(await resolveDeliveryCode("CRM-1", undefined, generate)).toBe("CRM-1")
    expect(generate).not.toHaveBeenCalled()
  })
  it("rejects a manual override of a source code", async () => {
    await expect(resolveDeliveryCode("CRM-1", "OTHER", async () => "NEW")).rejects.toThrow("source")
  })
  it("validates source account and quotation funnel", () => {
    expect(() => validateDeliverySource("a", { id: "f", accountId: "b" }, null)).toThrow("account")
    expect(() => validateDeliverySource("a", { id: "f", accountId: "a" }, { funnelId: "other" })).toThrow("quotation")
  })
  it("returns a visible same-account existing project and rejects conflicts", () => {
    const project = { id: "p", projectCode: "CRM-1", accountId: "a", deletedAt: null }
    expect(reusableDeliveryProject(project, "a", true)).toBe(project)
    expect(() => reusableDeliveryProject(project, "b", true)).toThrow("conflict")
    expect(() => reusableDeliveryProject(project, "a", false)).toThrow("conflict")
  })
})
