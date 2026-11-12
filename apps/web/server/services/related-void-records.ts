import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { accounts } from "@/db/schema"
import { PERMISSIONS } from "@/lib/permissions"
import { z } from "zod"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { accountReadScope, canManageAllRecords, visibleMemberIds } from "@/lib/access-scope"
import type { VoidRecord, VoidTarget } from "@/lib/record-void"
import { canRequestRecordVoid, loadVoidRecord, voidEntityCatalog } from "./record-void-registry"

const RELATED_VOID_TYPES = ["contract", "contract_year", "deal_cost"] as const
export const relatedVoidCursorSchema = z.object({
  type: z.enum(RELATED_VOID_TYPES),
  id: z.string().uuid(),
}).strict()
export type RelatedVoidCursor = z.infer<typeof relatedVoidCursorSchema>
export const relatedVoidReadSchema = z.object({
  parent: z.object({ type: z.enum(["account", "funnel"]), id: z.string().uuid() }).strict(),
  after: relatedVoidCursorSchema.optional(),
}).strict()

/** Historical dependencies without detail routes, scoped to an accessible parent.
 * Child permissions and registry ownership are checked before pagination so an
 * inaccessible child cannot leak through a cursor or consume a visible slot. */
export async function listRelatedVoidRecords(
  tx: Tx,
  ctx: ServerContext,
  parent: VoidTarget,
  after?: RelatedVoidCursor,
): Promise<{ rows: VoidRecord[]; nextCursor: RelatedVoidCursor | null }> {
  const input = relatedVoidReadSchema.parse({ parent, after })
  const visible = await visibleMemberIds(tx, ctx)
  if (input.parent.type === "account") {
    if (!ctx.can(PERMISSIONS.ACCOUNT_VIEW)) throw new Error("FORBIDDEN: insufficient record permissions")
    const [account] = await tx.select({ id: accounts.id }).from(accounts).where(and(
      eq(accounts.tenantId, ctx.tenantId), eq(accounts.id, input.parent.id),
      isNull(accounts.deletedAt), accountReadScope(visible),
    )).limit(1)
    if (!account) throw new Error("Record not available")
  } else {
    await loadVoidRecord(tx, ctx, input.parent, "review")
  }
  const types = input.parent.type === "account" ? ["contract"] as const : RELATED_VOID_TYPES
  const queries = types.filter(type => {
    const definition = voidEntityCatalog[type]
    return ctx.can(definition.view) && canRequestRecordVoid(ctx, type)
  }).map(type => {
    const definition = voidEntityCatalog[type]
    // Every identifier/expression comes from the fixed internal registry.
    const owner = sql.raw(definition.owner)
    const scope = canManageAllRecords(ctx) ? sql`true` : sql`${owner} is not null and ${visible === null ? sql`true` : visible.length ? sql`${owner} in (${sql.join(visible.map(id => sql`${id}`), sql`, `)})` : sql`false`}`
    const relation = input.parent.type === "account" ? sql`t.account_id = ${input.parent.id}` : sql`t.funnel_id = ${input.parent.id}`
    const active = type === "contract_year" ? sql`t.status <> 'cancelled' and t.status <> 'void'` : type === "contract" ? sql`t.status is distinct from 'void'` : sql`true`
    return sql`select ${type}::text as type, t.id from ${sql.identifier(definition.table)} t where t.tenant_id = ${ctx.tenantId} and t.deleted_at is null and ${relation} and ${active} and (${scope})`
  })
  if (!queries.length) return { rows: [], nextCursor: null }
  const cursor = input.after ? sql`(related.type, related.id) > (${input.after.type}::text, ${input.after.id}::uuid)` : sql`true`
  const candidates = await tx.execute<RelatedVoidCursor>(sql`select related.type, related.id from (${sql.join(queries, sql` union all `)}) related where ${cursor} order by related.type, related.id limit 21`)
  const page = candidates.slice(0, 20)
  const rows: VoidRecord[] = []
  for (const target of page) rows.push((await loadVoidRecord(tx, ctx, target, "request")).record)
  return { rows, nextCursor: candidates.length > 20 ? page[page.length - 1] : null }
}
