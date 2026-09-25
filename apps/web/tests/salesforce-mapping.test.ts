import { describe, expect, it } from "vitest"
import { MAPPINGS, type Ctx } from "../db/import/mapping"

const ctx: Ctx = {
  detId: (object, id) => `${object}:${id}`,
  resolveOwner: () => "member",
  resolveStage: () => ({ pipelineId: "pipeline", stageId: "stage", code: "0e" }),
  nextFreeOppNumber: (_year, n) => n,
  warn: () => {},
}
function convert(object: string, row: Record<string, string>) {
  const map = MAPPINGS.find(m => m.object === object)!
  return { ...Object.fromEntries(Object.entries(map.fields).filter(([key]) => key in row)
    .map(([key, field]) => [field.col, field.xform ? field.xform(row[key], ctx) : row[key]])), ...map.defaults?.(row, ctx) }
}

describe("Salesforce export aliases", () => {
  it("imports the actual account name and currency rather than a missing standard header", () => {
    expect(convert("Account", { Company_Name__c: "Acme", CurrencyIsoCode: "USD" }))
      .toMatchObject({ name: "Acme", currency: "USD" })
  })
  it("preserves unsplit contact names and custom designation/mobile fields", () => {
    expect(convert("Contact", { Name: "Nur Aisyah binti Ali", Contact_Designation__c: "Director", MobilePhone: "+60123456789" }))
      .toMatchObject({ first_name: "Nur Aisyah binti Ali", title: "Director", phone: "+60123456789" })
  })
  it("uses the lead person name and conversion flag", () => {
    expect(convert("Lead", { Name: "Jane Lee", Company: "Acme", Status: "Qualified", IsConverted: "true" }))
      .toMatchObject({ name: "Jane Lee", status: "converted" })
  })
  it("does not subtract already included line discounts twice or discard tax", () => {
    expect(convert("Quote", { Total_Excluding_Tax__c: "90", Total_Discount__c: "10", Tax_Amount__c: "7.2", Total_Including_Tax__c: "97.2", Tax_Percentage__c: "8" }))
      .toMatchObject({ subtotal: 90, discount_total: 0, tax_total: 7.2, total: 97.2 })
  })
  it("preserves the opportunity product link", () => {
    expect(convert("OpportunityLineItem", { OpportunityId: "f1", Product2Id: "p1" }))
      .toMatchObject({ funnel_id: "Opportunity:f1", product_id: "Product2:p1" })
  })
})
