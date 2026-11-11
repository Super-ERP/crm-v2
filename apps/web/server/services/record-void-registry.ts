import "server-only"
import { sql } from "drizzle-orm"
import type { Tx } from "@/db"
import type { ServerContext } from "@/lib/server-context"
import { PERMISSIONS as P, type PermissionKey } from "@/lib/permissions"
import { canManageAllRecords, ownsOrManages, visibleMemberIds } from "@/lib/access-scope"
import { requireEntitledModule } from "@/lib/modules.server"
import type { ModuleId } from "@/lib/module-registry"
import type { VoidTarget, VoidEntityType, VoidRecord } from "@/lib/record-void"

const catalog: Record<VoidEntityType,{table:string;label:string;path:string;view:PermissionKey;request:PermissionKey[];owner:string;module?:ModuleId}> = {
 lead:{table:'leads',label:'Lead',path:'leads',view:P.LEAD_VIEW,request:[P.LEAD_UPDATE],owner:'t.owner_member_id'},
 account:{table:'accounts',label:'Account',path:'accounts',view:P.ACCOUNT_VIEW,request:[P.ACCOUNT_UPDATE],owner:'t.owner_member_id'},
 person:{table:'persons',label:'Contact',path:'persons',view:P.PERSON_VIEW,request:[P.PERSON_UPDATE],owner:'t.owner_member_id'},
 product:{table:'products',label:'Product',path:'products',view:P.PRODUCT_VIEW,request:[P.PRODUCT_UPDATE],owner:'null::text'},
 opportunity:{table:'opportunities',label:'Opportunity',path:'opportunities',view:P.OPPORTUNITY_VIEW,request:[P.OPPORTUNITY_UPDATE],owner:'t.owner_member_id'},
 funnel:{table:'funnels',label:'Funnel',path:'funnel',view:P.OPPORTUNITY_VIEW,request:[P.OPPORTUNITY_UPDATE],owner:'t.owner_member_id'},
 quotation:{table:'quotations',label:'Quotation',path:'quotations',view:P.QUOTATION_VIEW,request:[P.QUOTATION_UPDATE],owner:'(select f.owner_member_id from funnels f where f.id=t.funnel_id and f.tenant_id=t.tenant_id)'},
 project:{table:'projects',label:'Project',path:'projects',view:P.PROJECT_VIEW,request:[P.PROJECT_UPDATE],owner:'t.owner_member_id',module:'projects'},
 payment_milestone:{table:'payment_milestones',label:'Payment milestone',path:'payment-milestones',view:P.PAYMENT_MILESTONE_VIEW,request:[P.PAYMENT_MILESTONE_MANAGE],owner:'coalesce((select f.owner_member_id from funnels f where f.id=t.funnel_id and f.tenant_id=t.tenant_id),(select p.owner_member_id from projects p where p.id=t.project_id and p.tenant_id=t.tenant_id))'},
 sales_order:{table:'sales_orders',label:'Sales Order',path:'sales-orders',view:P.SALES_ORDER_VIEW,request:[P.SALES_ORDER_SUBMIT],owner:'(select p.owner_member_id from projects p where p.id=t.project_id and p.tenant_id=t.tenant_id)',module:'salesOrders'},
 finance_doc:{table:'finance_docs',label:'Finance document',path:'billing',view:P.FINANCE_VIEW,request:[P.FINANCE_MANAGE,P.SALES_ORDER_SUBMIT],owner:'(select p.owner_member_id from projects p where p.id=t.project_id and p.tenant_id=t.tenant_id)',module:'finance'},
 contract:{table:'contracts',label:'Contract',path:'',view:P.OPPORTUNITY_VIEW,request:[P.OPPORTUNITY_UPDATE],owner:'coalesce(t.owner_member_id,(select f.owner_member_id from funnels f where f.id=t.funnel_id and f.tenant_id=t.tenant_id))'},
 contract_year:{table:'contract_years',label:'Contract year',path:'',view:P.OPPORTUNITY_VIEW,request:[P.OPPORTUNITY_UPDATE],owner:'(select f.owner_member_id from funnels f where f.id=t.funnel_id and f.tenant_id=t.tenant_id)'},
 deal_cost:{table:'deal_costs',label:'Purchase cost',path:'',view:P.OPPORTUNITY_VIEW,request:[P.OPPORTUNITY_UPDATE],owner:'(select f.owner_member_id from funnels f where f.id=t.funnel_id and f.tenant_id=t.tenant_id)'},
}
export const voidEntityCatalog = catalog
export type VoidLoadedRecord={record:VoidRecord;data:Record<string,unknown>}
export function canRequestRecordVoid(ctx:Pick<ServerContext,'can'>,type:VoidEntityType) {return catalog[type].request.some(permission=>ctx.can(permission))}
export async function loadVoidRecord(tx:Tx,ctx:ServerContext,target:VoidTarget,mode:'request'|'review'='request',allowInactive=false):Promise<VoidLoadedRecord> {
 const definition=catalog[target.type]
 if(!ctx.can(definition.view)||(mode==='request'&&!canRequestRecordVoid(ctx,target.type)))throw new Error('FORBIDDEN: insufficient record permissions')
 if(definition.module)await requireEntitledModule(definition.module)
 const [row]=await tx.execute<{data:Record<string,unknown>;owner:string|null}>(sql`select to_jsonb(t) as data, ${sql.raw(definition.owner)} as owner from ${sql.identifier(definition.table)} t where t.id=${target.id} and t.tenant_id=${ctx.tenantId}`)
 if(!row)throw new Error('Record not available')
 const visible=await visibleMemberIds(tx,ctx)
 if(target.type!=='product'&&!canManageAllRecords(ctx)&&(!row.owner||!ownsOrManages(visible,row.owner)))throw new Error('FORBIDDEN: record outside your access')
 const data=row.data
 if(target.type==='payment_milestone'&&!canManageAllRecords(ctx)) {
  const anchors=await tx.execute<{owner:string|null}>(sql`select owner_member_id as owner from projects where tenant_id=${ctx.tenantId} and id=${data.project_id??null} union all select owner_member_id as owner from funnels where tenant_id=${ctx.tenantId} and (id=${data.funnel_id??null} or id in (select funnel_id from quotations where tenant_id=${ctx.tenantId} and id=${data.quotation_id??null}))`)
  if(anchors.some(anchor=>!ownsOrManages(visible,anchor.owner)))throw new Error('FORBIDDEN: a linked record is outside your access')
 }
 if(!allowInactive&&(data.deleted_at||data.status==='void'||target.type==='finance_doc'&&data.status==='cancelled'))throw new Error('Record is already inactive or voided')
 let resolvedCurrency=typeof data.currency==='string'?data.currency:null
 if(target.type==='payment_milestone') {
  const [currency]=await tx.execute<{currency:string|null}>(sql`select coalesce((select currency from quotations where tenant_id=${ctx.tenantId} and id=${data.quotation_id??null}),(select currency from projects where tenant_id=${ctx.tenantId} and id=${data.project_id??null}),(select currency from funnels where tenant_id=${ctx.tenantId} and id=${data.funnel_id??null})) as currency`)
  resolvedCurrency=currency?.currency??null
 }
 const name=String(data.quote_number??data.so_number??data.number??data.name??data.title??data.contract_number??data.supplier_name??[data.first_name,data.last_name].filter(Boolean).join(' ')??definition.label)
 const label=name||definition.label
 const href=definition.path?`/${definition.path}${target.type==='payment_milestone'?'':`/${target.id}`}`:data.funnel_id?`/funnel/${data.funnel_id}`:null
 return {data,record:{...target,label,href,ownerMemberId:row.owner,status:typeof data.status==='string'?data.status:null,updatedAt:typeof data.updated_at==='string'?data.updated_at:null,currency:resolvedCurrency,amount:String(data.amount??data.total??data.value??'')}}
}
