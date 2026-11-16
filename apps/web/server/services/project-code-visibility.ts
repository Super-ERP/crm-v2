import "server-only"
import { sql, type SQLWrapper } from "drizzle-orm"
import { funnels, opportunities } from "@/db/schema"
import { ownerScope } from "@/lib/access-scope"

/** Correlated and tenant/pipeline pinned, so readers need no extra joins. */
export function activeProjectCodeFunnel(source: { status: SQLWrapper; deletedAt: SQLWrapper; currentStageId: SQLWrapper; tenantId: SQLWrapper; pipelineId: SQLWrapper } = funnels) {
  return sql`(${source.status} IN ('open', 'won') AND ${source.deletedAt} IS NULL AND EXISTS (
    SELECT 1 FROM pipeline_stages code_stage
    WHERE code_stage.id = ${source.currentStageId} AND code_stage.tenant_id = ${source.tenantId}
      AND code_stage.pipeline_id = ${source.pipelineId}
      AND (code_stage.kind = 'WON' OR (code_stage.kind = 'OPEN' AND code_stage.code = '4a'))
  ))`
}

export function visibleProjectCode(column: SQLWrapper) {
  return sql<string | null>`CASE WHEN ${activeProjectCodeFunnel()} THEN ${column} ELSE NULL END`
}

/** Funnel readers join the parent Opportunity. Match the detail-page fallback
 * without exposing a parent's code outside the viewer's owner scope. */
export function displayedFunnelProjectCode(visible: string[] | null) {
  const parentScope = ownerScope(opportunities.ownerMemberId, visible) ?? sql`true`
  return visibleProjectCode(sql`coalesce(nullif(${funnels.projectCode}, ''), CASE WHEN
    ${opportunities.id} = ${funnels.opportunityId}
    AND ${opportunities.tenantId} = ${funnels.tenantId}
    AND ${opportunities.deletedAt} IS NULL AND ${parentScope}
    THEN ${opportunities.projectCode} ELSE NULL END)`)
}
