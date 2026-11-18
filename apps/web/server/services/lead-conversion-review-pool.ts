import "server-only"
import { sql } from "drizzle-orm"
import { PERMISSIONS } from "@/lib/permissions"

/** Effective assigned-role union, with the same primary-role fallback as RBAC. */
export function leadConversionReviewPoolQuery(tenantId: string) {
  return sql`
    SELECT profile.member_id AS "memberId"
    FROM membership_profiles profile
    JOIN member m ON m.id = profile.member_id AND m.organization_id = ${tenantId}
    WHERE profile.status = 'active' AND (
      SELECT count(DISTINCT perm.key) FROM role_permissions rp
      JOIN permissions perm ON perm.id = rp.permission_id
      WHERE perm.key IN (${PERMISSIONS.LEAD_CONVERT_APPROVE}, ${PERMISSIONS.ACCOUNT_CODE_MANAGE})
        AND rp.role_id IN (
          SELECT mr.role_id FROM member_roles mr WHERE mr.member_id = profile.member_id
          UNION ALL SELECT profile.role_id WHERE NOT EXISTS (
            SELECT 1 FROM member_roles mr WHERE mr.member_id = profile.member_id
          )
        )
    ) = 2
  `
}
