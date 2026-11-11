import { describe, expect, it } from "vitest"
import { voidDuplicateFunnelSchema } from "@/lib/funnel-void"
import { canVoidDuplicateFunnel } from "@/server/services/void-duplicate-funnel"
import { PERMISSIONS } from "@/lib/permissions"
const funnelId = "11111111-1111-4111-8111-111111111111"
const retainedFunnelId = "22222222-2222-4222-8222-222222222222"

describe("duplicate Closed Won correction", () => {
  it("requires both deletion and stage-approval capabilities", () => {
    for (const permissions of [[], [PERMISSIONS.OPPORTUNITY_DELETE], [PERMISSIONS.STAGE_ADVANCE_APPROVE]]) {
      expect(canVoidDuplicateFunnel({ can: key => (permissions as string[]).includes(key) })).toBe(false)
    }
    expect(canVoidDuplicateFunnel({ can: () => true })).toBe(true)
  })
  it("requires a distinct retained funnel and a nonblank bounded reason", () => {
    expect(voidDuplicateFunnelSchema.parse({ funnelId, retainedFunnelId, reason: "  Duplicate import  " }).reason).toBe("Duplicate import")
    for (const input of [{ retainedFunnelId: funnelId, reason: "Duplicate" }, { retainedFunnelId, reason: " " }, { retainedFunnelId, reason: "x".repeat(1001) }, { retainedFunnelId: "invalid", reason: "Duplicate" }]) {
      expect(voidDuplicateFunnelSchema.safeParse({ funnelId, ...input }).success).toBe(false)
    }
  })
})
