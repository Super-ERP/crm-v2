"use server"
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { runInTenant } from '@/db'
import { requireContext } from '@/lib/server-context'
import { normalizeActionError } from '@/lib/action-error'
import { humanizeDenial } from '@/lib/permissions'
import type { ActionResult } from '@/lib/action-result'
import { runAction } from '@/lib/action-result'
import { VOID_ENTITY_TYPES,voidTargetSchema,type VoidTarget,type VoidImpact,type VoidEntityType } from '@/lib/record-void'
import { voidEntityCatalog,canRequestRecordVoid } from '@/server/services/record-void-registry'
import { getRecordVoidImpact,requestRecordVoid,decideRecordVoid } from '@/server/services/record-void'
import { lockRecordVoidGraph } from '@/server/services/record-void-lock'
import { canManageAllRecords,visibleMemberIds } from '@/lib/access-scope'
import { getEntitledModuleMap } from '@/lib/modules.server'
import { approvalQueueSql } from '@/server/services/approval-queue-query'
import type { ApprovalQueueRead } from '@/lib/approval-queue'

export async function previewRecordVoid(target:VoidTarget):Promise<ActionResult<VoidImpact>> {
 try {
  const parsed=voidTargetSchema.parse(target),ctx=await requireContext()
  const data=await runInTenant(ctx.tenantId,async tx=>{
   await lockRecordVoidGraph(tx,ctx.tenantId)
   return getRecordVoidImpact(tx,ctx,parsed,ctx.can('record.void.approve')?'review':'request')
  })
  return {ok:true,data}
 } catch(error) {
  const normalized=normalizeActionError(error)
  return {ok:false,error:humanizeDenial(normalized.message)}
 }
}

