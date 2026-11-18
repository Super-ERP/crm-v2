import { describe, expect, it } from "vitest"
import { accountRecordTabs, contactRecordTabs, funnelRecordTabs, OPPORTUNITY_RECORD_TABS } from "@/lib/crm-record-tabs"
import { recordTabValue } from "@/lib/record-tab"

describe("CRM record tab eligibility", () => {
  it("falls back to Activity for every disabled Funnel workspace and accepts enabled workspaces", () => {
    for (const milestoneVisible of [false,true]) for (const projectsEnabled of [false,true])
    for (const financeEnabled of [false,true]) for (const contractEnabled of [false,true]) {
      const tabs = funnelRecordTabs({milestoneVisible,projectsEnabled,financeEnabled,contractEnabled})
      for (const [tab,enabled] of [["milestones",milestoneVisible],["projects",projectsEnabled],["costs",financeEnabled],["contract",contractEnabled]] as const) {
        expect(recordTabValue(`?tab=${tab}`,"activity",tabs)).toBe(enabled ? tab : "activity")
      }
    }
  })
  it("rejects disabled Account projects and absent Account/Contact project-code panels", () => {
    expect(recordTabValue("?tab=projects","contacts",accountRecordTabs(false,false))).toBe("contacts")
    expect(recordTabValue("?tab=projects","contacts",accountRecordTabs(true,false))).toBe("projects")
    expect(recordTabValue("?tab=project-codes","contacts",accountRecordTabs(true,false))).toBe("contacts")
    expect(recordTabValue("?tab=project-codes","pipelines",contactRecordTabs(false))).toBe("pipelines")
    expect(recordTabValue("?tab=project-codes","pipelines",contactRecordTabs(true))).toBe("project-codes")
  })
  it("rejects the nonexistent Opportunity history panel", () => {
    expect(recordTabValue("?tab=history","funnels",OPPORTUNITY_RECORD_TABS)).toBe("funnels")
    expect(recordTabValue("?tab=analysis","funnels",OPPORTUNITY_RECORD_TABS)).toBe("analysis")
  })
})
