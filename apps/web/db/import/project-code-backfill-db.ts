import type postgres from 'postgres'
import type { planProjectCodeBackfill } from './project-code-backfill-plan'
export async function applyProjectCodeBackfill(sql: postgres.Sql, plan: ReturnType<typeof planProjectCodeBackfill>, hashes: Record<string, string>) {
  if (plan.review.length) throw new Error('Resolve all review rows before applying project codes')
  return sql.begin(async tx => {
    for (const row of plan.ready) {
      const updated = await tx`update funnels set project_code = ${row.after.projectCode}, cross_deal_project_code = ${row.after.crossDealProjectCode}, updated_at = now()
        where id = ${row.funnelId} and tenant_id = ${plan.tenantId} and opportunity_id = ${row.opportunityId} and deleted_at is null
        and updated_at = ${row.updatedAt}::text::timestamptz
        and project_code is not distinct from ${row.before.projectCode}::text
        and cross_deal_project_code is not distinct from ${row.before.crossDealProjectCode}::text
        and exists (select 1 from opportunities p where p.id = ${row.opportunityId} and p.tenant_id = ${plan.tenantId} and p.deleted_at is null)
        returning id`
      if (updated.length !== 1) throw new Error(`Funnel changed or parent unavailable: ${row.sourceId}; transaction rolled back`)
      await tx`insert into audit_log (tenant_id, action, entity_type, entity_id, "before", "after", source, metadata)
        values (${plan.tenantId}, 'funnel.project_codes_backfilled', 'funnel', ${row.funnelId}, ${tx.json(row.before)}, ${tx.json(row.after)}, 'salesforce-project-code-backfill', ${tx.json({ sourceOpportunityId: row.sourceId, sourceHashes: hashes })})`
    }
    return plan.ready.length
  })
}
