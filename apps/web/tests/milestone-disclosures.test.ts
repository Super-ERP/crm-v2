import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
import {BillingScheduleEditor} from '@/components/billing-schedule-editor'
import {PaymentMilestoneTable,MilestoneAllocation} from '@/components/payment-milestone-table'
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn()}),useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/funnel/demo'}))
const row={id:'m',title:'Deposit',amount:'40',expectedInvoiceMonth:'November',expectedInvoiceYear:2026,description:'Secondary remarks',dueDate:'2026-11-30',status:'pending_invoicing'}
describe('milestone progressive disclosure',()=>{
 it('keeps optional details collapsed and uses shared controls for required fields',()=>{
  const html=renderToStaticMarkup(createElement(BillingScheduleEditor,{rows:[row,{...row,id:'m2',title:'Balance'}],onChange:()=>{},currency:'USD'}))
  expect(html).toContain('Expand details');expect(html).toContain('aria-expanded="false"')
  expect(html).toContain('November');expect(html).toContain('Amount (USD)');expect(html).toContain('<input');expect(html).toContain('aria-expanded="false"')
 })
 it('opens incomplete rows and single-record editing so required fields are reachable',()=>{
  const html=renderToStaticMarkup(createElement(BillingScheduleEditor,{rows:[{...row,expectedInvoiceMonth:''}],onChange:()=>{},allowRowChanges:false}))
  expect(html).toContain('<input');expect(html).toContain('invoice month');expect(html).not.toContain('<select');expect(html).not.toContain('Add billing row');expect(html).not.toContain('Remove row')
 })
 it('renders the same core table without duplicated remarks/due columns and without unsupported record links',()=>{
  const html=renderToStaticMarkup(createElement(PaymentMilestoneTable,{rows:[row],currency:'MYR',linkRecords:false}))
  expect(html).toContain('Search milestones…');expect(html).toContain('Columns');expect(html).toContain('Export');expect(html).toContain('Per page');
  expect(html).toContain('Expected invoice');expect(html).toContain('Pending invoicing');expect(html).toContain('Show details for Deposit')
  expect(html).not.toContain('Secondary remarks');expect(html).not.toContain('/payment-milestones/m');expect(html).not.toContain('Payment due date')
 })
 it('uses identical column structure and statuses for read and edit modes',()=>{
  const props={rows:[row],onChange:()=>{},currency:'USD',lines:[{id:'l',description:'Platform'}]}
  const read=renderToStaticMarkup(createElement(BillingScheduleEditor,{...props,readOnly:true}))
  const edit=renderToStaticMarkup(createElement(BillingScheduleEditor,props))
  const headers=(html:string)=>html.match(/<thead[\s\S]*?<\/thead>/)?.[0]
  expect(headers(read)).toBe(headers(edit))
  expect(read).toContain('Pending invoicing');expect(edit).toContain('Pending invoicing')
  expect(read).not.toContain('<input');expect(edit).toContain('data-slot="select-trigger"')
  expect(edit).toContain('sticky left-0');expect(edit).toContain('required=""')
 })
 it('associates inline errors with their specific row control',()=>{
  const html=renderToStaticMarkup(createElement(BillingScheduleEditor,{rows:[row],onChange:()=>{},errors:{0:{title:'Row 1: enter a title.'}}}))
  expect(html).toContain('aria-invalid="true"');expect(html).toContain('aria-describedby=');expect(html).toContain('Row 1: enter a title.')
 })
 it('keeps the allocation summary free of planning explanations and help controls',()=>{
  const html=renderToStaticMarkup(createElement(MilestoneAllocation,{total:'100',scheduled:100,currency:'MYR'}))
  expect(html).toContain('Remaining');expect(html).toContain('Fully allocated')
  expect(html).not.toContain('About payment planning');expect(html).not.toContain('popover')
 })
})
