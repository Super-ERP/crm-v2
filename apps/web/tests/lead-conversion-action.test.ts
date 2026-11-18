import { describe, expect, it, vi } from "vitest"
import { validateConversionInput } from "@/lib/lead-conversion-approval"
const mocks=vi.hoisted(()=>({context:{tenantId:'tenant',memberId:'sales',can:()=>true},convert:vi.fn()}))
vi.mock('@/lib/actions',()=>({requireContext:async()=>mocks.context,withTenant:async(_permission:unknown,work:(tx:unknown,ctx:unknown)=>unknown)=>{
 const q={from:()=>q,where:()=>q,limit:async()=>[{ownerMemberId:'sales'}]};return work({select:()=>q},mocks.context)
}}))
vi.mock('@/lib/action-result',()=>({runAction:async(work:()=>Promise<unknown>)=>({ok:true,data:await work()})}))
vi.mock('@/lib/access-scope',()=>({visibleMemberIds:async()=>['sales'],ownsOrManages:()=>true,canManageAllRecords:()=>false}))
vi.mock('@/lib/api-readers',()=>({leadsList:vi.fn(),leadsGet:vi.fn(),leadsFilterSources:vi.fn()}))
vi.mock('@/server/services/conversion',()=>({convertLead:mocks.convert}))
vi.mock('@/server/audit',()=>({writeAudit:vi.fn()}))
vi.mock('@/server/services/activity',()=>({logActivity:vi.fn()}))
vi.mock('@/server/services/changes/record',()=>({recordChanges:vi.fn()}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import { convertLeadAction } from '@/app/(app)/leads/actions'

describe('lead conversion action handoff',()=>{
 it('passes the selected Project Nature into the reviewed conversion snapshot',async()=>{
  mocks.convert.mockImplementation(async(_ctx,input)=>{validateConversionInput(input);return {pending:true}})
  await expect(convertLeadAction({leadId:'lead',existingAccountId:'account',createOpportunity:true,projectNatureCode:' L ',opportunityName:'Test',funnelName:'First funnel'})).resolves.toMatchObject({ok:true,data:{pending:true}})
  expect(mocks.convert).toHaveBeenCalledWith(mocks.context,expect.objectContaining({projectNatureCode:'L',createOpportunity:true,existingAccountId:'account'}))
 })
})
