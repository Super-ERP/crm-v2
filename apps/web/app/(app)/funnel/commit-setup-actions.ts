'use server'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { withTenant } from '@/lib/actions'
import { PERMISSIONS } from '@/lib/permissions'
import { tenantSettings, funnels, opportunities, paymentMilestones, quotations, quotationLineItems } from '@/db/schema'
import { assertFunnelCodeAccess, availableProjectCodes, assignFunnelProjectCode, sharedProjectCodeImpact, renameSharedProjectCode } from '@/server/services/project-code-assignment'
import type { ProjectCodeChoice } from '@/lib/commit-stage'
import { canEnterProjectCodes } from '@/lib/project-code-permissions'
import { runAction } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { quoteNet } from '@/server/services/value'
import { quotationItemAllocations, billingRowsFromQuotationItems, type BillingScheduleInput } from '@/lib/billing-schedule'

export async function getCommitSetup(funnelId:string) {
 return withTenant(PERMISSIONS.STAGE_ADVANCE,async(tx,ctx)=> {
  const funnel=await assertFunnelCodeAccess(tx,ctx,funnelId)
  const [parent]=await tx.select({projectCode:opportunities.projectCode}).from(opportunities).where(and(eq(opportunities.id,funnel.opportunityId),isNull(opportunities.deletedAt)))
  const codes=await availableProjectCodes(tx,ctx,funnel.accountId)
  const rows=await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.funnelId,funnelId),isNull(paymentMilestones.deletedAt))).orderBy(asc(paymentMilestones.sortOrder))
  const quote=ctx.can(PERMISSIONS.QUOTATION_VIEW) && funnel.primaryQuotationId ? (await tx.select().from(quotations).where(and(eq(quotations.id,funnel.primaryQuotationId),eq(quotations.funnelId,funnelId),isNull(quotations.deletedAt))))[0] : null
  const financialHistory=await tx.execute(sql`select 1 from finance_docs d join payment_milestones m on m.id=d.milestone_id and m.tenant_id=d.tenant_id where m.funnel_id=${funnelId} and m.tenant_id=${ctx.tenantId} and m.deleted_at is null limit 1`)
  const lines=quote ? await tx.select({id:quotationLineItems.id,description:quotationLineItems.description,lineSubtotal:quotationLineItems.lineSubtotal}).from(quotationLineItems).where(eq(quotationLineItems.quotationId,quote.id)).orderBy(asc(quotationLineItems.sortOrder)) : []
  const items=quote ? quotationItemAllocations(lines,String(quoteNet(quote))) : []
  return {funnelName:funnel.name,currency:quote?.currency ?? funnel.currency,code:funnel.projectCode || parent?.projectCode || '',codes,quote:quote?{id:quote.id,number:quote.quoteNumber,net:quoteNet(quote)}:null,lines:items,
   rows:[...(ctx.can(PERMISSIONS.PAYMENT_MILESTONE_VIEW) ? rows : []).map(row=>({id:row.id,title:row.title,amount:row.amount,description:row.description,dueDate:row.dueDate,expectedInvoiceMonth:row.expectedInvoiceMonth??'',expectedInvoiceYear:row.expectedInvoiceYear??0,quotationLineItemId:row.quotationLineItemId})),...(!rows.length && ctx.can(PERMISSIONS.PAYMENT_MILESTONE_MANAGE) ? billingRowsFromQuotationItems(items) : [])] as BillingScheduleInput[],
   canManageSchedule:ctx.can(PERMISSIONS.PAYMENT_MILESTONE_MANAGE),hasLockedRows:rows.some(row=>row.status==='invoiced') || financialHistory.length>0}
 })
}
export async function searchAssignableProjectCodes(funnelId:string,search:string) {
 return withTenant(PERMISSIONS.OPPORTUNITY_VIEW,async(tx,ctx)=>{
  const [funnel]=await tx.select({accountId:funnels.accountId}).from(funnels).where(and(eq(funnels.id,funnelId),eq(funnels.tenantId,ctx.tenantId),isNull(funnels.deletedAt)))
  return funnel ? availableProjectCodes(tx,ctx,funnel.accountId,search) : []
 })
}
export async function changeFunnelProjectCode(funnelId:string,choice:ProjectCodeChoice) {
 return runAction(async()=>{
  const code=await withTenant(PERMISSIONS.OPPORTUNITY_VIEW,(tx,ctx)=>{
   // Sales Admin may set codes through the entry permission without broader Funnel edit rights.
   if(!ctx.can(PERMISSIONS.OPPORTUNITY_UPDATE)&&!canEnterProjectCodes(ctx))throw new Error('FORBIDDEN')
   return assignFunnelProjectCode(tx,ctx,funnelId,choice)
  })
  revalidatePath('/funnel');revalidatePath(`/funnel/${funnelId}`);revalidatePath('/project-codes')
  return {code}
 })
}

export async function getProjectNatureOptions() {
 return withTenant(PERMISSIONS.OPPORTUNITY_VIEW,async(tx,ctx)=>{
  const [settings]=await tx.select({natures:tenantSettings.projectNatures}).from(tenantSettings).where(eq(tenantSettings.organizationId,ctx.tenantId))
  return settings?.natures ?? []
 })
}

export async function previewSharedCodeRename(code: string) {
 return runAction(() => withTenant(PERMISSIONS.OPPORTUNITY_UPDATE,(tx,ctx)=>sharedProjectCodeImpact(tx,ctx,code)))
}
export async function renameSharedCode(code: string, next: string, version: string) {
 return runAction(async()=>{
  const result=await withTenant(PERMISSIONS.OPPORTUNITY_UPDATE,(tx,ctx)=>renameSharedProjectCode(tx,ctx,code,next,version))
  revalidatePath('/funnel','layout');revalidatePath('/opportunities','layout');revalidatePath('/project-codes','layout')
  return result
 })
}
