import "server-only"
import { inArray, sql } from "drizzle-orm"
import type { Tx } from "@/db"
import { paymentMilestones } from "@/db/schema"
import { visibleMemberIds } from "@/lib/access-scope"
import type { ServerContext } from "@/lib/server-context"

/** Hide ineligible schedules while retaining owned invoiced history. */
export async function milestoneReadScope(tx: Tx, ctx: ServerContext, includeInvoicedHistory = true) {
  const visible = await visibleMemberIds(tx, ctx)
  const funnelOwner = visible === null ? sql`true` : visible.length
    ? inArray(sql`mf.owner_member_id`, visible) : sql`false`
  const projectOwner = visible === null ? sql`true` : visible.length
    ? inArray(sql`mp.owner_member_id`, visible) : sql`false`
  return sql`(
    exists (
      select 1 from funnels mf
      join pipeline_stages ms on ms.id = mf.current_stage_id and ms.tenant_id = mf.tenant_id
      left join quotations mq on mq.funnel_id = mf.id and mq.tenant_id = mf.tenant_id and mq.status = 'accepted' and mq.deleted_at is null
      where mf.id = coalesce(${paymentMilestones.funnelId}, (
        select mp.funnel_id from projects mp where mp.id = ${paymentMilestones.projectId} and mp.tenant_id = ${paymentMilestones.tenantId}
      )) and mf.tenant_id = ${paymentMilestones.tenantId} and ${funnelOwner}
      and ((${includeInvoicedHistory} and ${paymentMilestones.status} = 'invoiced') or (
        mf.deleted_at is null and mf.status in ('open', 'won') and mq.status = 'accepted'
        and (ms.kind = 'WON' or (ms.kind = 'OPEN' and ms.code = '4a'))
      ))
    ) or (${includeInvoicedHistory} and ${paymentMilestones.funnelId} is null and ${paymentMilestones.status} = 'invoiced' and exists (
      select 1 from projects mp where mp.id = ${paymentMilestones.projectId}
      and mp.tenant_id = ${paymentMilestones.tenantId} and mp.funnel_id is null and ${projectOwner}
    ))
  )`
}
