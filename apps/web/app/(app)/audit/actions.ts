"use server"

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { normalizeRecordListQuery } from "@/lib/record-list-query"
import type { ServerTableQuery } from "@/lib/table-pagination"
import { withModule } from "@/lib/actions"
import { PERMISSIONS } from "@/lib/permissions"
import { auditLog, member, user } from "@/db/schema"

export type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string | null
  ip: string | null
  createdAt: string
}

/**
 * Tenant-scoped audit trail. Resolves the acting
 * member back to a user name; deployment-level events surface as a null actor.
 */
export async function listAuditPage(input: ServerTableQuery): Promise<{ rows: AuditRow[]; total: number }> {
  return withModule("audit", PERMISSIONS.AUDIT_VIEW, async (tx) => {
    const { limit, offset, query } = normalizeRecordListQuery(input,
      ["action", "record", "actor", "createdAt"], ["action", "record"])
    const search = query.search ? `%${query.search.replace(/[\\%_]/g, "\\$&")}%` : null
    const where = and(
      search ? or(ilike(auditLog.action, search), ilike(auditLog.entityType, search), ilike(user.name, search)) : undefined,
      query.selections.action?.length ? inArray(auditLog.action, query.selections.action) : undefined,
      query.selections.record?.length ? inArray(auditLog.entityType, query.selections.record) : undefined,
    )
    const sortColumns = { action: auditLog.action, record: auditLog.entityType, actor: user.name, createdAt: auditLog.createdAt }
    const sortColumn = query.sort?.id ? sortColumns[query.sort.id as keyof typeof sortColumns] : undefined
    const ordering = sortColumn ? query.sort?.desc ? desc(sortColumn) : asc(sortColumn) : desc(auditLog.createdAt)
    const [rows, totalRows] = await Promise.all([tx
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        actorName: user.name,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(member, eq(auditLog.actorMemberId, member.id))
      .leftJoin(user, eq(member.userId, user.id))
      .where(where)
      .orderBy(ordering, desc(auditLog.id))
      .limit(limit).offset(offset),
      tx.select({ count: sql<number>`count(*)::int` }).from(auditLog)
        .leftJoin(member, eq(auditLog.actorMemberId, member.id))
        .leftJoin(user, eq(member.userId, user.id)).where(where),
    ])

    return { rows: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })), total: totalRows[0]?.count ?? 0 }
  })
}

export async function listAuditFilterOptions() {
  return withModule("audit", PERMISSIONS.AUDIT_VIEW, async (tx) => {
    const [row] = await tx.select({
      actions: sql<string[]>`coalesce(jsonb_agg(distinct ${auditLog.action}), '[]'::jsonb)`,
      records: sql<string[]>`coalesce(jsonb_agg(distinct ${auditLog.entityType}), '[]'::jsonb)`,
    }).from(auditLog)
    return { actions: (row?.actions ?? []).sort(), records: (row?.records ?? []).sort() }
  })
}
