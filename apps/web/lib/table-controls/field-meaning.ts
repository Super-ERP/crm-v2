/** Business descriptions shared by Columns, filters, headers and CSV labels.
 * IDs remain stable so existing saved layouts continue to work. */
export type FieldMeaning = { label: string; description: string }
const estimate: FieldMeaning = {label:'Estimated deal value (excl. tax)',description:'Manual Funnel estimate in its own currency, excluding tax. A missing estimate is not a zero or a quotation total.'}
const quoteTotal: FieldMeaning = {label:'Total (incl. tax)',description:'Quotation total after line and header discounts, including tax, in the quotation currency.'}
const childTotal: FieldMeaning = {label:'Child estimate total (excl. tax)',description:'Manual estimates of non-deleted child Funnels, grouped by currency. Includes all child stages; this is not a current-filter or invoiced total.'}
const documentTotal: FieldMeaning = {label:'Document total (as recorded)',description:'The amount recorded on the finance document in its own currency. Historical tax components are not separately recorded; this is not a net Project value.'}
const planned: FieldMeaning = {label:'Planned amount (excl. tax)',description:'Scheduled payment milestone amount in its linked quotation, Funnel or Project currency. Planning status does not prove invoice creation or cash received.'}
const meanings: Record<string, Record<string, FieldMeaning>> = {
  funnel:{
    id:{label:'Funnel / deal name',description:'The commercial deal, within a parent Opportunity and configured sales pipeline.'},
    accountId:{label:'End customer',description:'The customer Account for this deal. A quotation can have a different Bill To account.'},
    opportunityId:{label:'Parent Opportunity',description:'The parent pursuit/container. Its generated number is distinct from the Funnel name and project code.'},
    amount:{label:'Deal value (excl. tax)',description:'Manual estimate when set; otherwise the primary quotation net amount after header discount, excluding tax. No currency conversion is applied.'},
  },
  opportunities:{totalEstimatedFunnelAmount:childTotal,name:{label:'Opportunity number / name',description:'The parent pursuit/container identifier; child Funnels contain individual deal descriptions.'}},
  'account-opportunities':{totalEstimatedFunnelAmount:childTotal},
  'account-pipelines':{amount:estimate},'person-pipelines':{amount:estimate},'opp-funnels':{estimatedAmount:estimate},
  'project-codes':{totalEstimatedFunnelAmount:{...estimate,label:'Linked estimate total (excl. tax)',description:'Manual estimates of accessible active linked Funnels, grouped by currency. Not invoiced or received money.'}},
  'project-code-funnels':{estimatedAmount:estimate},
  'payment-milestones':{amount:planned},'so-milestones':{amount:planned},
  'finance-sale':{amount:documentTotal},'finance-purchase':{amount:documentTotal},'so-finance-docs':{amount:documentTotal},
  quotations:{total:quoteTotal,subtotal:{label:'Subtotal (excl. tax)',description:'Sum of net line amounts before header discount and tax.'},taxTotal:{label:'Tax',description:'Quotation tax on the net amount after header discount.'}},
  'account-quotations':{total:quoteTotal},'opp-quotations':{total:quoteTotal},'funnel-quotes':{total:quoteTotal},'product-usage':{total:quoteTotal},
  forecast:{
    opportunityName:{label:'Funnel / deal name',description:'Source Funnel for own records; inbound rows refer to the linked intercompany allocation.'},
    opportunityValue:{label:'Estimated deal value / allocated basis',description:'Own rows use the manual estimate (missing = zero). Inbound rows use our allocated share of quoted net, falling back to estimate.'},
    weightedValue:{label:'Probability-weighted value',description:'The row basis multiplied by its stage probability. Amounts remain separated by currency.'},
    recognizedWeightedValue:{label:'Our weighted share',description:'Our commercial share of the probability-weighted value. Not accounting revenue recognition, an invoice or a receipt.'},
  },
  'intercompany-inbound':{dealValue:{label:'Deal basis (excl. tax)',description:'Origin quotation net amount, falling back to its estimate; no implicit currency conversion.'},yourShare:{label:'Our allocated share (excl. tax)',description:'Our commercial allocation of the origin deal, not realized invoiced or received revenue.'}},
  projects:{value:{label:'Project value (excl. tax)',description:'Current net Project value, excluding tax. Distinct from finance document totals and receipts.'}},
}
export function tableFieldMeaning(listKey:string,fieldId:string):FieldMeaning|undefined{return meanings[listKey]?.[fieldId]}
