import { describe, expect, it } from "vitest"
import { recordTabHref, recordTabValue } from "@/lib/record-tab"

const tabs = ["details", "contacts", "funnel"] as const

describe("record tabs", () => {
  it("restores allowed tabs and rejects stale values", () => {
    expect(recordTabValue("?tab=contacts", "details", tabs)).toBe("contacts")
    expect(recordTabValue("?tab=deleted", "details", tabs)).toBe("details")
    expect(recordTabValue("", "details", tabs)).toBe("details")
  })
  it("keeps list return context, table filters and hash", () => {
    expect(recordTabHref("https://crm.test/accounts/a?returnTo=%2Faccounts%3Fq%3Dsam&people.page=2#related", "contacts", "details"))
      .toBe("/accounts/a?returnTo=%2Faccounts%3Fq%3Dsam&people.page=2&tab=contacts#related")
  })
  it("removes only its own query for the default tab", () => {
    expect(recordTabHref("https://crm.test/accounts/a?tab=contacts&people.page=2", "details", "details"))
      .toBe("/accounts/a?people.page=2")
  })
})
