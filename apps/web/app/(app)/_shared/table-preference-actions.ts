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

/** Pipeline choices are entity configuration, not samples from the current page. */
export async function readTableFieldOptions(listKey:string):Promise<Record<string,{value:string;label:string}[]>> {
 const ctx=await owner(listKey)
 const {getTableFields}=await import('@/lib/table-controls/registry')
 const fields=getTableFields(listKey)
 const stageFields=fields.filter(field=>['stageId','stageName','funnelStageName','stage'].includes(field.id)&&field.type==='enum')
 if(!stageFields.length)return {}
 const {pipelineStages,pipelines}=await import('@/db/schema')
 const {and,eq,asc}=await import('drizzle-orm')
 return runInTenant(ctx.tenantId,async tx=>{
  const rows=await tx.select({id:pipelineStages.id,name:pipelineStages.name,code:pipelineStages.code,pipeline:pipelines.name})
   .from(pipelineStages).innerJoin(pipelines,and(eq(pipelines.id,pipelineStages.pipelineId),eq(pipelines.tenantId,ctx.tenantId)))
   .where(eq(pipelineStages.tenantId,ctx.tenantId)).orderBy(asc(pipelines.name),asc(pipelineStages.sortOrder))
  return Object.fromEntries(stageFields.map(field=>[field.id,[...new Map(rows.map(row=>[field.id==='stageId'?row.id:row.name,{value:field.id==='stageId'?row.id:row.name,label:`${row.code} · ${row.name} (${row.pipeline})`}])).values()]]))
 })
}


/** Requested-only business relationship projections; source IDs are re-authorized. */
export async function readTableRelationships(listKey:string,ids:string[],fields:string[],tree:import('@/lib/table-controls/types').FilterGroup):Promise<Record<string,Record<string,unknown>>>{
 const ctx=await requireContext()
 await requireTableAccess(ctx,listKey)
 const {getTableFields}=await import('@/lib/table-controls/registry')
 const {validateFilterTree}=await import('@/lib/table-controls/filter-tree')
 const validated=validateFilterTree(tree,getTableFields(listKey))
 const {projectRelationships}=await import('@/server/services/table-controls/relationships')
 return runInTenant(ctx.tenantId,tx=>projectRelationships(tx,ctx,listKey,ids,fields,validated))
}
