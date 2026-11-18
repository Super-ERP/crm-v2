import 'server-only'
import {and,eq,inArray,isNull} from 'drizzle-orm'
import type {Tx} from '@/db'
import {quotationLineItems,paymentMilestones} from '@/db/schema'
import type {LineInput} from '@/app/(app)/quotations/actions'
import type {computeQuotation} from './quotation-math'
/** Keep line identities stable so billing sources survive ordinary draft saves. */
export async function updateQuotationLines(tx:Tx,tenantId:string,quotationId:string,lines:LineInput[],totals:ReturnType<typeof computeQuotation>,taxSettingId:string|null) {
 const stored=await tx.select().from(quotationLineItems).where(and(eq(quotationLineItems.quotationId,quotationId),eq(quotationLineItems.tenantId,tenantId)))
 const ids=lines.flatMap(line=>line.lineId?[line.lineId]:[])
 if(new Set(ids).size!==ids.length || ids.some(id=>!stored.some(line=>line.id===id)))throw new Error('Quotation item is invalid. Reload the quotation and try again.')
 const schedule=await tx.select().from(paymentMilestones).where(and(eq(paymentMilestones.quotationId,quotationId),eq(paymentMilestones.tenantId,tenantId),isNull(paymentMilestones.deletedAt)))
 const removed=stored.filter(line=>!ids.includes(line.id)).map(line=>line.id)
 if(schedule.some(row=>row.quotationLineItemId && removed.includes(row.quotationLineItemId)))throw new Error('A quotation item is used by the billing schedule. Reassign its billing rows before removing it.')
 const netCents=Math.round((totals.subtotal-totals.discountTotal)*100)
 if(schedule.reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)>netCents)throw new Error('Quoted amount excluding tax cannot be less than its billing schedule. Adjust the schedule first.')
 if(removed.length)await tx.delete(quotationLineItems).where(and(eq(quotationLineItems.quotationId,quotationId),inArray(quotationLineItems.id,removed)))
 const result:string[]=[]
 for(const [i,line] of lines.entries()) {
  const values={productId:line.productId?.trim()||null,projectNatureCode:line.projectNatureCode?.trim()||null,uom:line.uom?.trim()||null,description:line.description,quantity:line.quantity||'0',unitPrice:line.unitPrice||'0',discountAmount:line.discountAmount||'0',taxSettingId,lineSubtotal:totals.lines[i].lineSubtotal.toFixed(2),lineTax:totals.lines[i].lineTax.toFixed(2),lineTotal:totals.lines[i].lineTotal.toFixed(2),sortOrder:i}
  if(line.lineId){await tx.update(quotationLineItems).set(values).where(and(eq(quotationLineItems.id,line.lineId),eq(quotationLineItems.quotationId,quotationId),eq(quotationLineItems.tenantId,tenantId)));result.push(line.lineId)}
  else {const [created]=await tx.insert(quotationLineItems).values({...values,tenantId,quotationId}).returning({id:quotationLineItems.id});result.push(created.id)}
 }
 return result
}
