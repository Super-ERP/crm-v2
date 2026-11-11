import "server-only"
import { sql } from "drizzle-orm"
import type { Tx } from "@/db"

/** One ordered transaction lock for a tenant's lifecycle graph. Reentrant. */
export async function lockRecordVoidGraph(tx: Tx, tenantId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`crm:lifecycle:${tenantId}`},0))`)
}
