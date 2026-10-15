import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({stage:vi.fn(),mine:vi.fn(),quotation:vi.fn(),lead:vi.fn()}))
vi.mock('@/app/(app)/approvals/actions',()=>({listIncomingApprovals:mocks.stage,listMyApprovals:mocks.mine}))
vi.mock('@/app/(app)/approvals/quotation-actions',()=>({listQuotationApprovals:mocks.quotation}))
vi.mock('@/app/(app)/approvals/lead-conversion-actions',()=>({listLeadConversionApprovals:mocks.lead}))
import {listApprovalQueue} from '@/app/(app)/approvals/queue-actions'
import {decodeApprovalCursor} from '@/lib/approval-queue'
const id=(n:number)=>`00000000-0000-4000-8000-${n.toString().padStart(12,'0')}`
beforeEach(()=>{vi.clearAllMocks();for(const mock of Object.values(mocks))mock.mockResolvedValue({rows:[],total:0})})
it('merges bounded candidates from existing scoped readers, oldest first across workflow types',async()=>{
 mocks.stage.mockResolvedValue({rows:[{id:id(2),queueSortKey:'2000000'}],total:1})
 mocks.quotation.mockResolvedValue({rows:[{id:id(1),queueSortKey:'1000000'}],total:1})
 mocks.lead.mockResolvedValue({rows:[{id:id(3),queueSortKey:'3000000'}],total:1})
 const page=await listApprovalQueue()
 expect(page.items.map(i=>i.kind)).toEqual(['quotation','stage','lead'])
 expect(page.counts).toEqual({stage:1,quotation:1,lead:1})
 expect(mocks.stage).toHaveBeenCalledWith(0,{order:'oldest',search:'',cursor:null})
})
it('returns 25 requests with a cursor for the last displayed request, not the lookahead',async()=>{
 mocks.stage.mockResolvedValue({rows:Array.from({length:26},(_,i)=>({id:id(i),queueSortKey:String(1000000+i)})),total:40})
 const page=await listApprovalQueue({type:'stage'})
 expect(page.items).toHaveLength(25);expect(page.hasNextPage).toBe(true)
 expect(decodeApprovalCursor(page.nextCursor!)).toMatchObject({id:id(24),kind:'stage'})
 expect(mocks.quotation).not.toHaveBeenCalled();expect(mocks.lead).not.toHaveBeenCalled()
})
it('rejects invalid cursor and oversized search before calling a reader',async()=>{
 await expect(listApprovalQueue({cursor:'invalid'})).rejects.toThrow()
 await expect(listApprovalQueue({search:'x'.repeat(201)})).rejects.toThrow()
 expect(mocks.stage).not.toHaveBeenCalled()
})
it('uses requester-scoped history for My requests and forwards all queue constraints',async()=>{
 await listApprovalQueue({tab:'mine',type:'stage',order:'newest',search:'Renewal'})
 expect(mocks.stage).not.toHaveBeenCalled()
 expect(mocks.mine).toHaveBeenCalledWith(0,{order:'newest',search:'Renewal',cursor:null})
})
