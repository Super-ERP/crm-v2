import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import type { Tx } from '@/db'
import { OPTIONAL_TABLE_FIELDS } from '@/lib/table-controls/fields'

/** All identifiers below are developer-owned constants, never request parameters. */
const roots: Record<string, string> = {
  leads:'leads', accounts:'accounts', persons:'persons', opportunities:'opportunities', funnel:'funnels',
  quotations:'quotations', products:'products', projects:'projects', 'payment-milestones':'payment_milestones',
  'sales-orders':'sales_orders', 'finance-sale':'finance_docs', 'finance-purchase':'finance_docs',
}
const direct: Record<string,string> = {
  country:'country', convertedAt:'converted_at', createdAt:'created_at', updatedAt:'updated_at', website:'website', phone:'phone',
  registrationNumber:'registration_number', isCustomer:'is_customer', budgetingDate:'budgeting_date', mobile:'mobile',
  currency:'currency', quoteDate:'quote_date', startDate:'start_date', description:'description', dueDate:'due_date',
  reviewedAt:'reviewed_at', documentKind:'document_kind', paymentTerm:'payment_term',
}
const ref = (table:string, column:string) => `"${table}"."${column}"`
function projectValue(root:string,column:string) {
  return `(select tf_p."${column}" from projects tf_p where tf_p.id=${ref(root,'project_id')} and tf_p.tenant_id=${ref(root,'tenant_id')})`
}
function funnelId(key:string,root:string) {
  if(key==='funnel')return ref(root,'id')
  if(key==='payment-milestones')return `coalesce(${ref(root,'funnel_id')},${projectValue(root,'funnel_id')})`
  if(key==='sales-orders')return projectValue(root,'funnel_id')
  return ref(root,'funnel_id')
}
function funnelValue(key:string,root:string,column:string) {
  return `(select tf_f."${column}" from funnels tf_f where tf_f.id=${funnelId(key,root)} and tf_f.tenant_id=${ref(root,'tenant_id')})`
}
function memberName(root:string,id:string) {
  return `(select tf_u.name from member tf_m join "user" tf_u on tf_u.id=tf_m.user_id where tf_m.id=${id} and tf_m.organization_id=${ref(root,'tenant_id')})`
}
/** One expression per approved field, shared by query predicates, sort and projection. */
export function datasetFieldExpressions(key:string): Record<string,SQL> {
  const root=roots[key]
  if(!root)return {}
  return Object.fromEntries((OPTIONAL_TABLE_FIELDS[key]??[]).map(field=>{
    let expression:string
    if(field.id==='salespersonName') {
      const owner=['opportunities','funnel','projects'].includes(key)?ref(root,'owner_member_id'):funnelValue(key,root,'owner_member_id')
      expression=memberName(root,owner)
    } else if(field.id==='funnelStatus')expression=funnelValue(key,root,'status')
    else if(field.id==='funnelStageName'||field.id==='stageName'||field.id==='stage') {
      const stage=['funnel','leads'].includes(key)?ref(root,'current_stage_id'):funnelValue(key,root,'current_stage_id')
      expression=`(select tf_s.name from pipeline_stages tf_s where tf_s.id=${stage} and tf_s.tenant_id=${ref(root,'tenant_id')})`
    } else if(field.id==='customerName') {
      expression=`(select tf_a.name from accounts tf_a where tf_a.id=${funnelValue(key,root,'account_id')} and tf_a.tenant_id=${ref(root,'tenant_id')})`
    } else if(field.id==='quotationStatus') {
      expression=`(select tf_q.status from quotations tf_q where tf_q.id=${ref(root,'quotation_id')} and tf_q.tenant_id=${ref(root,'tenant_id')})`
    } else if(field.id==='projectName')expression=projectValue(root,'name')
    else if(field.id==='projectCode')expression=projectValue(root,'project_code')
    else if(field.id==='funnelName')expression=funnelValue(key,root,'name')
    else if(field.id==='quoteNumber') {
      const id=key==='sales-orders'?projectValue(root,'quotation_id'):ref(root,'quotation_id')
      expression=`(select tf_q.quote_number from quotations tf_q where tf_q.id=${id} and tf_q.tenant_id=${ref(root,'tenant_id')})`
    } else if(field.id==='reviewedByName')expression=memberName(root,ref(root,'reviewed_by_member_id'))
    else if(key==='payment-milestones'&&field.id==='currency') {
      expression=`coalesce((select tf_q.currency from quotations tf_q where tf_q.id=${ref(root,'quotation_id')} and tf_q.tenant_id=${ref(root,'tenant_id')}),${funnelValue(key,root,'currency')},${projectValue(root,'currency')})`
    } else {
      const column=direct[field.id]
      if(!column)throw new Error(`Missing dataset expression: ${key}.${field.id}`)
      expression=ref(root,column)
    }
    return [field.id,sql.raw(expression)]
  }))
}

/** Only pass rows already authorised by the dataset's existing list loader. */
export async function enrichTableRows<T extends {id:string}>(tx:Tx,key:string,rows:T[],tenantId:string):Promise<T[]> {
  const root=roots[key], fields=datasetFieldExpressions(key)
  if(!root||!rows.length||!Object.keys(fields).length)return rows
  const projection=sql.join(Object.entries(fields).map(([id,value])=>sql`${value} as ${sql.identifier(id)}`),sql`, `)
  const ids=sql.join(rows.map(row=>sql`${row.id}::uuid`),sql`, `)
  const result=await tx.execute(sql`select ${sql.raw(ref(root,'id'))} as id, ${projection} from ${sql.identifier(root)} where ${sql.raw(ref(root,'id'))} in (${ids}) and ${sql.raw(ref(root,'tenant_id'))}=${tenantId}`)
  const byId=new Map(Array.from(result as unknown as Record<string,unknown>[]).map(row=>[String(row.id),row]))
  return rows.map(row=>({...row,tableFields:byId.get(row.id)??{}}))
}
