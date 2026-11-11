import "server-only"
import { createHash } from 'node:crypto'
import { and,eq,sql } from 'drizzle-orm'
import type { Tx } from '@/db'
import type { ServerContext } from '@/lib/server-context'
import { recordVoidRequests } from '@/db/schema'
import { recordVoidRequestSchema, type VoidTarget,type VoidImpact } from '@/lib/record-void'
import { validateVoidDecision } from '@/lib/funnel-void'
import { loadVoidRecord,canRequestRecordVoid } from './record-void-registry'
import { getSalesVoidImpact,executeSalesVoid } from './record-void-sales'
import { getFinanceVoidImpact,executeFinanceVoid } from './record-void-finance'
import { lockRecordVoidGraph } from './record-void-lock'
import { writeAudit } from '@/server/audit'

export async function activeVoidMembers(tx:Tx,ctx:ServerContext) {
 const rows=await tx.execute<{id:string;keys:string[]}>(sql`select m.id,array_agg(distinct p.key) as keys from member m
 join membership_profiles mp on mp.member_id=m.id and mp.tenant_id=m.organization_id
 join member_roles mr on mr.member_id=m.id and mr.tenant_id=m.organization_id
 join roles r on r.id=mr.role_id and r.tenant_id=m.organization_id
 join role_permissions rp on rp.role_id=r.id and rp.tenant_id=m.organization_id join permissions p on p.id=rp.permission_id
 where m.organization_id=${ctx.tenantId} and mp.status='active' group by m.id`)
 return rows.map(row=>{const permissions=new Set(row.keys);return {...ctx,memberId:row.id,isSuperadmin:false,permissions,can:(key:string)=>permissions.has(key)} as ServerContext})
}
export async function getRecordVoidImpact(tx:Tx,ctx:ServerContext,target:VoidTarget,mode:'request'|'review'='request'):Promise<VoidImpact> {
 const loaded=await loadVoidRecord(tx,ctx,target,mode)
 // Permission requirements belong to the eventual reviewer, not the salesperson.
 // Execution adapters still enforce the real reviewer's reversal capability.
 const previewCtx={...ctx,can:(key:string)=>key==='finance.reverse'||ctx.can(key)}
 const adapter=(target.type==='finance_doc'||target.type==='sales_order')?getFinanceVoidImpact:getSalesVoidImpact
 const impact=await adapter(tx,previewCtx,target)
 const requiresFinance = (target.type==='finance_doc'&&loaded.data.status!=='draft') ||
 (target.type==='payment_milestone'&&(loaded.data.status==='invoiced'||!!loaded.data.invoice_number||!!loaded.data.invoice_date||!!loaded.data.so_number)) ||
 (target.type==='contract_year'&&loaded.data.status==='invoiced') || (target.type==='deal_cost'&&!!loaded.data.po_number)
 if(requiresFinance)impact.effects.push('Requires an authorised financial reversal reviewer. No external payment or refund is executed by this action.')
 const fingerprint=createHash('sha256').update(JSON.stringify({type:target.type,data:loaded.data,blockers:impact.blockers,effects:impact.effects})).digest('hex')
 return {target:loaded.record,...impact,requiredPermissions:requiresFinance?['finance.reverse']:[],fingerprint}
}
export async function canReviewRecordVoid(tx:Tx,ctx:ServerContext,target:VoidTarget,allowInactive=false) {
 if(!ctx.memberId||!ctx.can('record.void.approve'))return false
 try {
  const {data}=await loadVoidRecord(tx,ctx,target,'review',allowInactive)
  if(target.type==='sales_order'&&!ctx.can('sales_order.approve'))return false
  if(target.type==='finance_doc'&&!ctx.can('finance.manage'))return false
  if((target.type==='finance_doc'&&data.status!=='draft'||target.type==='payment_milestone'&&(data.status==='invoiced'||data.invoice_number||data.invoice_date||data.so_number)||target.type==='contract_year'&&data.status==='invoiced'||target.type==='deal_cost'&&data.po_number)&&!ctx.can('finance.reverse'))return false
  return true
 } catch { return false }
}
export async function requestRecordVoid(tx:Tx,ctx:ServerContext,input:unknown) {
 const value=recordVoidRequestSchema.parse(input)
 if(!ctx.memberId)throw new Error('FORBIDDEN')
 await lockRecordVoidGraph(tx,ctx.tenantId)
 const impact=await getRecordVoidImpact(tx,ctx,value.target)
 if(impact.fingerprint!==value.fingerprint)throw new Error('Record or linked records changed. Refresh the impact before submitting.')
 let eligible=false
 for(const reviewer of await activeVoidMembers(tx,ctx)) {
  if(reviewer.memberId!==ctx.memberId&&await canReviewRecordVoid(tx,reviewer,value.target)){eligible=true;break}
 }
 if(!eligible)throw new Error('No other active authorised reviewer has access to this record. Ask an administrator to configure Sales Admin or financial reversal permissions.')
 const [pending]=await tx.select({id:recordVoidRequests.id}).from(recordVoidRequests).where(and(eq(recordVoidRequests.tenantId,ctx.tenantId),eq(recordVoidRequests.entityType,value.target.type),eq(recordVoidRequests.entityId,value.target.id),eq(recordVoidRequests.status,'pending')))
 if(pending)throw new Error('A void request is already awaiting review')
 const [request]=await tx.insert(recordVoidRequests).values({tenantId:ctx.tenantId,entityType:value.target.type,entityId:value.target.id,requesterMemberId:ctx.memberId,reason:value.reason,impact}).returning({id:recordVoidRequests.id})
 await writeAudit(tx,ctx,{action:'record.void_requested',entityType:'record_void_request',entityId:request.id,after:{target:value.target,label:impact.target.label,reason:value.reason,impact}})
 return request.id
}
export async function decideRecordVoid(tx:Tx,ctx:ServerContext,input:{requestId:string;approve:boolean;note:string;fingerprint?:string}) {
 if(!ctx.memberId||!ctx.can('record.void.approve'))throw new Error('FORBIDDEN')
 await lockRecordVoidGraph(tx,ctx.tenantId)
 const [request]=await tx.select().from(recordVoidRequests).where(and(eq(recordVoidRequests.tenantId,ctx.tenantId),eq(recordVoidRequests.id,input.requestId))).for('update')
 if(!request)throw new Error('Request not available')
 const note=validateVoidDecision(request,ctx.memberId,input.approve,input.note)
 const target={type:request.entityType,id:request.entityId}
 // Rejection remains possible if source was archived/reassigned after submission;
 // reviewer still needs current read/record scope and financial capability.
 if(!await canReviewRecordVoid(tx,ctx,target,true))throw new Error('FORBIDDEN: reviewer permissions changed')
 if(input.approve) {
  if(!await canReviewRecordVoid(tx,ctx,target))throw new Error('FORBIDDEN: reviewer permissions changed')
  const impact=await getRecordVoidImpact(tx,ctx,target,'review')
  if(impact.fingerprint!==input.fingerprint)throw new Error('Impact changed. Refresh and review it before approving.')
  if(impact.target.ownerMemberId!==request.impact.target.ownerMemberId)throw new Error('Record owner changed. Reject this request and ask the new owner to resubmit.')
  const requester=(await activeVoidMembers(tx,ctx)).find(member=>member.memberId===request.requesterMemberId)
  if(!requester||!canRequestRecordVoid(requester,target.type))throw new Error('Requester is no longer active or authorised. Reject this request.')
  await loadVoidRecord(tx,requester,target,'request')
  if(impact.blockers.length)throw new Error(impact.blockers.map(row=>row.message).join(' '))
  if(target.type==='finance_doc'||target.type==='sales_order')await executeFinanceVoid(tx,ctx,target,request.reason)
  else await executeSalesVoid(tx,ctx,target,request.reason)
  await writeAudit(tx,ctx,{action:'record.void_completed',entityType:'record_void_request',entityId:request.id,before:request.impact,after:{target,reason:request.reason,reviewedImpact:impact}})
 }
 await tx.update(recordVoidRequests).set({status:input.approve?'approved':'rejected',decisionNote:note,decidedByMemberId:ctx.memberId,decidedAt:new Date()}).where(eq(recordVoidRequests.id,request.id))
 await writeAudit(tx,ctx,{action:input.approve?'record.void_approved':'record.void_rejected',entityType:'record_void_request',entityId:request.id,after:{target,requesterMemberId:request.requesterMemberId,note}})
 return target
}
