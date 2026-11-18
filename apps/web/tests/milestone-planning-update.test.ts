import {describe,it,expect,vi,beforeEach} from 'vitest'
const runtime=vi.hoisted(()=>({withTenant:vi.fn(),invoiceGate:vi.fn(),finance:false}))
vi.mock('@/lib/actions',()=>({withTenant:runtime.withTenant}))
vi.mock('@/lib/action-result',()=>({runAction:async(work:()=>unknown)=>{try{return{ok:true,data:await work()}}catch(error){return{ok:false,error:String(error)}}}}))
vi.mock('@/lib/access-scope',()=>({visibleMemberIds:async()=>null,canManageAllRecords:()=>true,ownsOrManages:()=>true,ownerScope:vi.fn()}))
vi.mock('@/server/services/record-void',()=>({lockRecordVoidGraph:vi.fn()}))
vi.mock('@/server/audit',()=>({writeAudit:vi.fn()}))
vi.mock('@/server/services/activity',()=>({logActivity:vi.fn()}))
vi.mock('@/server/services/value',()=>({opportunityNetValue:async()=>({value:'100'})}))
vi.mock('@/server/services/milestone-status',()=>({milestoneStatusForFunnel:vi.fn(),milestoneContextForFunnel:runtime.invoiceGate}))
vi.mock('@/server/services/milestone-access',()=>({milestoneContextForFunnel:runtime.invoiceGate,milestoneReadScope:vi.fn()}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import {revalidatePath} from 'next/cache'
import {updateFunnelMilestone} from '@/app/(app)/payment-milestones/actions'
function chain(value:unknown){const q={from:()=>q,where:()=>q,limit:()=>q,for:()=>q,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(value).then(resolve)};return q}
function db(status='pending_invoicing'){
 const rows=[[{id:'m',funnelId:'f',quotationId:'q',title:'Delivery',amount:'100.00',status,description:null,dueDate:null}],[{id:'f',ownerMemberId:'owner'}],[{total:'0'}]]
 const updated=vi.fn(()=>({where:async()=>[]}))
 const tx={select:()=>chain(rows.shift()??[]),update:()=>({set:updated}),execute:async()=>runtime.finance?[{linked:true}]:[]}
 runtime.withTenant.mockImplementation(async(_permission,work)=>work(tx,{tenantId:'tenant',memberId:'owner'}));return updated
}
beforeEach(()=>{vi.clearAllMocks();runtime.finance=false;runtime.invoiceGate.mockRejectedValue(new Error('Stage 4a required'))})
describe('existing planning milestone updates',()=>{
 it('saves remarks before 4a and refreshes all linked views',async()=>{
  const updated=db();expect((await updateFunnelMilestone('m',{description:'Pre-commit planning note'})).ok).toBe(true)
  expect(updated).toHaveBeenCalledWith(expect.objectContaining({description:'Pre-commit planning note'}))
  expect(runtime.invoiceGate).not.toHaveBeenCalled()
  for(const path of ['/quotations','/funnel','/projects','/payment-milestones'])expect(revalidatePath).toHaveBeenCalledWith(path,'layout')
 })
 it('retains the readiness gate when marking invoiced',async()=>{
  const updated=db();expect((await updateFunnelMilestone('m',{status:'invoiced'})).ok).toBe(false)
  expect(runtime.invoiceGate).toHaveBeenCalled();expect(updated).not.toHaveBeenCalled()
 })
 it('permits only forecast corrections for locked history',async()=>{
  const updated=db('invoiced');expect((await updateFunnelMilestone('m',{expectedInvoiceMonth:'January',expectedInvoiceYear:2027})).ok).toBe(true)
  expect(updated).toHaveBeenCalledWith(expect.objectContaining({expectedInvoiceMonth:'January'}))
  const blocked=db('invoiced');expect((await updateFunnelMilestone('m',{description:'Rewrite history'})).ok).toBe(false);expect(blocked).not.toHaveBeenCalled()
 })
})
