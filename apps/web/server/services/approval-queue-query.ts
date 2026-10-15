import { sql,type SQL } from 'drizzle-orm'
import { APPROVAL_PAGE_SIZE } from '@/lib/approval-pagination'
import { validateApprovalQueueRead,type ApprovalKind,type ApprovalQueueRead } from '@/lib/approval-queue'

/** The supplied source already enforces workflow permissions, routing and record scope.
 * Search/count precede the cursor. A sentinel preserves totals for exhausted sources.
 * Microsecond integer keys avoid losing records to JavaScript's millisecond dates. */
export function approvalQueueSql(source:SQL,kind:ApprovalKind,input:ApprovalQueueRead):SQL {
 const {order,search,cursor}=validateApprovalQueueRead(input)
 const direction=order==='oldest'?sql`ASC`:sql`DESC`
 const compare=order==='oldest'?sql`>`:sql`<`
 const after=cursor?sql`(m."queueSortKey"::bigint, m.id::text, ${kind}::text) ${compare} (${cursor.queueSortKey}::bigint,${cursor.id}::text,${cursor.kind}::text)`:sql`true`
 const pattern=`%${(search??'').replace(/[\\%_]/g,'\\$&')}%`
 return sql`WITH source AS (${source}), matches AS (
   SELECT * FROM source WHERE ${search?sql`"queueSearch" ILIKE ${pattern}`:sql`true`}
 ) SELECT page.*, (SELECT count(*)::int FROM matches) AS "queueTotal"
 FROM (SELECT 1) seed LEFT JOIN LATERAL (
   SELECT * FROM matches m WHERE ${after}
   ORDER BY m."queueSortKey"::bigint ${direction},m.id::text ${direction}
   LIMIT ${APPROVAL_PAGE_SIZE+1}
 ) page ON true
 ORDER BY page."queueSortKey"::bigint ${direction},page.id::text ${direction}`
}
