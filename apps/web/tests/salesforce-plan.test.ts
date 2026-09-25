import { describe, expect, it } from "vitest"
import { migrationId, planMigration, roundNumeric, type Dataset } from "../db/import/plan"
const options = { tenantId: "tenant-a", entityCode: "QM", ctx: {
  resolveOwner: () => "member-a",
  resolveStage: () => ({ pipelineId: "pipeline",stageId: "stage",code: "0e" }),
  warn: () => {},
} }
function source(rows: Record<string,string>[]) { return { headers: [...new Set(rows.flatMap(Object.keys))], rows } }
function fixture(): Dataset { return {
  Account: source([{Id:"a",Company_Name__c:"Acme",CurrencyIsoCode:"MYR"}]),
  Opportunity_ID__c:source([{Id:"o",Name:"Legacy name",Account_Name_c__c:"a",Opportunity_Year__c:"2026",Opportunity_Number__c:"1"}]),
  Opportunity:source([{Id:"f",Name:"Funnel",AccountId:"a",Opportunity__c:"o",StageName:"0E",SyncedQuoteId:"q1",CurrencyIsoCode:"MYR"}]),
  Quote:source([{Id:"q1",QuoteNumber:"Q1",OpportunityId:"f",Revision_Number__c:"1",Status:"Finalized",Tax_Percentage__c:"8",Total_Excluding_Tax__c:"90",Tax_Amount__c:"7.2",Total_Including_Tax__c:"97.2"},
    {Id:"q2",QuoteNumber:"Q2",OpportunityId:"f",Revision_Number__c:"1",Status:"Draft",Tax_Percentage__c:"0",Total_Excluding_Tax__c:"0",Tax_Amount__c:"0",Total_Including_Tax__c:"0"}]),
  QuoteLineItem:source([{Id:"l",QuoteId:"q1",Quantity:"1",UnitPrice:"100",Item_Discount__c:"10",Description__c:"Service"}]),
} }
describe("migration planning invariants",()=>{
  it("allocates unique stable revisions independently of CSV order",()=>{
    const a=planMigration(fixture(),options).records.filter(r=>r.object==="Quote")
    const d=fixture();d.Quote.rows.reverse()
    const b=planMigration(d,options).records.filter(r=>r.object==="Quote")
    expect(a.map(r=>r.values.version)).toEqual([1,2])
    expect(a.map(r=>[r.sourceId,r.values.version])).toEqual(b.map(r=>[r.sourceId,r.values.version]))
  })
  it("uses shared quote math for line tax and consistent primary flags",()=>{
    const p=planMigration(fixture(),options)
    expect(p.records.find(r=>r.sourceId==="l")?.values).toMatchObject({line_subtotal:90,line_tax:7.2,line_total:97.2})
    expect(p.records.find(r=>r.sourceId==="q1")?.values.is_primary).toBe(true)
    expect(p.records.find(r=>r.sourceId==="f")?.values.amount).toBe(90)
  })
  it("quarantines orphans and their lines instead of inventing a parent",()=>{
    const d=fixture();d.Quote.rows[0].OpportunityId=""
    const p=planMigration(d,options)
    expect(p.records.find(r=>r.sourceId==="q1")?.status).toBe("quarantined")
    expect(p.records.find(r=>r.sourceId==="l")?.status).toBe("quarantined")
  })
  it("rejects quote total mismatches instead of silently replacing money",()=>{
    const d=fixture();d.Quote.rows[0].Total_Including_Tax__c="108"
    expect(planMigration(d,options).records.find(r=>r.sourceId==="q1")?.status).toBe("quarantined")
  })
  it("uses the application opportunity naming convention",()=>{
    expect(planMigration(fixture(),options).records.find(r=>r.sourceId==="o")?.values)
      .toMatchObject({code:"QMOPP-2026-0001",name:"QMOPP-2026-0001"})
  })
  it("scopes identities by tenant",()=>{
    expect(migrationId("a","Account","sf1")).not.toBe(migrationId("b","Account","sf1"))
  })
})

