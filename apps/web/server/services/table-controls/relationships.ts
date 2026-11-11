import 'server-only'
import {sql,type SQL,type SQLWrapper} from 'drizzle-orm'
import type {Tx} from '@/db'
import type {ServerContext} from '@/lib/server-context'
import {visibleMemberIds} from '@/lib/access-scope'
import {getEntitledModuleMap} from '@/lib/modules.server'
import {RELATION_ENTITIES,relationshipsFor,relationshipFields,businessFieldDefinitions,tableRelationEntity,type RelationEntity,type BusinessField,type BusinessRelationship} from '@/lib/table-controls/relationships'
import type {FilterGroup,FilterNode} from '@/lib/table-controls/types'
import {tableAccessRule} from './access'
import {activeProjectCodeFunnel} from '../project-code-visibility'
import {compileFilterTree,type SqlFieldRegistry} from './compile'
export type RelationshipScope={ctx:ServerContext;visible:string[]|null;modules:Record<string,boolean>}
export async function relationshipScope(tx:Tx,ctx:ServerContext):Promise<RelationshipScope>{return {ctx,visible:await visibleMemberIds(tx,ctx),modules:await getEntitledModuleMap()}}
const ref=(alias:string,column:string)=>sql`${sql.identifier(alias)}.${sql.identifier(column)}`
export const relationshipSource=(entity:RelationEntity,alias:string):SQL=>{
 if(entity==='forecast')return sql`(
  select 'own:'||ff.id::text as id,ff.tenant_id,ff.id as funnel_id,null::uuid as intercompany_id,'own'::text as source
   from funnels ff join pipeline_stages fs on fs.id=ff.current_stage_id and fs.tenant_id=ff.tenant_id
   where ff.deleted_at is null and fs.include_in_forecast=true and fs.kind in ('OPEN','WON')
  union all
  select 'inbound:'||ic.id::text as id,ic.partner_tenant_id as tenant_id,null::uuid as funnel_id,ic.id as intercompany_id,'inbound'::text as source
   from intercompany_deals ic where ic.include_in_forecast=true and round(case when ic.share_type='amount' then greatest(ic.share_value,0) else greatest(coalesce(ic.quoted_amount,ic.estimated_amount,0)*ic.share_value/100,0) end,2)>0
 ) ${sql.identifier(alias)}`
 if(entity==='members')return sql`(select member.*,member.organization_id as tenant_id from member) ${sql.identifier(alias)}`
 if(entity==='apiKeys')return sql`(select api_keys.*,api_keys.organization_id as tenant_id from api_keys) ${sql.identifier(alias)}`
 if(entity==='projectCodes')return sql`(select distinct pc_value.id,pc_f.tenant_id from funnels pc_f join opportunities pc_o on pc_o.id=pc_f.opportunity_id and pc_o.tenant_id=pc_f.tenant_id cross join lateral unnest(array[pc_f.project_code,pc_f.cross_deal_project_code,pc_o.project_code]) pc_value(id) where nullif(trim(pc_value.id),'') is not null) ${sql.identifier(alias)}`
 return sql`${sql.identifier(RELATION_ENTITIES[entity].table)} ${sql.identifier(alias)}`
}
function owner(expression:SQL,scope:RelationshipScope){return scope.visible===null?sql`true`:scope.visible.length?sql`${expression} in (${sql.join(scope.visible.map(id=>sql`${id}`),sql`, `)})`:sql`false`}
function lookup(entity:RelationEntity,id:SQL,column:string,scope:RelationshipScope,alias='rl_lookup'):SQL{return sql`(select ${ref(alias,column)} from ${relationshipSource(entity,alias)} where ${ref(alias,'id')}=${id} and ${entity==='intercompany'?sql`(${ref(alias,'tenant_id')}=${scope.ctx.tenantId} or ${ref(alias,'partner_tenant_id')}=${scope.ctx.tenantId})`:sql`${ref(alias,'tenant_id')}=${scope.ctx.tenantId}`})`}
export function milestoneFunnel(alias:string,scope:RelationshipScope):SQL{return sql`coalesce(${ref(alias,'funnel_id')},${lookup('projects',ref(alias,'project_id'),'funnel_id',scope,'rl_mproject')})`}
/** Target access is independent from the parent record. Foreign keys never grant access. */
export function relatedEntityScope(entity:RelationEntity,alias:string,scope:RelationshipScope):SQL{
 const config=RELATION_ENTITIES[entity]
 if(!scope.ctx.can(config.permission)||('module' in config&&!scope.modules[config.module]))return sql`false`
 const tenant=sql`${ref(alias,'tenant_id')}=${scope.ctx.tenantId}`
 let access:SQL=sql`true`
 if(['leads','opportunities','funnel','projects'].includes(entity))access=sql`${ref(alias,'deleted_at')} is null and ${owner(ref(alias,'owner_member_id'),scope)}`
 if(entity==='accounts')access=sql`${ref(alias,'deleted_at')} is null and (${ref(alias,'account_type')}='reseller' or ${owner(ref(alias,'owner_member_id'),scope)})`
 if(entity==='forecast')access=sql`((${ref(alias,'source')}='own' and exists(select 1 from funnels rl_own_forecast where rl_own_forecast.id=${ref(alias,'funnel_id')} and rl_own_forecast.tenant_id=${scope.ctx.tenantId} and ${scope.ctx.can('records.manage_all')?sql`true`:owner(sql`rl_own_forecast.owner_member_id`,scope)})) or (${ref(alias,'source')}='inbound' and ${scope.modules.finance&&scope.ctx.can('intercompany.view')}))`
 if(entity==='projectCodes')access=sql`exists(select 1 from funnels rl_codef join opportunities rl_codeo on rl_codeo.id=rl_codef.opportunity_id and rl_codeo.tenant_id=rl_codef.tenant_id where rl_codef.tenant_id=${scope.ctx.tenantId} and rl_codeo.deleted_at is null and ${owner(sql`rl_codef.owner_member_id`,scope)} and ${codeActive('rl_codef')} and (rl_codef.project_code=${ref(alias,'id')} or rl_codef.cross_deal_project_code=${ref(alias,'id')} or (rl_codeo.project_code=${ref(alias,'id')} and ${owner(sql`rl_codeo.owner_member_id`,scope)})))`
 if(entity==='intercompany')return sql`(${ref(alias,'partner_tenant_id')}=${scope.ctx.tenantId} or (${tenant} and exists(select 1 from funnels rl_icf where rl_icf.id=${ref(alias,'funnel_id')} and rl_icf.tenant_id=${scope.ctx.tenantId} and ${owner(sql`rl_icf.owner_member_id`,scope)})))`
 if(entity==='persons')access=sql`${ref(alias,'deleted_at')} is null and exists(select 1 from accounts rl_pa where rl_pa.id=${ref(alias,'account_id')} and rl_pa.tenant_id=${scope.ctx.tenantId} and rl_pa.deleted_at is null and (rl_pa.account_type='reseller' or ${owner(sql`rl_pa.owner_member_id`,scope)}))`
 if(entity==='funnel')access=sql`${access} and exists(select 1 from opportunities rl_fo where rl_fo.id=${ref(alias,'opportunity_id')} and rl_fo.tenant_id=${scope.ctx.tenantId} and rl_fo.deleted_at is null)`
 if(entity==='quotations')access=sql`${ref(alias,'deleted_at')} is null and exists(select 1 from funnels rl_qf where rl_qf.id=${ref(alias,'funnel_id')} and rl_qf.tenant_id=${scope.ctx.tenantId} and ${owner(sql`rl_qf.owner_member_id`,scope)})`
 if(entity==='products')access=sql`${ref(alias,'deleted_at')} is null`
 if(entity==='salesOrders')access=sql`exists(select 1 from projects rl_sp where rl_sp.id=${ref(alias,'project_id')} and rl_sp.tenant_id=${scope.ctx.tenantId} and rl_sp.deleted_at is null and ${owner(sql`rl_sp.owner_member_id`,scope)})`
 if(['costs','contractYears','opportunityProducts'].includes(entity))access=sql`exists(select 1 from funnels rl_cf where rl_cf.id=${ref(alias,'funnel_id')} and rl_cf.tenant_id=${scope.ctx.tenantId} and rl_cf.deleted_at is null and ${owner(sql`rl_cf.owner_member_id`,scope)})`
 if(entity==='quoteLines')access=sql`exists(select 1 from quotations rl_lq join funnels rl_lf on rl_lf.id=rl_lq.funnel_id and rl_lf.tenant_id=rl_lq.tenant_id where rl_lq.id=${ref(alias,'quotation_id')} and rl_lq.tenant_id=${scope.ctx.tenantId} and rl_lq.deleted_at is null and ${owner(sql`rl_lf.owner_member_id`,scope)})`
 if(entity==='milestones')access=sql`(
  exists(select 1 from funnels rl_mf join pipeline_stages rl_ms on rl_ms.id=rl_mf.current_stage_id and rl_ms.tenant_id=rl_mf.tenant_id
   where rl_mf.id=${milestoneFunnel(alias,scope)} and rl_mf.tenant_id=${scope.ctx.tenantId} and ${owner(sql`rl_mf.owner_member_id`,scope)}
   and (${ref(alias,'status')}='invoiced' or (rl_mf.deleted_at is null and rl_mf.status in ('open','won') and (rl_ms.kind='WON' or (rl_ms.kind='OPEN' and rl_ms.code='4a')) and exists(select 1 from quotations rl_mq where rl_mq.funnel_id=rl_mf.id and rl_mq.tenant_id=rl_mf.tenant_id and rl_mq.status='accepted' and rl_mq.deleted_at is null))))
  or (${ref(alias,'funnel_id')} is null and ${ref(alias,'status')}='invoiced' and exists(select 1 from projects rl_mp where rl_mp.id=${ref(alias,'project_id')} and rl_mp.tenant_id=${scope.ctx.tenantId} and rl_mp.funnel_id is null and ${owner(sql`rl_mp.owner_member_id`,scope)})))`
 return sql`${tenant} and (${access})${['milestones','costs','contractYears'].includes(entity)?sql` and ${ref(alias,'deleted_at')} is null`:sql``}`
}
function scalar(entity:RelationEntity,alias:string,field:BusinessField,scope:RelationshipScope):SQL{
 if(field.column==='@projectCode')return ref(alias,'id')
 if(field.column==='@memberName'||field.column==='@memberEmail')return sql`(select ${ref('rl_user',field.column==='@memberName'?'name':'email')} from "user" rl_user where rl_user.id=${ref(alias,'user_id')})`
 if(field.column==='@personName')return sql`concat_ws(' ',${ref(alias,'first_name')},${ref(alias,'last_name')})`
 if(field.column==='@stageName')return lookup('stages',ref(alias,'current_stage_id'),'name',scope,'rl_stage')
 if(field.column==='@milestoneCurrency')return sql`coalesce(${lookup('quotations',ref(alias,'quotation_id'),'currency',scope,'rl_currencyq')},${lookup('funnel',milestoneFunnel(alias,scope),'currency',scope,'rl_currencyf')},${lookup('projects',ref(alias,'project_id'),'currency',scope,'rl_currencyp')})`
 if(field.column==='@funnelCurrency')return lookup('funnel',ref(alias,'funnel_id'),'currency',scope,'rl_linef')
 if(field.column==='@quoteCurrency')return lookup('quotations',ref(alias,'quotation_id'),'currency',scope,'rl_lineq')
 return ref(alias,field.column!)
}
function codeActive(alias:string){return activeProjectCodeFunnel({status:ref(alias,'status'),deletedAt:ref(alias,'deleted_at'),currentStageId:ref(alias,'current_stage_id'),tenantId:ref(alias,'tenant_id'),pipelineId:ref(alias,'pipeline_id')})}
function connection(relation:BusinessRelationship,rootId:SQL,alias:string,scope:RelationshipScope):SQL{
 if(relation.bridge){const bridge=relation.bridge;return sql`exists(select 1 from ${sql.identifier(bridge.table)} rl_bridge where rl_bridge.tenant_id=${scope.ctx.tenantId} and ${ref('rl_bridge',bridge.source)}=${rootId} and ${ref('rl_bridge',bridge.target)}=${ref(alias,'id')})`}
 if(relation.foreignKey)return relation.inverse?sql`${ref(alias,relation.foreignKey)}=${rootId}`:sql`${ref(alias,'id')}=${lookup(relation.source,rootId,relation.foreignKey,scope,'rl_source')}`
 const relatedFunnels=(column:string)=>sql`select rl_connected.id from funnels rl_connected where rl_connected.tenant_id=${scope.ctx.tenantId} and ${ref('rl_connected',column)}=${rootId}`
 switch(relation.derived){
  case 'codeFunnels':return sql`${codeActive(alias)} and (${ref(alias,'project_code')}=${rootId} or ${ref(alias,'cross_deal_project_code')}=${rootId} or exists(select 1 from opportunities rl_crmo where rl_crmo.id=${ref(alias,'opportunity_id')} and rl_crmo.tenant_id=${scope.ctx.tenantId} and rl_crmo.project_code=${rootId} and ${owner(sql`rl_crmo.owner_member_id`,scope)}))`
  case 'funnelCodes':return sql`exists(select 1 from funnels rl_code_source left join opportunities rl_code_opp on rl_code_opp.id=rl_code_source.opportunity_id and rl_code_opp.tenant_id=rl_code_source.tenant_id where rl_code_source.id=${rootId} and rl_code_source.tenant_id=${scope.ctx.tenantId} and ${codeActive('rl_code_source')} and (rl_code_source.project_code=${ref(alias,'id')} or rl_code_source.cross_deal_project_code=${ref(alias,'id')} or (rl_code_opp.project_code=${ref(alias,'id')} and ${owner(sql`rl_code_opp.owner_member_id`,scope)})))`
  case 'auditRecord':{
   const names:Partial<Record<RelationEntity,string[]>>={leads:['lead'],accounts:['account'],persons:['person','contact'],opportunities:['opportunity_container'],funnel:['opportunity','funnel'],quotations:['quotation'],products:['product'],projects:['project'],milestones:['payment_milestone'],salesOrders:['sales_order'],finance:['finance_doc']}
   return sql`exists(select 1 from audit_log rl_event where rl_event.id=${rootId} and rl_event.tenant_id=${scope.ctx.tenantId} and rl_event.entity_id=${ref(alias,'id')}::text and rl_event.entity_type in (${sql.join((names[relation.target]??[]).map(name=>sql`${name}`),sql`, `)}))`
  }
  case 'accountMilestones':return sql`(${ref(alias,'funnel_id')} in (${relatedFunnels('account_id')}) or (${ref(alias,'funnel_id')} is null and ${ref(alias,'project_id')} in (select rl_connected_project.id from projects rl_connected_project left join funnels rl_connected_funnel on rl_connected_funnel.id=rl_connected_project.funnel_id and rl_connected_funnel.tenant_id=rl_connected_project.tenant_id where rl_connected_project.tenant_id=${scope.ctx.tenantId} and (rl_connected_funnel.account_id=${rootId} or (rl_connected_project.funnel_id is null and rl_connected_project.account_id=${rootId})))))`
  case 'opportunityMilestones':return sql`(${ref(alias,'funnel_id')} in (${relatedFunnels('opportunity_id')}) or (${ref(alias,'funnel_id')} is null and ${ref(alias,'project_id')} in (select rl_connected_project.id from projects rl_connected_project where rl_connected_project.tenant_id=${scope.ctx.tenantId} and rl_connected_project.funnel_id in (${relatedFunnels('opportunity_id')}))))`
  case 'funnelMilestones':return sql`(${ref(alias,'funnel_id')}=${rootId} or (${ref(alias,'funnel_id')} is null and ${ref(alias,'project_id')} in (select rl_connected_project.id from projects rl_connected_project where rl_connected_project.tenant_id=${scope.ctx.tenantId} and rl_connected_project.funnel_id=${rootId})))`
  case 'milestoneFunnel':return sql`${ref(alias,'id')}=(select coalesce(rl_sm.funnel_id,(select rl_sp.funnel_id from projects rl_sp where rl_sp.id=rl_sm.project_id and rl_sp.tenant_id=rl_sm.tenant_id)) from payment_milestones rl_sm where rl_sm.id=${rootId} and rl_sm.tenant_id=${scope.ctx.tenantId})`
  case 'accountQuotes':return sql`${ref(alias,'funnel_id')} in (${relatedFunnels('account_id')})`
  case 'opportunityQuotes':return sql`${ref(alias,'funnel_id')} in (${relatedFunnels('opportunity_id')})`
  case 'accountOrders':return sql`${ref(alias,'project_id')} in (select rl_account_project.id from projects rl_account_project where rl_account_project.tenant_id=${scope.ctx.tenantId} and rl_account_project.account_id=${rootId})`
  case 'personFunnels':return sql`${ref(alias,'primary_person_id')}=${rootId}`
  case 'personOpportunities':return sql`(${ref(alias,'primary_person_id')}=${rootId} or ${ref(alias,'owner_contact_id')}=${rootId} or ${ref(alias,'power_sponsor_contact_id')}=${rootId})`
 }
 throw new Error('Unregistered relationship')
}
/** Correlated scalar subqueries preserve one row per source, including bridge targets. */
export function relationshipRegistry(entity:RelationEntity,rootId:SQL,scope:RelationshipScope,depth=0,prefix='rl'):SqlFieldRegistry{
 const metadata=relationshipFields(entity,depth),registry:SqlFieldRegistry={}
 for(const [index,relation] of relationshipsFor(entity).entries()){
  const alias=`${prefix}_${index}`,base=`related.${relation.key}`
  const from=relationshipSource(relation.target,alias),where=sql`${connection(relation,rootId,alias,scope)} and ${relatedEntityScope(relation.target,alias,scope)}`
  const childFields=businessFieldDefinitions(relation.target),childRegistry:SqlFieldRegistry={}
  const currencyField=RELATION_ENTITIES[relation.target].fields.find(field=>field.id==='currency')
  const currency=currencyField?scalar(relation.target,alias,currencyField,scope):undefined
  for(const field of RELATION_ENTITIES[relation.target].fields)childRegistry[field.id]={field:childFields.find(f=>f.id===field.id)!,expression:scalar(relation.target,alias,field,scope),currency,dateOnly:field.dateOnly}
  if(depth<1)Object.assign(childRegistry,Object.fromEntries(Object.entries(relationshipRegistry(relation.target,ref(alias,'id'),scope,depth+1,alias)).filter(([,entry])=>entry.field.type==='collection')))
  const count=sql`(select count(*)::int from ${from} where ${where})`
  registry[base]={field:metadata.find(f=>f.id===base)!,expression:count,related:{from,where,fields:childRegistry}}
  registry[`${base}.count`]={field:metadata.find(f=>f.id===`${base}.count`)!,expression:count}
  for(const field of RELATION_ENTITIES[relation.target].fields){
   const value=scalar(relation.target,alias,field,scope)
   const entries=metadata.filter(f=>f.id.startsWith(`${base}.${field.id}`)&&f.id!==`${base}.count`)
   for(const definition of entries){
    const op=definition.id.split('.').at(-1)
    let expression:SQL,moneyBuckets:SQL|undefined,array=false
    if(relation.cardinality==='one'){
     expression=sql`(select ${value} from ${from} where ${where} limit 1)`
     if(field.type==='money'&&currency)moneyBuckets=sql`coalesce((select jsonb_build_array(jsonb_build_object('currency',${currency},'total',${value}::text)) from ${from} where ${where} and ${value} is not null limit 1),'[]'::jsonb)`
    }
    else if(op==='values'){expression=sql`array(select distinct ${value}::text from ${from} where ${where} and ${value} is not null order by 1)`;array=true}
    else if(field.type==='money'){
     if(!currency)throw new Error('A related money field requires a currency')
     moneyBuckets=sql`(select coalesce(jsonb_agg(jsonb_build_object('currency',rl_totals.currency,'total',rl_totals.total) order by rl_totals.currency),'[]'::jsonb) from (select rl_values.currency,sum(rl_values.value)::text as total from (select ${currency} as currency,${value} as value from ${from} where ${where} and ${value} is not null) rl_values group by rl_values.currency) rl_totals)`
     expression=sql`null::numeric`
    }else {const aggregate=op==='min'?sql`min(${value})`:op==='max'?sql`max(${value})`:sql`sum(${value})`;expression=sql`(select ${aggregate} from ${from} where ${where})`}
    registry[definition.id]={field:definition,expression,currency:relation.cardinality==='one'&&currency?sql`(select ${currency} from ${from} where ${where} limit 1)`:moneyBuckets?sql`null::text`:undefined,moneyBuckets,dateOnly:field.dateOnly,array}
   }
  }
 }
 return registry
}
export function relationshipSortColumns(registry:SqlFieldRegistry):Record<string,SQLWrapper>{return Object.fromEntries(Object.entries(registry).filter(([,entry])=>entry.field.sortable).map(([id,entry])=>[id,entry.expression]))}
export async function relatedQueryRegistry(tx:Tx,ctx:ServerContext,key:string,tree?:FilterGroup,sorting?:{id:string}[],rootId?:SQL):Promise<SqlFieldRegistry>{
 const entity=tableRelationEntity(key)
 if(!entity||!JSON.stringify([tree,sorting]).includes('related.'))return {}
 const scope=await relationshipScope(tx,ctx)
 return relationshipRegistry(entity,rootId??ref(RELATION_ENTITIES[entity].table,'id'),scope)
}
function collectionConditions(tree:FilterGroup):Extract<FilterNode,{kind:'condition'}>[]{return tree.children.flatMap(node=>node.kind==='group'?collectionConditions(node):node.fieldId.startsWith('related.')?[node]:[])}
/** Root authorization is checked again because IDs from a browser are untrusted. */
export async function projectRelationships(tx:Tx,ctx:ServerContext,key:string,ids:readonly string[],requested:readonly string[],tree:FilterGroup):Promise<Record<string,Record<string,unknown>>>{
 const entity=tableRelationEntity(key);if(!entity||!ids.length)return {}
 if(ids.length>500||requested.length>500||ids.some(id=>typeof id!=='string'||!id.trim()||id.length>1000))throw new Error('Invalid related field request')
 const scope=await relationshipScope(tx,ctx),root='rl_root',registry=relationshipRegistry(entity,ref(root,'id'),scope)
 const rootRule=tableAccessRule(key)
 if(!ctx.can(rootRule.permission)||(rootRule.module&&!scope.modules[rootRule.module]))throw new Error('Related fields are unavailable for this table')
 // Panel permissions authorize the source; target entities keep their independent permissions.
 const rootPermission=RELATION_ENTITIES[entity].permission
 const rootScope={...scope,ctx:{...ctx,can:(permission:string)=>permission===rootPermission?ctx.can(rootRule.permission):ctx.can(permission)}}
 const conditionAliases=new Map<string,string>()
 const fields=requested.map(id=>{const entry=registry[id];if(!entry||entry.field.filterOnly)throw new Error('Unavailable related field');return sql`${entry.moneyBuckets??entry.expression} as ${sql.identifier(id)}`})
 for(const condition of collectionConditions(tree)){
  if(registry[condition.fieldId]?.field.type!=='collection')continue
  let groupIndex=0;const serialized=JSON.stringify(condition)
  while(serialized.includes(`"id":"projection-${groupIndex}"`))groupIndex++
  const predicate=compileFilterTree({kind:'group',id:`projection-${groupIndex}`,logic:'and',children:[condition]},registry,{now:new Date(),timezone:process.env.TZ||'UTC'})
  const alias=`rl_match_${conditionAliases.size}`
  conditionAliases.set(alias,`match:${condition.id}`)
  fields.push(sql`${predicate} as ${sql.identifier(alias)}`)
 }
 if(!fields.length)return {}
 const textIdentity=['members','projectCodes','forecast'].includes(entity)
 const query=sql`select ${ref(root,'id')} as id,${sql.join(fields,sql`, `)} from ${relationshipSource(entity,root)} where ${ref(root,'id')} in (${sql.join(ids.map(id=>textIdentity?sql`${id}`:sql`${id}::uuid`),sql`, `)}) and ${relatedEntityScope(entity,root,rootScope)}`
 const rows=await tx.execute(query)
 return Object.fromEntries(Array.from(rows as unknown as Record<string,unknown>[]).map(row=>[String(row.id),Object.fromEntries(Object.entries(row).map(([key,value])=>[conditionAliases.get(key)??key,value]))]))
}