export async function submitRecordVoid(input:unknown) {
 return runAction(async()=>{
  const ctx=await requireContext()
  const requestId=await runInTenant(ctx.tenantId,tx=>requestRecordVoid(tx,ctx,input),{deadlockRetries:2})
  revalidatePath('/approvals')
  return {requestId}
 })
}
export async function decideUniversalVoid(input:{requestId:string;approve:boolean;note:string;fingerprint?:string}) {
 return runAction(async()=>{
  const value=z.object({requestId:z.string().uuid(),approve:z.boolean(),note:z.string().max(1000),fingerprint:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(input)
  const ctx=await requireContext()
  const target=await runInTenant(ctx.tenantId,tx=>decideRecordVoid(tx,ctx,value),{deadlockRetries:2})
  revalidatePath('/','layout')
  return target
 })
}
export type UniversalVoidRow={id:string;entityType:VoidEntityType;entityId:string;impact:VoidImpact;reason:string;status:string;requesterName:string|null;requesterMemberId:string;requestedAt:string;decidedAt:string|null;decisionNote:string|null;deciderName:string|null;queueSortKey?:string}
export async function listUniversalVoidRequests(tab:'mine'|'incoming',queue:ApprovalQueueRead) {
 const ctx=await requireContext()
 const empty={rows:[] as UniversalVoidRow[],total:0}
 if(!ctx.memberId||tab==='incoming'&&!ctx.can('record.void.approve'))return empty
 const memberId=ctx.memberId
 return runInTenant(ctx.tenantId,async tx=>{
  const visible=await visibleMemberIds(tx,ctx),modules=await getEntitledModuleMap()
  const allowed=VOID_ENTITY_TYPES.filter(type=>{const d=voidEntityCatalog[type];return ctx.can(d.view)&&(!d.module||modules[d.module])})
  if(!allowed.length)return empty
  const ownerCases=allowed.map(type=>{const d=voidEntityCatalog[type];return sql`when ${type} then (select ${sql.raw(d.owner)} from ${sql.identifier(d.table)} t where t.id=r.entity_id and t.tenant_id=r.tenant_id)`})
  const scoped=canManageAllRecords(ctx)||visible===null?sql`true`:visible.length?sql`(r.entity_type='product' or (case r.entity_type ${sql.join(ownerCases,sql` `)} end) in (${sql.join(visible.map(id=>sql`${id}`),sql`,`)}))`:sql`false`
  const permissionKeys=[...ctx.permissions]
  const financial=sql`not exists(select 1 from jsonb_array_elements_text(coalesce(r.impact->'requiredPermissions','[]'::jsonb)) required(key) where not (required.key=any(${permissionKeys}::text[])))`
  const condition=tab==='mine'?sql`r.requester_member_id=${memberId}`:sql`r.status='pending' and r.requester_member_id<>${memberId} and ${scoped} and ${financial} and (r.entity_type<>'sales_order' or ${ctx.can('sales_order.approve')}) and (r.entity_type<>'finance_doc' or ${ctx.can('finance.manage')})`
  const source=sql`select r.id,r.entity_type as "entityType",r.entity_id as "entityId",r.impact,r.reason,r.status,r.requester_member_id as "requesterMemberId",u.name as "requesterName",r.requested_at as "requestedAt",r.decided_at as "decidedAt",r.decision_note as "decisionNote",du.name as "deciderName",floor(extract(epoch from r.requested_at)*1000000)::bigint::text as "queueSortKey",concat_ws(' ',r.impact->'target'->>'label',r.reason,u.name,r.entity_type) as "queueSearch"
   from record_void_requests r join member m on m.id=r.requester_member_id and m.organization_id=r.tenant_id join "user" u on u.id=m.user_id left join member dm on dm.id=r.decided_by_member_id and dm.organization_id=r.tenant_id left join "user" du on du.id=dm.user_id
   where r.tenant_id=${ctx.tenantId} and r.entity_type in (${sql.join(allowed.map(type=>sql`${type}`),sql`,`)}) and ${condition}`
  const rows=await tx.execute<UniversalVoidRow&{queueTotal?:number}>(approvalQueueSql(source,'record_void',queue))
  return {rows:rows.filter(row=>row.id),total:Number(rows[0]?.queueTotal??0)}
 })
}
export async function findVoidRecords(input:{type:VoidEntityType;search:string}) {
 const value=z.object({type:z.enum(VOID_ENTITY_TYPES),search:z.string().trim().max(200)}).parse(input)
 const ctx=await requireContext(),d=voidEntityCatalog[value.type],modules=await getEntitledModuleMap()
 if(!ctx.can(d.view)||!canRequestRecordVoid(ctx,value.type)||d.module&&!modules[d.module])return []
 return runInTenant(ctx.tenantId,async tx=>{
  const visible=await visibleMemberIds(tx,ctx)
  const scoped=value.type==='product'||canManageAllRecords(ctx)||visible===null?sql`true`:visible.length?sql`${sql.raw(d.owner)} in (${sql.join(visible.map(id=>sql`${id}`),sql`,`)})`:sql`false`
  const pattern=`%${value.search.replace(/[\\%_]/g,'\\$&')}%`
  const label=sql`coalesce(to_jsonb(t)->>'quote_number',to_jsonb(t)->>'so_number',to_jsonb(t)->>'number',to_jsonb(t)->>'name',to_jsonb(t)->>'title',to_jsonb(t)->>'contract_number',to_jsonb(t)->>'supplier_name',concat_ws(' ',to_jsonb(t)->>'first_name',to_jsonb(t)->>'last_name'))`
  return tx.execute<{id:string;label:string}>(sql`select t.id,${label} as label from ${sql.identifier(d.table)} t where t.tenant_id=${ctx.tenantId} and ${scoped} and (to_jsonb(t)->>'deleted_at') is null and coalesce(to_jsonb(t)->>'status','') <> 'void' and (${value.type}<>'finance_doc' or coalesce(to_jsonb(t)->>'status','')<>'cancelled') and ${label} ilike ${pattern} order by ${label},t.id limit 30`)
 })
}
