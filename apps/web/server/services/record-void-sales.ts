import "server-only"
import { sql } from "drizzle-orm"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import type { VoidTarget,VoidBlocker } from "@/lib/record-void"
import { voidEntityCatalog,loadVoidRecord } from './record-void-registry'
import { recomputeOpportunityTotal } from './opportunity-container'
import { reassignPrimaryAfterRemoval } from './quotation-primary'

/** Only ownership edges block upstream void. Shared master references are not cascaded. */
export async function getSalesVoidImpact(tx:Tx,ctx:ServerContext,target:VoidTarget):Promise<{blockers:VoidBlocker[];effects:string[]}> {
 const {data,record}=await loadVoidRecord(tx,ctx,target,'review')
 const blockers:VoidBlocker[]=[]
 const effects=['The record leaves active lists and totals. Its number, amounts, attachments and history remain stored.']
 async function references(label:string,query:ReturnType<typeof sql>) {
  const [row]=await tx.execute<{n:number}>(sql`select count(*)::int as n from (${query}) dependency`)
  if(row.n)blockers.push({code:'live_dependency',message:`Resolve ${row.n} linked ${label} first.`})
 }
 const tenant=ctx.tenantId,id=target.id
 switch(target.type) {
 case 'opportunity':
  await references('funnels',sql`select id from funnels where tenant_id=${tenant} and opportunity_id=${id} and deleted_at is null`)
  effects.push('No child funnel is silently closed or transferred.');break
 case 'funnel':
  await references('quotations',sql`select id from quotations where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null and status<>'void'`)
  await references('projects',sql`select id from projects where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null`)
  await references('payment milestones',sql`select id from payment_milestones where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null`)
  await references('contracts',sql`select id from contracts where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null`)
  await references('contract years',sql`select id from contract_years where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null and status<>'cancelled'`)
  await references('purchase costs',sql`select id from deal_costs where tenant_id=${tenant} and funnel_id=${id} and deleted_at is null`)
  await references('intercompany relationships requiring reconciliation',sql`select id from intercompany_deal_parties where funnel_id=${id} union all select id from intercompany_deals where funnel_id=${id}`)
  effects.push('Parent Opportunity totals are recalculated; pending stage approvals are cancelled. Original stage and Won/Lost history remain.');break
 case 'quotation':
  await references('projects',sql`select id from projects where tenant_id=${tenant} and quotation_id=${id} and deleted_at is null`)
  await references('payment milestones',sql`select id from payment_milestones where tenant_id=${tenant} and quotation_id=${id} and deleted_at is null`)
  const [parent]=await tx.execute<{primary:string|null}>(sql`select primary_quotation_id as primary from funnels where tenant_id=${tenant} and id=${data.funnel_id}`)
  if(parent?.primary===id) {
   const [next]=await tx.execute<{number:string;net:string;currency:string}>(sql`select quote_number as number,(subtotal-discount_total)::text as net,currency from quotations where tenant_id=${tenant} and funnel_id=${data.funnel_id} and id<>${id} and deleted_at is null and status not in ('rejected','expired','void') order by created_at desc,id desc limit 1`)
   effects.push(next?`Primary becomes ${next.number}; the quoted funnel value becomes ${next.net} ${next.currency} before tax.`:'No eligible quote remains: the primary link, quoted amount and derived products are cleared. The independent funnel estimate is retained.')
  }else effects.push('This is not the primary quotation; the selected primary and its quoted value stay unchanged.')
  effects.push('Historical quotation amounts remain unchanged.');break
 case 'project':
  await references('Sales Orders',sql`select id from sales_orders where tenant_id=${tenant} and project_id=${id} and status not in ('void','rejected')`)
  await references('payment milestones',sql`select id from payment_milestones where tenant_id=${tenant} and project_id=${id} and deleted_at is null`)
  await references('finance documents',sql`select id from finance_docs where tenant_id=${tenant} and project_id=${id} and status<>'cancelled'`)
  if(data.intercompany_deal_id)blockers.push({code:'intercompany',message:'Reconcile the intercompany project before voiding it.'})
  effects.push('The project leaves delivery totals; its source quotation and funnel stay unchanged.');break
 case 'payment_milestone':
  await references('finance documents',sql`select id from finance_docs where tenant_id=${tenant} and milestone_id=${id} and status<>'cancelled'`)
  if(data.status==='invoiced'||data.invoice_number||data.invoice_date||data.so_number) {
    if(!ctx.can('finance.reverse'))blockers.push({code:'financial_review',message:'An authorised financial reviewer must reconcile the invoice history before voiding this milestone.'})
    effects.push('Invoice history is retained as a snapshot. This corrects the schedule only; it does not cancel an external invoice or refund money.')
  }
  effects.push(`Release ${data.amount} ${record.currency??''} from active project or quotation allocation; retain the original schedule amount.`);break
 case 'contract_year':
  if(data.status==='invoiced'&&!ctx.can('finance.reverse'))blockers.push({code:'financial_review',message:'An authorised financial reviewer must reconcile this invoiced contract year.'})
  effects.push(`Remove ${data.amount} ${data.currency??''} from active contract-year totals; preserve the historical amount.`);break
 case 'deal_cost':
  if(data.po_number&&!ctx.can('finance.reverse'))blockers.push({code:'financial_review',message:'An authorised financial reviewer must reconcile this purchase-order cost.'})
  effects.push(`Remove ${data.amount} ${data.currency??''} from active costs and its stored base cost from margin calculations. No supplier document is cancelled implicitly.`);break
 case 'contract':
  if(data.funnel_id)await references('contract years on the funnel',sql`select id from contract_years where tenant_id=${tenant} and funnel_id=${data.funnel_id} and deleted_at is null and status<>'cancelled'`)
  effects.push('The contract is archived; signatures and original terms remain stored.');break
 case 'account':
  await references('child accounts',sql`select id from accounts where tenant_id=${tenant} and (parent_account_id=${id} or end_user_account_id=${id}) and deleted_at is null`)
  for(const table of ['persons','opportunities','funnels','projects','contracts'])await references(table,sql`select id from ${sql.identifier(table)} where tenant_id=${tenant} and account_id=${id} and deleted_at is null`)
  await references('Bill To quotations',sql`select id from quotations where tenant_id=${tenant} and bill_to_account_id=${id} and deleted_at is null and status<>'void'`)
  effects.push('Shared customer/reseller records are archived only after active references are resolved.');break
 case 'person':
  await references('Attention quotations',sql`select id from quotations where tenant_id=${tenant} and attention_contact_id=${id} and deleted_at is null and status<>'void'`)
  await references('funnel contacts',sql`select id from funnels where tenant_id=${tenant} and deleted_at is null and primary_person_id=${id}`)
  await references('opportunity contacts',sql`select id from opportunities where tenant_id=${tenant} and deleted_at is null and (primary_person_id=${id} or owner_contact_id=${id} or power_sponsor_contact_id=${id})`)
  if(data.is_primary)blockers.push({code:'primary_contact',message:'Choose another primary contact before archiving this contact.'});break
 case 'product':
  await references('quotation lines on live quotations',sql`select l.id from quotation_line_items l join quotations q on q.id=l.quotation_id and q.tenant_id=l.tenant_id where l.tenant_id=${tenant} and l.product_id=${id} and q.deleted_at is null and q.status<>'void'`)
  await references('active funnel products',sql`select p.id from opportunity_products p join funnels f on f.id=p.funnel_id and f.tenant_id=p.tenant_id where p.tenant_id=${tenant} and p.product_id=${id} and f.deleted_at is null`);break
 case 'lead':
  if(data.converted_account_id)await references('converted accounts',sql`select id from accounts where tenant_id=${tenant} and id=${data.converted_account_id} and deleted_at is null`)
  if(data.converted_person_id)await references('converted contacts',sql`select id from persons where tenant_id=${tenant} and id=${data.converted_person_id} and deleted_at is null`)
  if(data.converted_opportunity_id)await references('converted deals',sql`select id from funnels where tenant_id=${tenant} and id=${data.converted_opportunity_id} and deleted_at is null union all select id from opportunities where tenant_id=${tenant} and id=${data.converted_opportunity_id} and deleted_at is null`)
  break
 default:throw new Error('Unsupported sales void target')
 }
 return {blockers,effects}
}

