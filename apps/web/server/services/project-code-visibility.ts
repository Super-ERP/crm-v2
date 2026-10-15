import "server-only"
import { sql, type SQLWrapper } from "drizzle-orm"
import { funnels } from "@/db/schema"

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
