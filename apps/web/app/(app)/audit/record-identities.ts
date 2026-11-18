import "server-only"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Tx, ServerContext } from "@/lib/actions"
import { accounts, leads, persons, opportunities, funnels } from "@/db/schema"
import { accountReadScope, ownerScope, visibleMemberIds } from "@/lib/access-scope"
import { PERMISSIONS } from "@/lib/permissions"
import { resolveAuditIdentities, type AuditIdentityRequest, type AuditIdentity } from "@/lib/audit-identities"

/** Core CRM only; unsupported module records retain historical-ID fallback. */
export async function auditRecordIdentities(tx: Tx, ctx: ServerContext, rows: AuditIdentityRequest[]) {
  const visible = await visibleMemberIds(tx, ctx)
  return resolveAuditIdentities(rows, async (type, ids) => {
    let found: { id: string; name: string }[] = []
    let route = ""
    if (type === "account" && ctx.can(PERMISSIONS.ACCOUNT_VIEW)) {
      found = await tx.select({ id: accounts.id, name: accounts.name }).from(accounts)
        .where(and(inArray(accounts.id, ids), isNull(accounts.deletedAt), accountReadScope(visible)))
      route = "/accounts"
    } else if (type === "lead" && ctx.can(PERMISSIONS.LEAD_VIEW)) {
      found = await tx.select({ id: leads.id, name: leads.name }).from(leads)
        .where(and(inArray(leads.id, ids), isNull(leads.deletedAt), ownerScope(leads.ownerMemberId, visible)))
      route = "/leads"
    } else if (type === "person" && ctx.can(PERMISSIONS.PERSON_VIEW)) {
      found = await tx.select({ id: persons.id, name: sql<string>`trim(concat_ws(' ', ${persons.firstName}, ${persons.lastName}))` }).from(persons)
        .innerJoin(accounts, eq(persons.accountId, accounts.id))
        .where(and(inArray(persons.id, ids), isNull(persons.deletedAt), isNull(accounts.deletedAt), accountReadScope(visible)))
      route = "/persons"
    } else if (["opportunity", "opportunity_container", "funnel"].includes(type) && ctx.can(PERMISSIONS.OPPORTUNITY_VIEW)) {
      // Historical events used "opportunity" for Funnels. Resolve current
      // containers first, then only unresolved IDs against the legacy table.
      const identities: AuditIdentity[] = []
      if (type !== "funnel") {
        const containers = await tx.select({ id: opportunities.id, name: opportunities.name }).from(opportunities)
          .where(and(inArray(opportunities.id, ids), isNull(opportunities.deletedAt), ownerScope(opportunities.ownerMemberId, visible)))
        identities.push(...containers.map(record => ({ ...record, href: `/opportunities/${encodeURIComponent(record.id)}` })))
      }
      const missing = ids.filter(id => !identities.some(record => record.id === id))
      if (type !== "opportunity_container" && missing.length) {
        const legacy = await tx.select({ id: funnels.id, name: funnels.name }).from(funnels)
          .where(and(inArray(funnels.id, missing), isNull(funnels.deletedAt), ownerScope(funnels.ownerMemberId, visible)))
        identities.push(...legacy.map(record => ({ ...record, href: `/funnel/${encodeURIComponent(record.id)}` })))
      }
      return identities
    }
    return found.map(record => ({ ...record, href: `${route}/${encodeURIComponent(record.id)}` }))
  })
}