export async function executeSalesVoid(tx:Tx,ctx:ServerContext,target:VoidTarget,reason:string) {
 const {data}=await loadVoidRecord(tx,ctx,target,'review')
 const impact=await getSalesVoidImpact(tx,ctx,target)
 if(impact.blockers.length)throw new Error(impact.blockers.map(row=>row.message).join(' '))
 const table=voidEntityCatalog[target.type].table
 if(target.type==='quotation') {
  await tx.execute(sql`update quotations set status='void',is_primary=false,deleted_at=now(),updated_at=now() where tenant_id=${ctx.tenantId} and id=${target.id}`)
  await reassignPrimaryAfterRemoval(tx,ctx,String(data.funnel_id),target.id)
 } else {
  await tx.execute(sql`update ${sql.identifier(table)} set deleted_at=now(),updated_at=now() where tenant_id=${ctx.tenantId} and id=${target.id}`)
 }
 if(target.type==='funnel') {
  await tx.execute(sql`update funnel_void_requests set status='cancelled',decision_note=${`Superseded by completed record void: ${reason}`},decided_at=now() where tenant_id=${ctx.tenantId} and funnel_id=${target.id} and status='pending'`)
  await tx.execute(sql`update stage_approval_requests set status='cancelled',decision_note=${`Funnel voided: ${reason}`},decided_at=now(),updated_at=now() where tenant_id=${ctx.tenantId} and funnel_id=${target.id} and status='pending'`)
  await recomputeOpportunityTotal(tx,ctx.tenantId,String(data.opportunity_id))
 }
 if(target.type==='lead')await tx.execute(sql`update lead_conversion_approval_requests set status='cancelled',decision_note=${`Lead voided: ${reason}`},decided_at=now() where tenant_id=${ctx.tenantId} and lead_id=${target.id} and status='pending'`)
}
