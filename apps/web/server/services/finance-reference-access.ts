import "server-only"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { funnels, quotations, projects, salesOrders, paymentMilestones } from "@/db/schema"
import type { Tx } from "@/lib/actions"
import type { ServerContext } from "@/lib/server-context"
import { ownerScope, visibleMemberIds } from "@/lib/access-scope"
import { getEntitledModuleMap } from "@/lib/modules.server"
import { PERMISSIONS } from "@/lib/permissions"
import { milestoneReadScope } from "@/server/services/milestone-access"

type References = { funnelId?: string | null; quotationId?: string | null; projectId?: string | null; salesOrderId?: string | null; milestoneId?: string | null }
/** Batch lightweight identity checks using each destination's read contract. */
export async function financeReferenceAccess(tx: Tx, ctx: ServerContext, refs: readonly References[]) {
  const ids = (field: keyof References) => [...new Set(refs.map(r => r[field]).filter((id): id is string => !!id))]
  const result = { funnels: new Set<string>(), quotations: new Set<string>(), projects: new Set<string>(), salesOrders: new Set<string>(), milestones: new Set<string>() }
  const funnelIds = ids("funnelId"), quoteIds = ids("quotationId"), projectIds = ids("projectId"), orderIds = ids("salesOrderId"), milestoneIds = ids("milestoneId")
  if (!funnelIds.length && !quoteIds.length && !projectIds.length && !orderIds.length && !milestoneIds.length) return result
  const visible = await visibleMemberIds(tx, ctx)
  const modules = await getEntitledModuleMap()
  if (ctx.can?.(PERMISSIONS.OPPORTUNITY_VIEW) && funnelIds.length) {
    const rows = await tx.select({ id: funnels.id }).from(funnels).where(and(inArray(funnels.id, funnelIds), isNull(funnels.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
    result.funnels = new Set(rows.map(r => r.id))
  }
  if (ctx.can?.(PERMISSIONS.QUOTATION_VIEW) && quoteIds.length) {
    const rows = await tx.select({ id: quotations.id }).from(quotations).innerJoin(funnels, eq(quotations.funnelId, funnels.id)).where(and(inArray(quotations.id, quoteIds), isNull(quotations.deletedAt), isNull(funnels.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
    result.quotations = new Set(rows.map(r => r.id))
  }
  if (modules.projects && ctx.can?.(PERMISSIONS.PROJECT_VIEW) && projectIds.length) {
    const rows = await tx.select({ id: projects.id }).from(projects).where(and(inArray(projects.id, projectIds), isNull(projects.deletedAt), ownerScope(projects.ownerMemberId, visible)))
    result.projects = new Set(rows.map(r => r.id))
  }
  if (modules.salesOrders && ctx.can?.(PERMISSIONS.SALES_ORDER_VIEW) && orderIds.length) {
    const rows = await tx.select({ id: salesOrders.id }).from(salesOrders).innerJoin(projects, eq(salesOrders.projectId, projects.id)).where(and(inArray(salesOrders.id, orderIds), isNull(projects.deletedAt), ownerScope(projects.ownerMemberId, visible)))
    result.salesOrders = new Set(rows.map(r => r.id))
  }
  if (ctx.can?.(PERMISSIONS.PAYMENT_MILESTONE_VIEW) && milestoneIds.length) {
    const rows = await tx.select({ id: paymentMilestones.id }).from(paymentMilestones).where(and(inArray(paymentMilestones.id, milestoneIds), await milestoneReadScope(tx, ctx)))
    result.milestones = new Set(rows.map(r => r.id))
  }
  return result
}
