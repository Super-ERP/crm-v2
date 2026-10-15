import { z } from 'zod'
import type { ApprovalRow } from '@/app/(app)/approvals/actions'
import type { QuotationApprovalRow } from '@/app/(app)/approvals/quotation-actions'
import type { LeadConversionApprovalRow } from '@/app/(app)/approvals/lead-conversion-actions'

export const APPROVAL_KINDS = ['lead','quotation','stage'] as const
export type ApprovalKind = typeof APPROVAL_KINDS[number]
export type ApprovalOrder = 'oldest'|'newest'
export type QueuePosition = { kind:ApprovalKind; id:string; queueSortKey:string }
const positionSchema=z.object({kind:z.enum(APPROVAL_KINDS),id:z.string().uuid(),queueSortKey:z.string().regex(/^-?\d{1,20}$/)}).strict()
export type ApprovalQueueRead = { order:ApprovalOrder; search?:string; cursor?:QueuePosition|null }
export type ApprovalQueueMeta = { queueSortKey?:string }
export type ApprovalQueueItem = QueuePosition & (
 {kind:'stage';row:ApprovalRow}|{kind:'quotation';row:QuotationApprovalRow}|{kind:'lead';row:LeadConversionApprovalRow}
)
export type ApprovalQueuePage = { items:ApprovalQueueItem[]; counts:Record<ApprovalKind,number>; hasNextPage:boolean; nextCursor:string|null; asOf?:string }
export const approvalQueueInputSchema=z.object({tab:z.enum(['incoming','mine']).default('incoming'),type:z.enum(['all',...APPROVAL_KINDS]).default('all'),order:z.enum(['oldest','newest']).default('oldest'),search:z.string().trim().max(200).default(''),cursor:z.string().max(512).nullable().optional()}).strict()
export type ApprovalQueueInput=z.input<typeof approvalQueueInputSchema>
export function encodeApprovalCursor(row:QueuePosition):string {
 return btoa(JSON.stringify({kind:row.kind,id:row.id,queueSortKey:row.queueSortKey}))
}
export function decodeApprovalCursor(value:string):QueuePosition {
 if(value.length>512)throw new Error('Invalid approval cursor')
 try{return positionSchema.parse(JSON.parse(atob(value)))}catch{throw new Error('Invalid approval cursor')}
}
export function validateApprovalQueueRead(input:ApprovalQueueRead):ApprovalQueueRead {
 return {order:z.enum(['oldest','newest']).parse(input.order),search:z.string().trim().max(200).parse(input.search??''),cursor:input.cursor?positionSchema.parse(input.cursor):null}
}
export function mergeApprovalQueue<T extends QueuePosition>(rows:T[],order:ApprovalOrder):T[] {
 return [...rows].sort((a,b)=>{
  const ta=BigInt(a.queueSortKey),tb=BigInt(b.queueSortKey)
  const n=ta<tb?-1:ta>tb?1:a.id<b.id?-1:a.id>b.id?1:a.kind<b.kind?-1:a.kind>b.kind?1:0
  return order==='oldest'?n:-n
 })
}
export const APPROVAL_TYPE_LABELS:Record<ApprovalKind,string>={lead:'Lead conversion',quotation:'Quotation',stage:'Funnel stage'}
export function approvalItemTitle(item:ApprovalQueueItem):string {
 return item.kind==='quotation'?item.row.quoteNumber:item.kind==='lead'?item.row.leadName:item.row.opportunityName
}
