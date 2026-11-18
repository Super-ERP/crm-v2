import { describe, expect, it } from "vitest"
import { validateBillingSchedule, quotationItemAllocations, billingRowsFromQuotationItems, validateQuotationItemAllocation } from "@/lib/billing-schedule"
const row = { title: "Delivery", amount: "50.00", expectedInvoiceMonth: "January", expectedInvoiceYear: 2027, quotationLineItemId: "same-product" }
describe("billing schedule validation", () => {
 it("requires explicit month and year on every row", () => {
  expect(() => validateBillingSchedule([{...row,expectedInvoiceMonth:""}])).toThrow("month and year")
  expect(() => validateBillingSchedule([{...row,expectedInvoiceYear:0}])).toThrow("month and year")
 })
 it("supports multiple billing rows for one product line", () => { expect(() => validateBillingSchedule([row,{...row,title:"Balance"}])).not.toThrow() })
 it("rejects empty schedules and invalid money", () => {
  expect(() => validateBillingSchedule([])).toThrow()
  for (const amount of ["NaN","-1","0","1.001"]) expect(() => validateBillingSchedule([{...row,amount}])).toThrow()
 })
})

describe('quotation-item billing allocation',()=>{
 it('allocates header discounts with exact cents and creates one draft per item',()=>{
  const items=quotationItemAllocations([{id:'a',description:'Platform',lineSubtotal:'78'},{id:'b',description:'Integration',lineSubtotal:'17'}],'90')
  expect(items.map(item=>item.billingAmount)).toEqual(['73.89','16.11'])
  const rows=billingRowsFromQuotationItems(items)
  expect(rows.map(row=>row.quotationLineItemId)).toEqual(['a','b'])
  expect(rows.every(row=>!row.expectedInvoiceMonth && !row.expectedInvoiceYear)).toBe(true)
  expect(()=>validateQuotationItemAllocation(rows,items)).not.toThrow()
 })
 it('preserves a one-cent remainder and allows multiple instalments per item',()=>{
  const items=quotationItemAllocations([{id:'a',description:'A',lineSubtotal:'1'},{id:'b',description:'B',lineSubtotal:'1'},{id:'c',description:'C',lineSubtotal:'1'}],'1')
  expect(items.map(item=>item.billingAmount)).toEqual(['0.34','0.33','0.33'])
  const rows=billingRowsFromQuotationItems(items)
  expect(()=>validateQuotationItemAllocation([{...rows[0],amount:'0.10'},{...rows[0],amount:'0.24'},...rows.slice(1)],items)).not.toThrow()
  expect(()=>validateQuotationItemAllocation([{...rows[0],amount:'0.35'},{...rows[1],amount:'0.32'},rows[2]],items)).toThrow('Quotation item 1')
  expect(()=>validateQuotationItemAllocation([{...rows[0],quotationLineItemId:null},...rows.slice(1)],items)).toThrow('Select a quotation item')
 })
})
