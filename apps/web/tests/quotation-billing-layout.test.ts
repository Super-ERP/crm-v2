import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}))
vi.mock('@/app/(app)/payment-milestones/actions',()=>({prepareQuotationBillingSchedule:vi.fn()}))
import {QuotationBillingSchedule} from '@/components/quotation-billing-schedule'
const props={quotationId:'q',initial:[{id:'m1',title:'Deposit',amount:'40',expectedInvoiceMonth:'November',expectedInvoiceYear:2026,quotationLineItemId:'l1',status:'pending_invoicing'},{id:'m2',title:'Balance',amount:'60',expectedInvoiceMonth:'January',expectedInvoiceYear:2027,quotationLineItemId:'l1',status:'pending_invoicing'}],lines:[{id:'l1',description:'Analytics platform',lineSubtotal:'100'}],currency:'USD',netValue:'100',canManage:true}
describe('quotation milestone summary',()=>{
 it('presents one readable row per milestone and its shared product source, with original currency totals',()=>{
  const html=renderToStaticMarkup(createElement(QuotationBillingSchedule,props))
  expect(html).toContain('<table');expect(html).toContain('Deposit');expect(html).toContain('Balance')
  expect(html.match(/Analytics platform/g)).toHaveLength(2)
  expect(html).toContain('November 2026');expect(html).toContain('January 2027')
  expect(html).toContain('US$100.00');expect(html).not.toContain('RM')
  expect(html).toContain('Edit payment plan');expect(html).not.toContain('<input');expect(html).not.toContain('Remove row')
 })
 it('respects read-only access without hiding the milestones',()=>{
  const html=renderToStaticMarkup(createElement(QuotationBillingSchedule,{...props,canManage:false}))
  expect(html).toContain('/payment-milestones/m1');expect(html).not.toContain('Edit payment plan')
 })
})
