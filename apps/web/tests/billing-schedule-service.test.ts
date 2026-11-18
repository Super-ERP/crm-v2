import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { saveBillingSchedule } from "@/server/services/billing-schedule"
import type { Tx } from "@/db"
const row = { title: "Delivery", amount: "50.00", expectedInvoiceMonth: "January", expectedInvoiceYear: 2027, quotationLineItemId: "line" }
function database({ finance = false, lines = ["line"], subtotal = "100" } = {}) {
 const results: unknown[] = [[{id:"funnel",tenantId:"tenant",primaryQuotationId:"quote"}], [{id:"quote",status:"sent",subtotal,discountTotal:"0"}], lines.map(id => ({id,description:id,lineSubtotal:String(Number(subtotal)/lines.length)})), []]
 const inserted = vi.fn((_rows: unknown) => ({ returning: async () => [] }))
 const update = vi.fn(() => ({set: () => ({where: async () => []})}))
 const tx = {
  select: () => { const result = results.shift(); const query = {from: () => query, where: () => query, for: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)}; return query },
  execute: async () => finance ? [{linked:true}] : [],
  update, insert: () => ({values:inserted}),
 }
 return { tx: tx as unknown as Tx, inserted, update }
}
describe("transactional billing schedule preparation", () => {
 it("allows preparation from a sent primary quote with repeated product sources", async () => {
  const db = database()
  await saveBillingSchedule(db.tx,{funnelId:"funnel",rows:[row,{...row,title:"Balance"}]})
  expect(db.inserted).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({tenantId:"tenant",quotationId:"quote",quotationLineItemId:"line",expectedInvoiceMonth:"January",expectedInvoiceYear:2027})]))
 })
 it("never copies runtime IDs or financial fields into new rows", async () => {
  const db = database({subtotal:"50"})
  await saveBillingSchedule(db.tx,{funnelId:"funnel",rows:[{...row,id:"old",status:"invoiced",projectId:"injected",deletedAt:new Date()} as typeof row]})
  const inserted = db.inserted.mock.calls[0][0] as unknown as Record<string,unknown>[]
  expect(inserted[0]).not.toHaveProperty("id")
  expect(inserted[0]).not.toHaveProperty("status")
  expect(inserted[0]).not.toHaveProperty("projectId")
  expect(inserted[0]).not.toHaveProperty("deletedAt")
 })
 it("rejects exceeding net quoted value before any mutation", async () => {
  const db = database({subtotal:"20"})
  await expect(saveBillingSchedule(db.tx,{funnelId:"funnel",rows:[row]})).rejects.toThrow("exceeds")
  expect(db.update).not.toHaveBeenCalled()
 })
 it("rejects product lines from another quotation", async () => {
  const db = database({lines:["other"],subtotal:"50"})
  await expect(saveBillingSchedule(db.tx,{funnelId:"funnel",rows:[row]})).rejects.toThrow("does not belong")
  expect(db.update).not.toHaveBeenCalled()
 })
 it("preserves financially linked history", async () => {
  const db = database({finance:true,subtotal:"50"})
  await expect(saveBillingSchedule(db.tx,{funnelId:"funnel",rows:[row]})).rejects.toThrow("only allow")
  expect(db.update).not.toHaveBeenCalled()
 })
 it("rejects under-allocation before changing any rows",async()=>{
  const db=database()
  await expect(saveBillingSchedule(db.tx,{funnelId:'funnel',rows:[row]})).rejects.toThrow('must equal')
  expect(db.update).not.toHaveBeenCalled();expect(db.inserted).not.toHaveBeenCalled()
 })

 it("rejects shifting money between items even if the quotation total balances",async()=>{
  const db=database({lines:['a','b']})
  await expect(saveBillingSchedule(db.tx,{funnelId:'funnel',rows:[{...row,quotationLineItemId:'a',amount:'90'},{...row,quotationLineItemId:'b',amount:'10'}]})).rejects.toThrow('Quotation item 1')
  expect(db.update).not.toHaveBeenCalled();expect(db.inserted).not.toHaveBeenCalled()
 })
})
