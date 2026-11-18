/** These lists also gate each conditional trigger and panel, so stale URLs cannot select hidden work. */
export function funnelRecordTabs({milestoneVisible, projectsEnabled, financeEnabled, contractEnabled}: {
  milestoneVisible: boolean; projectsEnabled: boolean; financeEnabled: boolean; contractEnabled: boolean
}): string[] {
  return ["activity", "quotations", "products", ...(milestoneVisible ? ["milestones"] : []),
    ...(projectsEnabled ? ["projects"] : []), ...(financeEnabled ? ["costs"] : []),
    ...(contractEnabled ? ["contract"] : []), "documents"]
}
export function accountRecordTabs(projectsEnabled: boolean, hasProjectCodes: boolean): string[] {
  return ["contacts", "opportunities", "pipelines", ...(projectsEnabled ? ["projects"] : []),
    "quotations", "children", ...(hasProjectCodes ? ["project-codes"] : []), "activity", "documents"]
}
export function contactRecordTabs(hasProjectCodes: boolean): string[] {
  return ["pipelines", "projects", ...(hasProjectCodes ? ["project-codes"] : []), "activity", "documents"]
}
export const OPPORTUNITY_RECORD_TABS = ["funnels", "activity", "quotations", "products", "analysis", "remarks", "documents"]
