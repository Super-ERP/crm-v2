import {describe,it,expect,vi,beforeEach} from 'vitest'
const runtime=vi.hoisted(()=>({withModule:vi.fn(),status:vi.fn(async()=> 'pending_invoicing')}))
vi.mock('@/lib/actions',()=>({withModule:runtime.withModule,withTenant:vi.fn()}))
vi.mock('@/lib/action-result',()=>({runAction:async(work:()=>unknown)=>{try{return{ok:true,data:await work()}}catch(error){return{ok:false,error:String(error)}}}}))
vi.mock('@/lib/access-scope',()=>({visibleMemberIds:async()=>null,canManageAllRecords:()=>true,ownsOrManages:()=>true,ownerScope:vi.fn()}))
vi.mock('@/server/services/record-void',()=>({lockRecordVoidGraph:vi.fn()}))
vi.mock('@/server/audit',()=>({writeAudit:vi.fn()}))
vi.mock('@/server/services/activity',()=>({logActivity:vi.fn()}))
vi.mock('@/server/services/milestone-status',()=>({milestoneStatusForFunnel:runtime.status}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import {updateMilestone,createMilestone} from '@/app/(app)/projects/actions'
function chain(value:unknown){const q={from:()=>q,where:()=>q,limit:()=>q,for:()=>q,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(value).then(resolve)};return q}
function db(rows:unknown[]){const updated=vi.fn(()=>({where:async()=>[]}));const inserted=vi.fn(()=>({returning:async()=>[{id:'new'}]}));const tx={select:()=>chain(rows.shift()??[]),update:()=>({set:updated}),insert:()=>({values:inserted}),execute:async()=>[]};runtime.withModule.mockImplementation(async(_module,_permission,work)=>work(tx,{tenantId:'tenant',memberId:'owner'}));return{updated,inserted}}
const existing={id:'m',projectId:'p',title:'Delivery',amount:'100.00',status:'pending_invoicing',expectedInvoiceMonth:'November',expectedInvoiceYear:2026}
describe('Project milestone forecast periods',()=>{
 beforeEach(()=>vi.clearAllMocks())
 it('persists the invoice period on creation instead of silently discarding the shared form fields',async()=>{
  const fixture=db([[{id:'p',value:'100',funnelId:'f',quotationId:'q'}],[{total:'0'}],[{maxSort:-1}]])
  expect((await createMilestone({projectId:'p',title:'Delivery',amount:'100',expectedInvoiceMonth:'January',expectedInvoiceYear:2027})).ok).toBe(true)
  expect(fixture.inserted).toHaveBeenCalledWith(expect.objectContaining({expectedInvoiceMonth:'January',expectedInvoiceYear:2027}))
 })
 it('persists changed dates and rejects invalid periods before writing',async()=>{
  const fixture=db([[existing],[{id:'p',value:'100',ownerMemberId:'owner'}],[{total:'0'}]])
  expect((await updateMilestone('m',{expectedInvoiceMonth:'December',expectedInvoiceYear:2027})).ok).toBe(true)
  expect(fixture.updated).toHaveBeenCalledWith(expect.objectContaining({expectedInvoiceMonth:'December',expectedInvoiceYear:2027}))
  const invalid=db([[existing],[{id:'p',value:'100'}]])
  expect((await updateMilestone('m',{expectedInvoiceMonth:'Invalid',expectedInvoiceYear:2027})).ok).toBe(false)
  expect(invalid.updated).not.toHaveBeenCalled()
 })
})
