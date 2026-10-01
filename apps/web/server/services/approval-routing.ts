import "server-only"
import { sql } from "drizzle-orm"
import type { Tx } from "@/db"

/**
 * Resolve the first eligible reporting manager in one bounded query.
 * RLS scopes every table to the caller's tenant. Match normal authorization:
 * union assigned roles; use the legacy primary role only when none are assigned.
 */
export async function findManagerApprover(tx: Tx, memberId: string, permission: string): Promise<string | null> {
  const rows = await tx.execute<{ memberId: string }>(sql`
    WITH RECURSIVE reporting_line AS (
      SELECT p.manager_member_id AS member_id, 1 AS depth,
        ARRAY[p.member_id, p.manager_member_id]::text[] AS seen
      FROM membership_profiles p
      WHERE p.member_id = ${memberId} AND p.manager_member_id IS NOT NULL
        AND p.manager_member_id <> p.member_id
      UNION ALL
      SELECT p.manager_member_id, line.depth + 1, line.seen || p.manager_member_id
      FROM reporting_line line
      JOIN membership_profiles p ON p.member_id = line.member_id
      WHERE line.depth < 25 AND p.manager_member_id IS NOT NULL
        AND NOT (p.manager_member_id = ANY(line.seen))
    )
    SELECT profile.member_id AS "memberId"
    FROM reporting_line line
    JOIN membership_profiles profile ON profile.member_id = line.member_id
    WHERE profile.status = 'active' AND EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions perm ON perm.id = rp.permission_id
      WHERE perm.key = ${permission} AND rp.role_id IN (
        SELECT mr.role_id FROM member_roles mr WHERE mr.member_id = profile.member_id
        UNION ALL
        SELECT profile.role_id WHERE NOT EXISTS (
          SELECT 1 FROM member_roles mr WHERE mr.member_id = profile.member_id
        )
      )
    )
    ORDER BY line.depth LIMIT 1
  `)
  return rows[0]?.memberId ?? null
}

export async function requireManagerApprover(tx: Tx, memberId: string, permission: string): Promise<string> {
  const approver = await findManagerApprover(tx, memberId, permission)
  if (!approver) throw new Error("No eligible manager is available. Ask an administrator to configure your reporting manager and their approval permission.")
  return approver
}
