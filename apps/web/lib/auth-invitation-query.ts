import { and, eq, gt } from "drizzle-orm"
import type { Tx } from "@/db"
import { pendingInvites } from "@/db/schema"

/** Run inside the invitation's tenant scope; callers normalize the login email. */
export function findSignInInvitations(tx: Pick<Tx, "select">, email: string, now: Date) {
  return tx.select({ id: pendingInvites.id, tenantId: pendingInvites.tenantId })
    .from(pendingInvites)
    .where(and(
      eq(pendingInvites.normalizedEmail, email),
      // A typed comparison uses the timestamp column encoder for postgres-js.
      gt(pendingInvites.expiresAt, now),
    ))
}
