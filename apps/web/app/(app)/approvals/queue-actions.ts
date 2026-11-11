"use server"

import { listFunnelVoidApprovals } from './void-actions'
import { listIncomingApprovals,listMyApprovals } from './actions'
import { listQuotationApprovals } from './quotation-actions'
import { listLeadConversionApprovals } from './lead-conversion-actions'
import { APPROVAL_PAGE_SIZE } from '@/lib/approval-pagination'
import { approvalQueueInputSchema,decodeApprovalCursor,encodeApprovalCursor,mergeApprovalQueue,type ApprovalQueueInput,type ApprovalQueuePage,type ApprovalQueueItem } from '@/lib/approval-queue'

export async function listApprovalQueue(input:ApprovalQueueInput={}):Promise<ApprovalQueuePage> {
 const q=approvalQueueInputSchema.parse(input)
 const options={order:q.order,search:q.search,cursor:q.cursor?decodeApprovalCursor(q.cursor):null}
 const empty={rows:[],total:0}
 const [stages,quotations,leads,voids]=await Promise.all([
  q.type==='all'||q.type==='stage'?(q.tab==='incoming'?listIncomingApprovals(0,options):listMyApprovals(0,options)):empty,
  q.type==='all'||q.type==='quotation'?listQuotationApprovals(q.tab,0,options):empty,
  q.type==='all'||q.type==='lead'?listLeadConversionApprovals(q.tab,0,undefined,options):empty,
  q.type==='all'||q.type==='void'?listFunnelVoidApprovals(q.tab,options):empty,
 ])
 const items:ApprovalQueueItem[]=[]
 for(const row of stages.rows){if(!row.queueSortKey)throw new Error('Missing approval queue position');items.push({kind:'stage',id:row.id,queueSortKey:row.queueSortKey,row})}
 for(const row of quotations.rows){if(!row.queueSortKey)throw new Error('Missing approval queue position');items.push({kind:'quotation',id:row.id,queueSortKey:row.queueSortKey,row})}
 for(const row of leads.rows){if(!row.queueSortKey)throw new Error('Missing approval queue position');items.push({kind:'lead',id:row.id,queueSortKey:row.queueSortKey,row})}
 for(const row of voids.rows){if(!row.queueSortKey)throw new Error('Missing approval queue position');items.push({kind:'void',id:row.id,queueSortKey:row.queueSortKey,row})}
 const sorted=mergeApprovalQueue(items,q.order),page=sorted.slice(0,APPROVAL_PAGE_SIZE)
 return {asOf:new Date().toISOString(),items:page,counts:{void:voids.total??0,stage:stages.total??0,quotation:quotations.total??0,lead:leads.total??0},hasNextPage:sorted.length>APPROVAL_PAGE_SIZE,nextCursor:sorted.length>APPROVAL_PAGE_SIZE?encodeApprovalCursor(page[page.length-1]):null}
}
