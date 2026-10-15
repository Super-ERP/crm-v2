import { and, eq } from 'drizzle-orm'
import type { Tx } from '@/db'
import { tablePreferences } from '@/db/schema'
import { getTableFields } from '@/lib/table-controls/registry'
import { normalizeTableLayout } from '@/lib/table-controls/state'
type Owner = {tenantId:string;memberId:string}
export function createTablePreferenceService(tx:Tx,owner:Owner) {
 if(!owner.tenantId||!owner.memberId)throw new Error('An active member is required for table preferences.')
 const scope=(listKey:string)=>and(eq(tablePreferences.organizationId,owner.tenantId),eq(tablePreferences.memberId,owner.memberId),eq(tablePreferences.listKey,listKey))
 return {
  async read(listKey:string) {
   const fields=getTableFields(listKey)
   const [row]=await tx.select().from(tablePreferences).where(scope(listKey)).limit(1)
   return row?normalizeTableLayout(row.layout,fields):null
  },
  async save(listKey:string,input:unknown) {
   const layout=normalizeTableLayout(input,getTableFields(listKey))
   await tx.insert(tablePreferences).values({organizationId:owner.tenantId,memberId:owner.memberId,listKey,layout}).onConflictDoUpdate({target:[tablePreferences.organizationId,tablePreferences.memberId,tablePreferences.listKey],set:{layout,updatedAt:new Date()}})
  },
 }
}
