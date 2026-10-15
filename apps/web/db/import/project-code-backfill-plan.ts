import { migrationId, type Dataset } from './plan'
export type ProjectCodeSnapshot = { funnels: { id: string; tenant_id: string; opportunity_id: string; deleted_at: string | null; updated_at: string; project_code?: string | null; cross_deal_project_code?: string | null }[] }
export type ProjectCodes = { projectCode: string | null; crossDealProjectCode: string | null }
export function planProjectCodeBackfill(data: Dataset, tenantId: string, stored: ProjectCodeSnapshot) {
  const ready: { sourceId: string; funnelId: string; opportunityId: string; updatedAt: string; before: ProjectCodes; after: ProjectCodes }[] = []
  const review: { sourceId: string; reason: string }[] = []
  let alreadyCaptured = 0
  const sources = data.Opportunity?.rows ?? []
  const counts = new Map<string, number>()
  for (const source of sources) counts.set(source.Id, (counts.get(source.Id) ?? 0) + 1)
  for (const source of sources) {
    const fail = (reason: string) => review.push({ sourceId: source.Id, reason })
    if (/^(true|1)$/i.test(source.IsDeleted || '')) { fail('Deleted source row excluded'); continue }
    if (!source.Id || counts.get(source.Id) !== 1 || !source.Opportunity__c) { fail('Missing or duplicate source identity or parent'); continue }
    const matches = stored.funnels.filter(f => f.id === migrationId(tenantId, 'Opportunity', source.Id))
    const funnel = matches[0]
    const opportunityId = migrationId(tenantId, 'Opportunity_ID__c', source.Opportunity__c)
    if (matches.length !== 1 || funnel.tenant_id !== tenantId || funnel.deleted_at || funnel.opportunity_id !== opportunityId) { fail('Imported funnel missing, deleted, duplicated or outside tenant/parent scope'); continue }
    const before = { projectCode: funnel.project_code ?? null, crossDealProjectCode: funnel.cross_deal_project_code ?? null }
    const desired = { projectCode: source.Project_Code__c?.trim() || null, crossDealProjectCode: source.Project_Code_For_Cross_Deal__c?.trim() || null }
    if (Object.keys(before).some(k => { const key = k as keyof ProjectCodes; return Boolean(before[key]?.trim()) && before[key] !== desired[key] })) { fail('Existing project code conflicts with source; preserve manual values'); continue }
    const after = { projectCode: desired.projectCode ?? before.projectCode, crossDealProjectCode: desired.crossDealProjectCode ?? before.crossDealProjectCode }
    if (before.projectCode === after.projectCode && before.crossDealProjectCode === after.crossDealProjectCode) { alreadyCaptured++; continue }
    ready.push({ sourceId: source.Id, funnelId: funnel.id, opportunityId, updatedAt: funnel.updated_at, before, after })
  }
  return { tenantId, sourceCount: sources.length, ready, review, alreadyCaptured }
}
