import { describe, expect, it, vi } from "vitest"
import { resolveAuditIdentities } from "@/lib/audit-identities"

const event = (entityType: string, entityId: string) => ({ entityType, entityId })

describe("audit identity batching", () => {
  it("deduplicates repeated IDs before loading and restores event order", async () => {
    const load = vi.fn(async (_type: string, ids: string[]) => ids.map(id => ({ id, name: id, href: `/accounts/${id}` })))
    const results = await resolveAuditIdentities([event("account", "a"), event("account", "a"), event("account", "b")], load)
    expect(load).toHaveBeenCalledExactlyOnceWith("account", ["a", "b"])
    expect(results.map(record => record?.id)).toEqual(["a", "a", "b"])
  })
  it("keeps inaccessible, deleted and unsupported identities unavailable", async () => {
    const load = vi.fn(async () => [{ id: "live", name: "Authorized account", href: "/accounts/live" }])
    const results = await resolveAuditIdentities([event("account", "live"), event("account", "inaccessible"), event("account", "deleted"), event("finance_doc", "live")], load)
    expect(results.map(record => record?.name ?? null)).toEqual(["Authorized account", null, null, null])
    expect(load).toHaveBeenCalledTimes(1)
  })
  it("never reuses a same-ID identity from a different record type", async () => {
    const load = vi.fn(async (type: string) => type === "opportunity" ? [{ id: "same", name: "Container", href: "/opportunities/same" }] : [])
    const results = await resolveAuditIdentities([event("opportunity", "same"), event("funnel", "same")], load)
    expect(results[0]?.href).toBe("/opportunities/same")
    expect(results[1]).toBeNull()
  })
})
