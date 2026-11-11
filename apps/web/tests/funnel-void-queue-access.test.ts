import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({context:vi.fn(),tenant:vi.fn()}))
vi.mock('@/lib/server-context',()=>({requireContext:mocks.context}))
vi.mock('@/db',()=>({runInTenant:mocks.tenant}))
vi.mock('@/lib/access-scope',()=>({canManageAllRecords:vi.fn(),ownerScope:vi.fn(),visibleMemberIds:vi.fn()}))
vi.mock('@/lib/actions',()=>({withTenant:vi.fn()}))
vi.mock('@/lib/action-result',()=>({runAction:vi.fn()}))
vi.mock('@/server/services/funnel-void-approval',()=>({decideFunnelVoid:vi.fn()}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import {listFunnelVoidApprovals} from '@/app/(app)/approvals/void-actions'
beforeEach(()=>vi.clearAllMocks())
it('does not break quotation-only or lead-only queues by asserting funnel read permission',async()=>{
 for(const key of ['quotation.approve','lead.convert.approve']) {
  mocks.context.mockResolvedValue({memberId:'reviewer',can:(p:string)=>p===key})
  expect(await listFunnelVoidApprovals('incoming',{order:'oldest'})).toEqual({rows:[],total:0})
 }
 expect(mocks.tenant).not.toHaveBeenCalled()
})
it('returns no incoming voids to sales without approval capability',async()=>{
 mocks.context.mockResolvedValue({memberId:'sales',can:(p:string)=>p==='opportunity.view'})
 expect(await listFunnelVoidApprovals('incoming',{order:'oldest'})).toEqual({rows:[],total:0})
 expect(mocks.tenant).not.toHaveBeenCalled()
})
