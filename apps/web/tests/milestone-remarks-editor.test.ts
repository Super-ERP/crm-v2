import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect} from 'vitest'
import {BillingScheduleEditor} from '@/components/billing-schedule-editor'
import {validateBillingSchedule,isForecastOnlyMilestoneUpdate} from '@/lib/billing-schedule'
const row={id:'m',title:'Deposit',amount:'100.00',expectedInvoiceMonth:'November',expectedInvoiceYear:2026,quotationLineItemId:'line',description:'Existing remarks',dueDate:'2026-11-30'}
describe('milestone remarks and source navigation',()=>{
 it('limits history corrections to forecast fields without admitting metadata writes',()=>{
  expect(isForecastOnlyMilestoneUpdate({expectedInvoiceMonth:'December',expectedInvoiceYear:2027})).toBe(true)
  expect(isForecastOnlyMilestoneUpdate({expectedInvoiceMonth:'December',description:'Changed history'})).toBe(false)
  expect(isForecastOnlyMilestoneUpdate({amount:'10'})).toBe(false)
  expect(isForecastOnlyMilestoneUpdate({})).toBe(false)
 })
 it('edits optional details in the expanded row and links to persisted source records',()=>{
  const html=renderToStaticMarkup(createElement(BillingScheduleEditor,{rows:[row],onChange:()=>{},expandInitially:true,quotationId:'quote',lines:[{id:'line',description:'Platform',billingAmount:'100.00'}]}))
  expect(html).toContain('<textarea');expect(html).toContain('Existing remarks');expect(html).toContain('value="2026-11-30"')
  expect(html).toContain('href="/payment-milestones/m"');expect(html).toContain('href="/quotations/quote"')
  expect(html).not.toContain('Quotation item → milestone')
 })
 it('keeps metadata read-only for locked history and view-only users',()=>{
  for(const flags of [{readOnly:true},{dateOnly:true}]){
   const html=renderToStaticMarkup(createElement(BillingScheduleEditor,{rows:[row],onChange:()=>{},expandInitially:true,...flags}))
   expect(html).not.toContain('<textarea');expect(html).toContain('Existing remarks')
  }
 })
 it('validates optional remarks and calendar dates without requiring either',()=>{
  expect(()=>validateBillingSchedule([{...row,description:null,dueDate:null}])).not.toThrow()
  expect(()=>validateBillingSchedule([{...row,description:42 as unknown as string}])).toThrow('Remarks')
  expect(()=>validateBillingSchedule([{...row,dueDate:'2026-02-30'}])).toThrow('due date')
 })
})
