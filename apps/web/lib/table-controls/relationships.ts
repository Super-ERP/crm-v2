import type {TableFieldDefinition,TableFieldType} from './types'
import {tableFieldOptions} from './fields'
export type BusinessField={id:string;column?:string;label:string;type:TableFieldType;dateOnly?:boolean}
const f=(id:string,type:TableFieldType='text',column=id.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),label=id.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase()),dateOnly=false):BusinessField=>({id,type,column,label,dateOnly})
const dates=[f('createdAt','date'),f('updatedAt','date')]
export const RELATION_ENTITIES={
 leads:{table:'leads',permission:'lead.view',fields:[f('name'),f('companyName'),f('email'),f('phone'),f('mobile'),f('country'),f('source'),f('status','enum'),f('disqualifyReason'),f('convertedAt','date'),...dates]},
 accounts:{table:'accounts',permission:'account.view',fields:[f('name'),f('code'),f('accountType','enum'),f('currency'),f('industry'),f('website'),f('phone'),f('registrationNumber'),f('isCustomer','boolean'),f('budgetingDate','date','budgeting_date','Budgeting date',true),...dates]},
 persons:{table:'persons',permission:'person.view',fields:[f('name','text','@personName'),f('firstName'),f('lastName'),f('title'),f('department'),f('email'),f('phone'),f('country'),f('isPrimary','boolean'),...dates]},
 opportunities:{table:'opportunities',permission:'opportunity.view',fields:[f('name'),f('code'),f('description'),f('currency'),f('pain'),f('power'),f('vision'),f('value'),f('control'),...dates]},
 funnel:{table:'funnels',permission:'opportunity.view',fields:[f('name'),f('status','enum'),f('stageName','text','@stageName','Stage'),f('estimatedAmount','money'),f('currency'),f('expectedCloseDate','date','expected_close_date','Expected close date',true),f('actualCloseDate','date','actual_close_date','Actual close date',true),f('description'),f('projectYear','number'),f('awardDate','date','award_date','Award date',true),f('purchaseOrderNumber'),f('isRenewal','boolean'),...dates]},
 quotations:{table:'quotations',permission:'quotation.view',fields:[f('quoteNumber'),f('status','enum'),f('isPrimary','boolean'),f('currency'),f('quoteDate','date','quote_date','Quotation date',true),f('validUntil','date','valid_until','Valid until',true),f('subtotal','money'),f('taxTotal','money'),f('total','money'),...dates]},
 products:{table:'products',permission:'product.view',fields:[f('name'),f('productCode'),f('subcategory'),f('description'),f('uom'),f('standardPrice','money'),f('currency'),f('isActive','boolean'),...dates]},
 projects:{table:'projects',permission:'project.view',module:'projects',fields:[f('name'),f('projectCode'),f('status','enum'),f('startDate','date','start_date','Start date',true),f('value','money'),f('currency'),f('notes'),...dates]},
 milestones:{table:'payment_milestones',permission:'payment_milestone.view',fields:[f('title'),f('description'),f('amount','money'),f('currency','text','@milestoneCurrency'),f('dueDate','date','due_date','Due date',true),f('status','enum'),...dates]},
 salesOrders:{table:'sales_orders',permission:'sales_order.view',module:'salesOrders',fields:[f('soNumber'),f('status','enum'),f('documentKind'),f('paymentTerm'),f('notes'),f('submittedAt','date'),f('reviewedAt','date'),...dates]},
 finance:{table:'finance_docs',permission:'finance.view',module:'finance',fields:[f('number'),f('kind','enum'),f('status','enum'),f('partyName'),f('amount','money'),f('currency'),f('docDate','date','doc_date','Document date',true),f('dueDate','date','due_date','Due date',true),f('notes'),...dates]},
 costs:{table:'deal_costs',permission:'opportunity.view',module:'finance',fields:[f('supplierName'),f('partyKind','enum'),f('category'),f('contractYear','number'),f('poNumber'),f('amount','money'),f('currency'),f('notes'),...dates]},
 contractYears:{table:'contract_years',permission:'opportunity.view',module:'finance',fields:[f('year','number'),f('title'),f('amount','money'),f('currency'),f('status','enum'),f('notes'),...dates]},
 opportunityProducts:{table:'opportunity_products',permission:'opportunity.view',fields:[f('description'),f('quantity','number'),f('unitPrice','money'),f('totalPrice','money'),f('currency','text','@funnelCurrency'),f('productCategory'),f('uom'),...dates]},
 quoteLines:{table:'quotation_line_items',permission:'quotation.view',fields:[f('description'),f('quantity','number'),f('unitPrice','money'),f('lineSubtotal','money'),f('lineTax','money'),f('lineTotal','money'),f('currency','text','@quoteCurrency'),f('uom'),...dates]},
 forecast:{table:'@forecast',permission:'forecast.view',module:'forecast',fields:[f('source','enum')]},
 projectCodes:{table:'@projectCodes',permission:'opportunity.view',fields:[f('code','text','@projectCode')]},
 members:{table:'@members',permission:'tenant.manage_users',fields:[f('name','text','@memberName'),f('email','text','@memberEmail')]},
 apiKeys:{table:'@apiKeys',permission:'tenant.settings',fields:[f('name'),f('keyPrefix'),f('createdAt','date'),f('expiresAt','date'),f('lastUsedAt','date'),f('revokedAt','date')]},
 taxRates:{table:'tax_settings',permission:'tax.view',fields:[f('name'),f('ratePercent','number'),f('isDefault','boolean'),f('isActive','boolean'),...dates]},
 audit:{table:'audit_log',permission:'audit.view',module:'audit',fields:[f('action'),f('entityType'),f('createdAt','date'),f('outcome','enum'),f('source')]},
 intercompany:{table:'intercompany_deals',permission:'intercompany.view',module:'finance',fields:[f('name'),f('accountName'),f('status','enum'),f('stageName'),f('currency'),f('estimatedAmount','money'),f('quotedAmount','money'),f('expectedCloseDate','date','expected_close_date','Expected close date',true),...dates]},
 stages:{table:'pipeline_stages',permission:'opportunity.view',fields:[f('name'),f('code'),f('kind','enum'),f('probability','number'),f('sortOrder','number')]},
} satisfies Record<string,{table:string;permission:string;module?:string;fields:BusinessField[]}>
export type RelationEntity=keyof typeof RELATION_ENTITIES
export type BusinessRelationship={key:string;label:string;source:RelationEntity;target:RelationEntity;cardinality:'one'|'many'|'many-to-many';foreignKey?:string;inverse?:boolean;bridge?:{table:string;source:string;target:string};derived?:'accountMilestones'|'opportunityMilestones'|'accountQuotes'|'accountOrders'|'opportunityQuotes'|'funnelMilestones'|'milestoneFunnel'|'personFunnels'|'personOpportunities'|'codeFunnels'|'funnelCodes'|'auditRecord'}
const edges:BusinessRelationship[]=[]
function pair(source:RelationEntity,target:RelationEntity,fk:string,key:string,label:string,inverseKey:string,inverseLabel:string){edges.push({source,target,foreignKey:fk,key,label,cardinality:'one'},{source:target,target:source,foreignKey:fk,inverse:true,key:inverseKey,label:inverseLabel,cardinality:'many'})}
pair('accounts','accounts','parent_account_id','parentAccount','Parent account','childAccounts','Child accounts')
pair('persons','accounts','account_id','account','Account','contacts','Contacts')
pair('opportunities','accounts','account_id','account','Account','opportunities','Opportunities')
pair('funnel','accounts','account_id','account','Account','funnels','Funnels')
pair('funnel','opportunities','opportunity_id','opportunity','Opportunity','funnels','Funnels')
pair('quotations','funnel','funnel_id','funnel','Funnel','quotations','Quotations')
pair('projects','accounts','account_id','account','Account','projects','Projects')
pair('projects','funnel','funnel_id','funnel','Funnel','projects','Projects')
pair('projects','quotations','quotation_id','quotation','Quotation','projects','Projects')
pair('milestones','projects','project_id','project','Delivery project','milestones','Milestones')
pair('milestones','quotations','quotation_id','quotation','Quotation','milestones','Milestones')
pair('salesOrders','projects','project_id','project','Project','salesOrders','Sales orders')
pair('finance','salesOrders','sales_order_id','salesOrder','Sales order','financeDocuments','Finance documents')
pair('finance','projects','project_id','project','Project','financeDocuments','Finance documents')
pair('finance','finance','parent_id','parentDocument','Parent document','childDocuments','Child documents')
pair('costs','funnel','funnel_id','funnel','Funnel','costs','Costs')
pair('contractYears','funnel','funnel_id','funnel','Funnel','contractYears','Contract years')
pair('opportunityProducts','funnel','funnel_id','funnel','Funnel','productLines','Product lines')
pair('opportunityProducts','products','product_id','product','Product','funnelLines','Funnel product lines')
pair('quoteLines','quotations','quotation_id','quotation','Quotation','lineItems','Line items')
pair('quoteLines','products','product_id','product','Product','quotationLines','Quotation lines')
pair('funnel','stages','current_stage_id','stage','Stage','funnels','Funnels')
pair('leads','accounts','converted_account_id','convertedAccount','Converted account','convertedLeads','Converted leads')
pair('leads','persons','converted_person_id','convertedContact','Converted contact','convertedLeads','Converted leads')
pair('forecast','funnel','funnel_id','funnel','Own funnel','forecastRows','Forecast rows')
pair('forecast','intercompany','intercompany_id','inboundDeal','Inbound deal','forecastRows','Forecast rows')
pair('accounts','members','owner_member_id','owner','Account owner','accounts','Owned accounts')
pair('leads','members','owner_member_id','owner','Owner','leads','Owned leads')
pair('opportunities','members','owner_member_id','owner','Owner','opportunities','Owned opportunities')
pair('funnel','members','owner_member_id','owner','Salesperson','funnels','Owned funnels')
pair('projects','members','owner_member_id','owner','Owner','projects','Owned projects')
pair('apiKeys','members','member_id','member','Acting member','apiKeys','API keys')
pair('audit','members','actor_member_id','actor','Acting member','auditEvents','Audit events')
pair('quoteLines','taxRates','tax_setting_id','taxRate','Tax rate','quotationLines','Quotation lines')
pair('projects','intercompany','intercompany_deal_id','intercompanyDeal','Intercompany deal','projects','Local projects')
pair('finance','intercompany','intercompany_deal_id','intercompanyDeal','Intercompany deal','financeDocuments','Local finance documents')
pair('intercompany','funnel','funnel_id','originFunnel','Origin funnel','intercompanyDeals','Intercompany deals')
function derived(source:RelationEntity,target:RelationEntity,key:string,label:string,kind:NonNullable<BusinessRelationship['derived']>,cardinality:BusinessRelationship['cardinality']='many'){edges.push({source,target,key,label,derived:kind,cardinality})}
derived('projectCodes','funnel','funnels','Funnels','codeFunnels','many-to-many')
derived('funnel','projectCodes','projectCodes','Project codes','funnelCodes','many-to-many')
for(const target of ['leads','accounts','persons','opportunities','funnel','quotations','products','projects','milestones','salesOrders','finance'] as const)derived('audit',target,target,`Referenced ${target}`,'auditRecord','one')
derived('accounts','milestones','milestones','Milestones','accountMilestones')
derived('opportunities','milestones','milestones','Milestones','opportunityMilestones')
derived('funnel','milestones','milestones','Milestones','funnelMilestones')
derived('milestones','funnel','funnel','Funnel','milestoneFunnel','one')
derived('accounts','quotations','quotations','Quotations','accountQuotes')
derived('opportunities','quotations','quotations','Quotations','opportunityQuotes')
derived('accounts','salesOrders','salesOrders','Sales orders','accountOrders')
derived('persons','funnel','funnels','Funnels','personFunnels')
derived('persons','opportunities','opportunities','Opportunities','personOpportunities')
for(const [source,target,key,label,table,from,to] of [
 ['products','quotations','quotations','Quotations','quotation_line_items','product_id','quotation_id'],
 ['quotations','products','products','Products','quotation_line_items','quotation_id','product_id'],
 ['products','funnel','funnels','Funnels','opportunity_products','product_id','funnel_id'],
 ['funnel','products','products','Products','opportunity_products','funnel_id','product_id'],
] as const)edges.push({source,target,key,label,cardinality:'many-to-many',bridge:{table,source:from,target:to}})
export const BUSINESS_RELATIONSHIPS:readonly BusinessRelationship[]=edges
const panels:Record<string,RelationEntity>={forecast:'forecast','project-codes':'projectCodes','team-members':'members','settings-api-keys':'apiKeys','settings-tax-rates':'taxRates',audit:'audit','intercompany-inbound':'intercompany',leads:'leads',accounts:'accounts',persons:'persons',opportunities:'opportunities',funnel:'funnel',quotations:'quotations',products:'products',projects:'projects','payment-milestones':'milestones','sales-orders':'salesOrders','finance-sale':'finance','finance-purchase':'finance','account-contacts':'persons','account-opportunities':'opportunities','account-pipelines':'funnel','account-projects':'projects','account-quotations':'quotations','account-children':'accounts','person-pipelines':'funnel','person-projects':'projects','opp-funnels':'funnel','opp-quotations':'quotations','opp-products':'opportunityProducts','funnel-contract':'contractYears','funnel-costs':'costs','funnel-quotes':'quotations','funnel-products':'products','funnel-projects':'projects','so-milestones':'milestones','so-finance-docs':'finance','product-usage':'quotations','product-deals':'opportunityProducts','project-code-funnels':'funnel','code-opportunities':'opportunities','code-quotations':'quotations','code-accounts':'accounts','code-contacts':'persons','code-projects':'projects','settings-funnel-stages':'stages'}
export function tableRelationEntity(key:string){return panels[key]}
export function relationshipsFor(entity:RelationEntity){return BUSINESS_RELATIONSHIPS.filter(r=>r.source===entity)}
export function businessFieldDefinitions(entity:RelationEntity):TableFieldDefinition[]{return RELATION_ENTITIES[entity].fields.map(field=>({id:field.id,label:field.label,type:field.type,operators:operators(field.type),sortable:true,defaultVisible:false,minWidth:48,defaultWidth:180,options:tableFieldOptions(entity==='milestones'?'payment-milestones':entity==='salesOrders'?'sales-orders':entity==='finance'?'finance-sale':entity,field.id)}))}
// Kept independent from registry.ts to avoid an import cycle.
function operators(type:TableFieldType):TableFieldDefinition['operators']{
 if(type==='collection')return ['some','none','every','empty','not-empty']
 if(type==='money'||type==='number')return ['equals','not-equals','greater-than','greater-or-equal','less-than','less-or-equal','between','empty','not-empty']
 if(type==='date')return ['on','before','after','between','year','relative','empty','not-empty']
 if(type==='boolean')return ['equals','empty','not-empty']
 if(type==='enum')return ['any-of','none-of','empty','not-empty']
 return ['contains','not-contains','equals','not-equals','any-of','none-of','empty','not-empty']
}
const relationshipMetadataCache=new Map<string,TableFieldDefinition[]>()
export function relationshipFields(entity:RelationEntity,depth=0):TableFieldDefinition[]{
 const key=`${entity}:${depth}`,cached=relationshipMetadataCache.get(key)
 if(cached)return cached
 const result=relationshipsFor(entity).flatMap(relation=>{
  const base=`related.${relation.key}`
  const field=(id:string,label:string,type:TableFieldType,extra:Partial<TableFieldDefinition>={}):TableFieldDefinition=>({id,label,type,operators:operators(type),sortable:true,defaultVisible:false,optional:true,minWidth:48,defaultWidth:200,...extra})
  const result=[field(base,relation.label,'collection',{filterOnly:true,sortable:false,relationship:{entity:relation.target,fields:[...businessFieldDefinitions(relation.target),...(depth<1?relationshipFields(relation.target,depth+1).filter(f=>f.type==='collection'):[])]}}),field(`${base}.count`,`${relation.label} → Count`,'number')]
  for(const target of RELATION_ENTITIES[relation.target].fields){
   if(relation.cardinality==='one')result.push(field(`${base}.${target.id}`,`${relation.label} → ${target.label}`,target.type,{options:businessFieldDefinitions(relation.target).find(field=>field.id===target.id)?.options}))
   else if(target.type==='date')for(const op of ['min','max'])result.push(field(`${base}.${target.id}.${op}`,`${relation.label} → ${op==='min'?'Earliest':'Latest'} ${target.label.toLowerCase()}`,'date'))
   else if(target.type==='money')result.push(field(`${base}.${target.id}.sum`,`${relation.label} → Total ${target.label.toLowerCase()}`,'money',{sortable:false}))
   else if(target.type==='number')for(const op of ['sum','min','max'])result.push(field(`${base}.${target.id}.${op}`,`${relation.label} → ${op} ${target.label.toLowerCase()}`,'number'))
   else result.push(field(`${base}.${target.id}.values`,`${relation.label} → ${target.label} values`,'relation',{sortable:false,options:target.type==='boolean'?[{value:'true',label:'Yes'},{value:'false',label:'No'}]:businessFieldDefinitions(relation.target).find(field=>field.id===target.id)?.options}))
  }
  return result
 })
 relationshipMetadataCache.set(key,result)
 return result
}
export function tableRelationshipFields(key:string){const entity=tableRelationEntity(key);return entity?relationshipFields(entity):[]}
export function relationRecordId(key:string,row:unknown):string|undefined{const data=row as Record<string,unknown>;const value=key==='forecast'?`${data.source}:${data.funnelId}`:key==='product-usage'?data.quotationId:key==='funnel-products'?data.productId:key==='team-members'?data.memberId:key==='project-codes'?data.code:data.id;return typeof value==='string'?value:undefined}

export function relatedProjectionFields(fields:readonly TableFieldDefinition[],visibility:Record<string,boolean>,tree:import('./types').FilterGroup,sorting:readonly {id:string}[]){
 const needed=new Set(fields.filter(field=>field.id.startsWith('related.')&&!field.filterOnly&&(visibility[field.id]??field.defaultVisible)).map(field=>field.id))
 const visit=(node:import('./types').FilterNode)=>{if(node.kind==='group')node.children.forEach(visit);else if(node.fieldId.startsWith('related.')&&fields.find(f=>f.id===node.fieldId)?.type!=='collection')needed.add(node.fieldId)}
 visit(tree);sorting.filter(s=>s.id.startsWith('related.')).forEach(s=>needed.add(s.id))
 return [...needed].sort()
}