describe("storage and legacy adjustment normalization",()=>{
  it("rounds decimals exactly to PostgreSQL scale, including negative ties",()=>{
    expect(roundNumeric("1.005",2)).toBe(1.01)
    expect(roundNumeric("-1.005",2)).toBe(-1.01)
    expect(roundNumeric("1e-7",6)).toBe(0)
    expect(roundNumeric("12.3456",3)).toBe(12.346)
  })
  it("converts a negative discount line to header discount without changing payable total",()=>{
    const d=fixture();d.QuoteLineItem.rows[0].Item_Discount__c="0"
    d.QuoteLineItem.rows.push({Id:"credit",QuoteId:"q1",Quantity:"1",UnitPrice:"-10",Item_Discount__c:"0",Description__c:"Special discount"})
    const p=planMigration(d,options)
    expect(p.records.find(r=>r.sourceId==="q1")).toMatchObject({status:"ready",values:{subtotal:100,header_discount:10,discount_total:10,total:97.2,tax_total:7.2}})
    expect(p.records.find(r=>r.sourceId==="credit")?.values).toMatchObject({unit_price:0,discount_percent:0,description:"Special discount"})
    expect(p.notes.some(n=>n.sourceId==="credit"&&n.technique.includes("header discount"))).toBe(true)
  })
  it("normalizes stored precision before calculating quotations",()=>{
    const d=fixture();d.QuoteLineItem.rows[0].Item_Discount__c="10.004"
    const p=planMigration(d,{...options,numericScales:{quotation_line_items:{discount_percent:2}}})
    expect(p.records.find(r=>r.sourceId==="l")?.values.discount_percent).toBe(10)
    expect(p.records.find(r=>r.sourceId==="q1")?.status).toBe("ready")
    expect(p.changes.some(c=>c.field==="discount_percent")).toBe(true)
  })
})

it("rebuilds funnel products from the primary quote and accounts for superseded snapshots",()=>{
  const d=fixture();d.OpportunityLineItem=source([{Id:"old-product",OpportunityId:"f",Quantity:"1",UnitPrice:"999",TotalPrice:"999"}])
  const p=planMigration(d,options)
  expect(p.records.find(r=>r.sourceId==="old-product")?.status).toBe("superseded")
  expect(p.records.find(r=>r.generated)?.values).toMatchObject({unit_price:"100",total_price:"97.2"})
})

it("resolves an account company lookup to its display name",()=>{
  const d=fixture();d.Account.rows[0].Company_Name__c="a03J4000005CsgJIAS"
  d.Company__c=source([{Id:"a03J4000005CsgJIAS",Name:"ALLIANCE BANK MALAYSIA"}])
  expect(planMigration(d,options).records.find(r=>r.sourceId==="a")?.values.name).toBe("ALLIANCE BANK MALAYSIA")
  delete d.Company__c
  expect(planMigration(d,options).records.find(r=>r.sourceId==="a")?.status).toBe("quarantined")
})
it("applies a reviewed parent override and imports the child lines automatically",()=>{
  const d=fixture();d.Quote.rows[0].OpportunityId=""
  const p=planMigration(d,{...options,quoteFunnelOverrides:{q1:{funnelId:"f",reason:"Confirmed by data owner"}}})
  expect(p.records.find(r=>r.sourceId==="q1")).toMatchObject({status:"ready",values:{funnel_id:migrationId(options.tenantId,"Opportunity","f")}})
  expect(p.records.find(r=>r.sourceId==="l")?.status).toBe("ready")
  expect(p.notes.some(n=>n.sourceId==="q1"&&n.technique.includes("Confirmed by data owner"))).toBe(true)
})
it("rejects parent overrides for absent targets or conflicting existing links",()=>{
  const d=fixture()
  expect(()=>planMigration(d,{...options,quoteFunnelOverrides:{q1:{funnelId:"missing",reason:"Confirmed"}}})).toThrow()
  expect(()=>planMigration(d,{...options,quoteFunnelOverrides:{missing:{funnelId:"f",reason:"Confirmed"}}})).toThrow()
})

it("keeps revisions increasing when a linked quotation series collides",()=>{
  const d=fixture();d.Quote.rows.push({...d.Quote.rows[1],Id:"q3",Revision_Number__c:"2"})
  const p=planMigration(d,options),qs=p.records.filter(r=>r.object==="Quote")
  expect(qs.map(r=>r.values.version)).toEqual([1,2,3])
  expect(qs[2].values.revision_of_id).toBe(qs[1].values.id)
})
