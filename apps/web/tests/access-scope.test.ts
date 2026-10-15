import { describe, expect, it, vi } from "vitest"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { PERMISSIONS, ROLE_TEMPLATES } from "@/lib/permissions"

vi.mock("@/lib/modules.server", () => ({ requireEntitledModule: vi.fn() }))

import { canAccessAttachable, ownsOrManages, visibleMemberIds } from "@/lib/access-scope"

function context(grants: readonly string[], memberId: string | null = "sales") {
  return {
    memberId,
    isSuperadmin: false,
    can: (key: string) => grants.includes(key),
  } as ServerContext
}

function transaction() {
  return {
    select: () => ({ from: async () => [
      { memberId: "report", managerId: "sales" },
      { memberId: "indirect", managerId: "report" },
      { memberId: "peer", managerId: "someone-else" },
    ] }),
  } as unknown as Tx
}

describe("record ownership scope", () => {
  it.each(["Rep", "Senior Rep"])("restricts %s to own records even with reports", async (name) => {
    const role = ROLE_TEMPLATES.find((role) => role.name === name)!
    const visible = await visibleMemberIds(transaction(), context(role.permissions as string[]))
    expect(visible).toEqual(["sales"])
    expect(ownsOrManages(visible, "sales")).toBe(true)
    expect(ownsOrManages(visible, "report")).toBe(false)
    expect(ownsOrManages(visible, "indirect")).toBe(false)
    expect(ownsOrManages(visible, "peer")).toBe(false)
    expect(ownsOrManages(visible, null)).toBe(false)
  })

  it("lets managers see their own records and transitive reports", async () => {
    const role = ROLE_TEMPLATES.find((role) => role.name === "Manager")!
    expect(await visibleMemberIds(transaction(), context(role.permissions as string[])))
      .toEqual(["sales", "report", "indirect"])
  })

  it("does not grant team visibility from quotation approval alone", async () => {
    expect(await visibleMemberIds(transaction(), context([PERMISSIONS.QUOTATION_APPROVE])))
      .toEqual(["sales"])
  })

  it("preserves explicit view-all access", async () => {
    expect(await visibleMemberIds(transaction(), context([PERMISSIONS.RECORDS_VIEW_ALL])))
      .toBeNull()
  })

  it("preserves superadmin access without a membership", async () => {
    expect(await visibleMemberIds(transaction(), { ...context([], null), isSuperadmin: true }))
      .toBeNull()
  })

  it("denies scoped access without a membership", async () => {
    expect(await visibleMemberIds(transaction(), context([], null))).toEqual([])
  })
  it("does not let approval permission expose another owner's sales-order attachment", async () => {
    const tx = {
      select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [{ o: "peer" }] }) }) }) }),
    } as unknown as Tx
    expect(await canAccessAttachable(tx, context([PERMISSIONS.SALES_ORDER_APPROVE]), "sales_order", "order", "view"))
      .toBe(false)
  })

})
