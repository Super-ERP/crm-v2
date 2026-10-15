"use server"
import { requireTableAccess } from '@/server/services/table-controls/access'
import { runInTenant } from '@/db'
import { requireContext } from '@/lib/actions'
import { runAction } from '@/lib/action-result'
import type { TableLayout } from '@/lib/table-controls/types'
import { createTablePreferenceService } from '@/server/services/table-controls/preferences'
async function owner(listKey:string) {
 const ctx=await requireContext()
 await requireTableAccess(ctx,listKey)
 if(!ctx.memberId)throw new Error('An active member is required for table preferences.')
 return {tenantId:ctx.tenantId,memberId:ctx.memberId}
}
export async function readTablePreferences(listKey:string):Promise<TableLayout|null> {
 const ctx=await owner(listKey)
 return runInTenant(ctx.tenantId,tx=>createTablePreferenceService(tx,ctx).read(listKey))
}
export async function saveTablePreferences(listKey:string,layout:TableLayout) {
 return runAction(async()=>{
  const ctx=await owner(listKey)
  await runInTenant(ctx.tenantId,tx=>createTablePreferenceService(tx,ctx).save(listKey,layout))
 })
}
