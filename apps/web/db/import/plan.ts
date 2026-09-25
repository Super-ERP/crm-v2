import { projectQuoteProduct } from "../../server/services/quote-sync-projection"
import { createHash } from "node:crypto"
import { MAPPINGS, type Ctx } from "./mapping"
import { computeQuotation } from "../../server/services/quotation-math"
import { assertValidQuotationNumbers } from "../../lib/validation-quotation"
import { formatOpportunityCode } from "../../lib/opportunity-code"
import { formatQuoteRef } from "../../lib/quote-number"
import { allocateProductSubcategoryCode } from "../../server/services/product-taxonomy-seed"
import type { ProductCategory } from "../../app/(app)/settings/constants"

export type Source = Record<string, string>
export type Dataset = Record<string, { headers: string[]; rows: Source[] }>
export type PlannedRecord = {
  object: string; sourceId: string; table: string; values: Record<string, unknown>
  status: "ready" | "quarantined" | "superseded"; issues: string[]; generated?: boolean
}
export type PlanOptions = {
  tenantId: string; entityCode: string; ctx: Omit<Ctx, "detId" | "nextFreeOppNumber">
  taxonomy?: ProductCategory[]
  quoteFunnelOverrides?: Record<string, { funnelId: string; reason: string }>
  numericScales?: Record<string, Record<string, number>>
}
export type MigrationNote = { object: string; sourceId: string; fields: string; technique: string }
export const TECHNIQUES: Record<string, { fields: string[]; targets: string[]; technique: string }[]> = {
  Account: [{ fields: ["Company_Name__c", "Name"], targets: ["name"], technique: "Use Name when present; otherwise resolve Company_Name__c lookup through Company__c.Name. A missing lookup target quarantines the account; never store a Salesforce ID as its name." },
    { fields: ["Type"], targets: ["account_type", "end_user_account_id"], technique: "Preserve reseller type. Infer end user only from one unique different account of quotation contacts; ambiguous/missing end user remains null and is reported." }],
  Product2: [{fields:["Product_Category__c","Product_Subcategory__c"],targets:["product_code","subcategory"],technique:"Normalize category codes and allocate subcategory codes using the application taxonomy helper; retain labels in tenant settings."}],
  Contact: [{ fields: ["Name","FirstName","LastName"], targets:["first_name","last_name"],technique:"Prefer split names when supplied; otherwise keep the entire Name in first_name without guessing name boundaries." },
    {fields:["Phone","Full_Mobile_Number__c","MobilePhone","Title","Contact_Designation__c","Department","Contact_Department__c"],targets:["phone","title","department"],technique:"Choose first nonempty standard field then custom equivalent; full mobile number precedes raw mobile."}],
  Lead:[{fields:["Name","FirstName","LastName","IsConverted","Status"],targets:["name","status"],technique:"Preserve person name. IsConverted overrides lead Status; conversion references are checked independently."}],
  Opportunity_ID__c:[{fields:["Name","Opportunity_Year__c","Opportunity_Number__c"],targets:["code","name","opportunity_year","opportunity_number"],technique:"Allocate duplicate numbers deterministically and generate name/code with formatOpportunityCode. Original identifiers remain in the change ledger."},
    {fields:["Opportunity_Nature__c"],targets:["project_nature_code","project_natures"],technique:"Extract the source parenthesized nature code; normalize code into the tenant nature picklist."},
    {fields:["Opp_Contact__c"],targets:["owner_contact_id","primary_person_id"],technique:"Preserve both the owner-contact role and primary person reference."},
    {fields:["Total_Estimated_Funnel_Amount__c"],targets:["total_estimated_funnel_amount"],technique:"Recompute rollup from child funnel estimates, as the application does; log differences."}],
  Opportunity:[{fields:["Pain__c","Vision__c","Value__c","AccountId","OwnerId","Opportunity__c"],targets:["pain","vision","value","account_id","owner_member_id","project_natures","product_type_code"],technique:"Opportunity container is authoritative for account, owner, PPVVC and project nature. Copy to child funnels and report differing source snapshots."},
    {fields:["SyncedQuoteId","Amount"],targets:["primary_quotation_id","amount"],technique:"Preserve a valid same-funnel synced quotation, otherwise select earliest valid quote. Set both primary flags and sync net amount/currency."},
    {fields:["Point_of_Contact__c","ContactId"],targets:["primary_person_id"],technique:"Prefer custom point-of-contact reference, otherwise standard ContactId; validate referenced person."}],
  Quote:[{fields:["OpportunityId"],targets:["funnel_id"],technique:"Use source funnel ID, or an explicit data-owner-approved missing-parent override. Validate the target and log the decision; child lines retain their original QuoteId and follow automatically."},{fields:["Revision_Number__c","QuoteNumber","Quote_Number__c","Ref_No__c","Quote_Running_Number__c"],targets:["version","quote_number","revision_of_id"],technique:"Sort by source revision, creation time and ID. Preserve positive revisions when greater than the preceding revision; advance collisions and following revisions to keep the chain increasing. Use one globally unique running number per funnel and formatQuoteRef; record old/new references."},
    {fields:["Total_Excluding_Tax__c","Total_Including_Tax__c","Tax_Amount__c","Tax_Percentage__c","Total_Discount__c","Subtotal"],targets:["subtotal","discount_total","header_discount","tax_total","total","tax_rate_snapshot","tax_setting_id"],technique:"Use shared computeQuotation and numeric validator with source line discounts. Negative adjustment lines become header discounts and zero-value descriptive lines. Source net equals CRM subtotal minus header discount; never subtract Total_Discount__c twice. Quarantine if totals differ by more than 0.02."},
    {fields:["Tax_Category__c"],targets:["tax_setting_id"],technique:"Resolve a tax setting by explicit source rate. Category labels are descriptive only; no withholding-tax behavior is invented."},
    {fields:["ContactId"],targets:["attention_contact_id"],technique:"Keep only contacts belonging to the recipient account (including a uniquely resolved reseller end user); otherwise omit this optional link and report it."}],
  QuoteLineItem:[{fields:["Quantity","UnitPrice","Item_Discount__c","Subtotal","Subtotal__c","Discount"],targets:["quantity","unit_price","discount_percent","line_subtotal","line_tax","line_total"],technique:"Absolute Item_Discount__c is authoritative. Compute all line totals and proportional tax using the shared quote calculator; standard Discount and source subtotals are comparison-only."}],
  OpportunityLineItem:[{fields:["OpportunityId","Product2Id","Quantity","UnitPrice","Discount","Item_Discount__c","TotalPrice","Product_Category__c","UOM__c","SortOrder","Description","Description__c"],targets:["opportunity_products"],technique:"For funnels with a valid primary quote, supersede the old snapshot and rebuild products using the same projection as manual quote sync. Otherwise preserve the historical source snapshot. Superseded source fields are not claimed as transferred."}],
  Payment_Milestone__c:[{fields:["Status__c"],targets:["status"],technique:"Invoiced/Billed/Paid map to invoiced. Won/Pending/4A/blank map to won (unbilled planning bucket). 4A/blank normalization is explicitly reported; no finance payment is invented."},
    {fields:["Quote_Name_Lookup__c","Quote_Number__c","Funnels__c"],targets:["quotation_id","funnel_id"],technique:"Resolve exact quote ID/reference/name within the source funnel only when unique. Ambiguous names are omitted; missing funnel IDs are not guessed."}],
}

const required: Record<string, string[]> = {
  Account:["name"],Product2:["name"],Contact:["first_name","account_id"],Lead:["name"],
  Opportunity_ID__c:["account_id","owner_member_id","code","name"],
  Opportunity:["name","account_id","opportunity_id","pipeline_id","current_stage_id","owner_member_id"],
  Quote:["funnel_id","quote_number"],QuoteLineItem:["quotation_id","description"],
  OpportunityLineItem:["funnel_id"],Company__c:["name"],Payment_Milestone__c:["title"],Contract:[],
}
export const references: Record<string, Record<string,string>> = Object.fromEntries(MAPPINGS.map(m=>[m.object,
  Object.fromEntries(Object.values(m.fields).filter(f=>f.xform?.reference).map(f=>[f.col,f.xform!.reference!]))]))
Object.assign(references.Account,{end_user_account_id:"Account"})
Object.assign(references.Opportunity_ID__c,{owner_contact_id:"Contact"})
Object.assign(references.Quote,{revision_of_id:"Quote"})
Object.assign(references.Payment_Milestone__c,{quotation_id:"Quote"})

const number = (v: unknown) => Number(v || 0)
const money = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
/** Decimal half-away-from-zero, matching PostgreSQL numeric storage. */
export function roundNumeric(value: unknown, scale: number): number {
  const match=String(value).match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i)
  if(!match)throw new Error(`Invalid decimal: ${String(value)}`)
  const [,sign,whole,fraction="",exponent="0"]=match
  const shift=scale+Number(exponent)-fraction.length
  let digits=BigInt(whole+fraction)
  if(shift>=0)digits*=BigInt(10)**BigInt(shift)
  else {const divisor=BigInt(10)**BigInt(-shift);digits=digits/divisor+(digits%divisor*BigInt(2)>=divisor?BigInt(1):BigInt(0))}
  return Number(digits)*(sign==="-"?-1:1)/10**scale
}
const positiveInt = (v: unknown) => Math.max(1,Math.trunc(number(v)))
const order = (a: Source,b: Source) => (a.CreatedDate || "").localeCompare(b.CreatedDate || "") || a.Id.localeCompare(b.Id)
const unique = <T>(items: T[]) => [...new Set(items)]
export function migrationId(tenant: string, object: string, sourceId: string): string {
  const bytes = createHash("sha256").update(JSON.stringify(["salesforce-v2", tenant, object, sourceId])).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 80
  bytes[8] = (bytes[8] & 63) | 128
  const hex = bytes.toString("hex")
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
export function planMigration(data: Dataset, options: PlanOptions) {
  const notes: MigrationNote[] = []
  const note = (r: PlannedRecord,fields:string,technique:string) => notes.push({object:r.object,sourceId:r.sourceId,fields,technique})
  const quarantine = (r: PlannedRecord,reason:string) => { r.status="quarantined";if(!r.issues.includes(reason))r.issues.push(reason) }
  const usedNumbers = new Map<number,Set<number>>()
  const ctx: Ctx = { ...options.ctx, detId: (o, id) => migrationId(options.tenantId, o, id), nextFreeOppNumber: (y,n) => {
    const used=usedNumbers.get(y) ?? new Set<number>();usedNumbers.set(y,used)
    let next=positiveInt(n);while(used.has(next))next++;used.add(next);return next
  } }
  const records: PlannedRecord[] = []
  const originals = new Map<string,Source>()
  for (const m of MAPPINGS) for (const row of [...(data[m.object]?.rows ?? [])].sort(order)) {
    const values: Record<string, unknown> = { id: ctx.detId(m.object, row.Id), tenant_id: options.tenantId }
    const planned: PlannedRecord = {object:m.object,sourceId:row.Id,table:m.table,values,status:"ready",issues:[]}
    try {
      for (const [key,f] of Object.entries(m.fields)) if (key in row) values[f.col] = f.xform ? f.xform(row[key],ctx) : row[key] || null
      Object.assign(values, m.defaults?.(row,ctx))
      if(m.fields.OwnerId&&!values.owner_member_id)values.owner_member_id=ctx.resolveOwner(row.OwnerId||"")
      for(const [source,target] of [["CreatedDate","created_at"],["LastModifiedDate","updated_at"]]) if(row[source]) {
        const date=new Date(row[source]);if(Number.isNaN(date.getTime()))throw new Error(`Invalid ${source}`)
        values[target]=date.toISOString()
      }
      if(!row.Id)throw new Error("Missing source Id")
      if(/^(true|1)$/i.test(row.IsDeleted || ""))throw new Error("Deleted source row deliberately excluded")
      for(const [key,value] of Object.entries(values)) if(typeof value==="number"&&!Number.isFinite(value))throw new Error(`Invalid numeric field ${key}`)
    } catch(e) {quarantine(planned,(e as Error).message)}
    originals.set(values.id as string,row)
    records.push(planned)
  }
  const byId=new Map(records.map(r=>[r.values.id as string,r]))
  const group=(object:string)=>records.filter(r=>r.object===object)
  const original=(r:PlannedRecord)=>originals.get(r.values.id as string)!
  const target=(r:PlannedRecord,column:string)=>byId.get(r.values[column] as string)
  const changes: {object:string;sourceId:string;field:string;before:unknown;after:unknown;technique:string}[]=[]
  const change=(r:PlannedRecord,field:string,value:unknown,technique:string)=>{
    if(JSON.stringify(r.values[field])!==JSON.stringify(value))changes.push({object:r.object,sourceId:r.sourceId,field,before:r.values[field]??null,after:value,technique})
    r.values[field]=value
  }

  const companies=new Map((data.Company__c?.rows??[]).map(r=>[r.Id,r]))
  for(const account of group("Account")){
    const row=original(account),lookup=row.Company_Name__c
    if(row.Name||!lookup)continue
    const company=companies.get(lookup)
    if(company?.Name&&!/^(true|1)$/i.test(company.IsDeleted||"")){
      change(account,"name",company.Name,"Resolve Company_Name__c lookup through Company__c.Name")
      note(account,"Company_Name__c",`Resolved company lookup ${lookup} to Company__c.Name`)
    }else if(/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(lookup)){
      change(account,"name",null,"Unresolved company lookup must not be used as account name")
      quarantine(account,"Company_Name__c lookup has no available Company__c.Name")
    }
  }
  for(const [sourceId,override] of Object.entries(options.quoteFunnelOverrides??{})){
    const q=group("Quote").find(r=>r.sourceId===sourceId)
    const f=group("Opportunity").find(r=>r.sourceId===override.funnelId)
    if(!q||!f||!override.reason?.trim())throw new Error(`Invalid approved quotation funnel override: ${sourceId}`)
    if(original(q).OpportunityId&&original(q).OpportunityId!==override.funnelId)throw new Error(`Override conflicts with existing source funnel: ${sourceId}`)
    change(q,"funnel_id",f.values.id,`Approved missing-parent mapping: ${override.reason}`)
    note(q,"OpportunityId",`Approved parent ${override.funnelId}: ${override.reason}; original child QuoteId links follow automatically`)
  }

  const normalizePrecision=()=>{for(const r of records)for(const [field,scale] of Object.entries(options.numericScales?.[r.table]??{})){
    const value=r.values[field];if(value==null)continue
    const rounded=roundNumeric(value,scale)
    if(Number(value)!==rounded)change(r,field,rounded,`Round to target numeric scale ${scale}, matching database storage precision`)
  }}
  normalizePrecision()

  const taxonomy:ProductCategory[]=structuredClone(options.taxonomy ?? [])
  for(const p of group("Product2")) {
    const s=original(p);const code=(s.ProductCode || s.Product_Category__c || "").toUpperCase().replace(/[^A-Z0-9_-]/g,"_")
    if(code) {
      if(!taxonomy.some(c=>c.code===code))taxonomy.push({code,name:s.Product_Category__c || code,subcategories:[]})
      const label=s.Product_Subcategory__c
      const subcode=label?allocateProductSubcategoryCode(taxonomy,code,label):null
      const category=taxonomy.find(c=>c.code===code)!
      if(subcode&&!category.subcategories.some(c=>c.code===subcode))category.subcategories.push({code:subcode,name:label})
      change(p,"product_code",code,"Normalized taxonomy category")
      change(p,"subcategory",subcode,"Application subcategory code allocation; label retained in settings")
    }
    note(p,"standard_price","No single unambiguous standard price selected from multiple price books; catalog price remains default 0. Actual quote prices are preserved.")
  }

  const natures: {code:string;name:string}[]=[]
  for(const r of group("Opportunity_ID__c")) {
    const s=original(r);const code=formatOpportunityCode({organizationCode:options.entityCode,year:number(r.values.opportunity_year),number:number(r.values.opportunity_number)})
    change(r,"code",code,"Application opportunity code generator")
    change(r,"name",code,"Application name equals generated code; original name retained in change ledger")
    const nature=s.Opportunity_Nature__c?.match(/^\(([A-Za-z0-9]+)\)\s*-?\s*(.*)$/)
    if(nature){r.values.project_nature_code=nature[1].toUpperCase();r.values.project_natures=[nature[1].toUpperCase()];natures.push({code:nature[1].toUpperCase(),name:nature[2]||nature[1]})}
    else if(s.Opportunity_Nature__c)note(r,"Opportunity_Nature__c","Unrecognized nature label omitted")
  }
  for(const r of group("Opportunity")) {
    const p=target(r,"opportunity_id")
    if(p)for(const field of ["account_id","owner_member_id","pain","power","vision","value","control","project_natures"])
      change(r,field,p.values[field]??null,"Opportunity container is authoritative; matches manual cascade")
    if(p) {r.values.product_type_code=p.values.project_nature_code??null;r.values.is_renewal=p.values.is_renewal??false}
    // Cross-deal parties are entities, not customer accounts. Do not invent
    // intercompany assignments from source names; keep historical percentages.
    if(original(r).Cross_Deal__c==="true")note(r,"Cross_Deal__c; Cross_Deal_Company__c","Intercompany entity/party model not migrated. Historical recognized percent retained, automation flag remains false.")
  }

  const quoteGroups=new Map<string,PlannedRecord[]>()
  const linesByQuote=new Map<string,PlannedRecord[]>()
  for(const line of group("QuoteLineItem")){const id=line.values.quotation_id as string;const list=linesByQuote.get(id)??[];list.push(line);linesByQuote.set(id,list)}
  for(const quote of group("Quote")) {
    const list=quoteGroups.get(quote.values.funnel_id as string)??[];list.push(quote);quoteGroups.set(quote.values.funnel_id as string,list)
    const s=original(quote),lines=(linesByQuote.get(quote.values.id as string)??[]).sort((a,b)=>number(a.values.sort_order)-number(b.values.sort_order)||a.sourceId.localeCompare(b.sourceId))
    try {
      let headerDiscount=0
      for(const l of lines){
        const net=number(l.values.quantity)*number(l.values.unit_price)-number(l.values.discount_percent)
        if(net<0&&number(l.values.quantity)>=0){
          headerDiscount-=net
          change(l,"unit_price",0,"Move negative adjustment into quotation header discount")
          change(l,"discount_percent",0,"Move negative adjustment into quotation header discount")
          note(l,"UnitPrice; Item_Discount__c","Negative net adjustment transferred to quotation header discount; original description/product retained as a zero-value line. Original amounts remain in change ledger.")
        }
      }
      headerDiscount=money(headerDiscount)
      if(headerDiscount)note(quote,"Total_Discount__c; Total_Excluding_Tax__c",`Converted negative adjustment lines to header discount ${headerDiscount}; shared calculator preserves net, tax and payable total`)
      const input={lines:lines.map(l=>({quantity:number(l.values.quantity),unitPrice:number(l.values.unit_price),discountAmount:number(l.values.discount_percent)})),ratePercent:number(s.Tax_Percentage__c),headerDiscount:String(headerDiscount),taxInclusive:false}
      assertValidQuotationNumbers(input)
      if(input.ratePercent<0||input.ratePercent>100)throw new Error("Invalid tax rate")
      const totals=computeQuotation(input)
      for(const [field,value] of [["Total_Excluding_Tax__c",totals.subtotal-totals.discountTotal],["Tax_Amount__c",totals.taxTotal],["Total_Including_Tax__c",totals.total]] as const)
        if(s[field]&&(!Number.isFinite(Number(s[field]))||Math.abs(Number(s[field])-value)>0.020001))throw new Error(`Quotation reconciliation mismatch: ${field}`)
      Object.assign(quote.values,{subtotal:totals.subtotal,tax_total:totals.taxTotal,total:totals.total,discount_total:totals.discountTotal,header_discount:headerDiscount,tax_inclusive:false,tax_rate_snapshot:input.ratePercent,
        tax_setting_id:ctx.detId("TaxRate",String(input.ratePercent))})
      lines.forEach((l,i)=>Object.assign(l.values,{line_subtotal:totals.lines[i].lineSubtotal,line_tax:totals.lines[i].lineTax,line_total:totals.lines[i].lineTotal,tax_setting_id:quote.values.tax_setting_id}))
    }catch(e){quarantine(quote,(e as Error).message)}
  }
  let nextRunning=Math.max(0,...group("Quote").map(r=>number(original(r).Quote_Running_Number__c)))+1
  const usedRunning=new Set<number>()
  for(const [funnelId,quotes] of [...quoteGroups].sort(([a],[b])=>String(a).localeCompare(String(b)))) {
    quotes.sort((a,b)=>positiveInt(original(a).Revision_Number__c)-positiveInt(original(b).Revision_Number__c)||order(original(a),original(b)))
    let lastVersion=0
    let running=number(original(quotes[0]).Quote_Running_Number__c)
    if(!Number.isSafeInteger(running)||running<=0||usedRunning.has(running))running=nextRunning++
    usedRunning.add(running)
    const firstDate=quotes.map(r=>original(r).CreatedDate).filter(Boolean).sort()[0]??null
    let previous:PlannedRecord|undefined
    for(const q of quotes){
      const version=Math.max(positiveInt(original(q).Revision_Number__c),lastVersion+1)
      lastVersion=version
      change(q,"version",version,"Unique stable increasing revisions; advance collisions and following revisions")
      change(q,"quote_number",formatQuoteRef({running,rev:version,earliestQuoteDate:firstDate}),"One running number per funnel; shared application quote formatter")
      const sourceRef=original(q).Ref_No__c||original(q).Quote_Number__c||original(q).QuoteNumber
      if(sourceRef&&sourceRef!==q.values.quote_number)changes.push({object:q.object,sourceId:q.sourceId,field:"source_display_reference → quote_number",before:sourceRef,after:q.values.quote_number,technique:"Preserve original displayed reference in ledger alongside normalized CRM reference"})
      q.values.revision_of_id=previous?.values.id??null;previous=q
      q.values.is_primary=false
    }
    const funnel=byId.get(funnelId);if(funnel)funnel.values.quote_running_number=running
  }

  // Infer only a unique end user, and only from the actual recipient contacts.
  for(const account of group("Account").filter(r=>r.values.account_type==="reseller")) {
    const candidates=unique(group("Quote").filter(q=>target(q,"funnel_id")?.values.account_id===account.values.id)
      .map(q=>target(q,"attention_contact_id")?.values.account_id).filter((id):id is string=>typeof id==="string"&&id!==account.values.id))
    if(candidates.length===1) {account.values.end_user_account_id=candidates[0];note(account,"Type; Quote.ContactId","End user resolved from one unique different account of linked quotation contacts")}
    else note(account,"Type; end_user_account_id",`Reseller preserved; ${candidates.length} unambiguous recipient candidates. End-user link left unset; needs business resolution before reseller editing.`)
  }
  for(const quote of group("Quote")) {
    const funnel=target(quote,"funnel_id"),account=funnel?target(funnel,"account_id"):undefined,person=target(quote,"attention_contact_id")
    const recipient=account?.values.end_user_account_id??account?.values.id
    if(person&&person.values.account_id!==recipient) {change(quote,"attention_contact_id",null,"Omitted contact outside recipient account, matching manual recipient validation");note(quote,"ContactId","Attention contact omitted: belongs to a different recipient account")}
    if(funnel)quote.values.product_type_code=funnel.values.product_type_code??null
  }
  for(const milestone of group("Payment_Milestone__c")) {
    const s=original(milestone),label=s.Quote_Name_Lookup__c||s.Quote_Number__c
    const candidates=label?group("Quote").filter(q=>q.values.funnel_id===milestone.values.funnel_id&&[q.sourceId,original(q).Name,original(q).Quote_Number__c,original(q).Ref_No__c,original(q).QuoteNumber].includes(label)):[]
    if(candidates.length===1)milestone.values.quotation_id=candidates[0].values.id
    else if(label)note(milestone,"Quote_Name_Lookup__c; Quote_Number__c",`${candidates.length} exact quote candidates within source funnel; optional quote link omitted`)
    if(!milestone.values.funnel_id)note(milestone,"Funnels__c","Source has no funnel; milestone retained as an unlinked historical snapshot")
    if(!s.Status__c||s.Status__c==="4A")note(milestone,"Status__c",`Source '${s.Status__c||"blank"}' normalized to won (unbilled bucket); no invoice/payment created`)
  }

  // Required relationships are a fixed-point validation: reject dependent
  // rows too. Optional links are cleared explicitly rather than swallowed.
  for(const r of records)for(const field of required[r.object]??[])if(r.values[field]==null||r.values[field]==="")quarantine(r,`Missing required ${field}`)
  let changed=true
  while(changed){changed=false;for(const r of records.filter(r=>r.status==="ready"))for(const [col] of Object.entries(references[r.object]??{})){
    const val=r.values[col];if(!val)continue
    if(!byId.has(String(val))||byId.get(String(val))!.status!=="ready")if(required[r.object]?.includes(col)){quarantine(r,`Missing/quarantined parent ${col}`);changed=true}
  }}
  for(const r of records.filter(r=>r.status==="ready"))for(const [col] of Object.entries(references[r.object]??{})){
    const value=r.values[col];if(value&&(!byId.has(String(value))||byId.get(String(value))!.status!=="ready")){
      change(r,col,null,"Optional reference omitted because target is absent/quarantined");note(r,col,"Optional target absent/quarantined; link omitted")
    }
  }
  for(const [funnelId,quotes] of quoteGroups) {
    const f=byId.get(funnelId);if(!f||f.status!=="ready")continue
    const valid=quotes.filter(q=>q.status==="ready")
    const primary=valid.find(q=>q.values.id===f.values.primary_quotation_id)??valid[0]
    if(primary){primary.values.is_primary=true;f.values.primary_quotation_id=primary.values.id;change(f,"amount",money(number(primary.values.subtotal)-number(primary.values.discount_total)),"Primary quote net sync, matching application");change(f,"currency",primary.values.currency||f.values.currency||"MYR","Primary quotation currency is authoritative")}
  }
  for(const p of group("Opportunity_ID__c")) {
    const sum=money(group("Opportunity").filter(f=>f.status==="ready"&&f.values.opportunity_id===p.values.id).reduce((n,f)=>n+number(f.values.estimated_amount),0))
    change(p,"total_estimated_funnel_amount",sum,"Rollup from child funnel estimates")
  }
  for(const f of group("Opportunity").filter(r=>r.status==="ready"&&r.values.primary_quotation_id)){
    for(const old of group("OpportunityLineItem").filter(r=>!r.generated&&r.status==="ready"&&r.values.funnel_id===f.values.id)){
      old.status="superseded"
      old.issues.push("Historical product snapshot superseded by primary quotation, matching manual sync")
      note(old,"OpportunityId; Product2Id; Quantity; UnitPrice; Discount; Item_Discount__c; TotalPrice; Product_Category__c; UOM__c; SortOrder; Description; Description__c",old.issues[0])
    }
    for(const line of (linesByQuote.get(String(f.values.primary_quotation_id))??[]).filter(r=>r.status==="ready")){
      const v=line.values,product=target(line,"product_id")
      const projected=projectQuoteProduct({productId:v.product_id as string??null,description:v.description as string??null,quantity:String(v.quantity),unitPrice:String(v.unit_price),lineTotal:String(v.line_total),uom:v.uom as string??null,productCategory:product?.values.product_code as string??null,sortOrder:number(v.sort_order)},options.tenantId,String(f.values.id))
      const values:Record<string,unknown>={id:ctx.detId("SyncedOpportunityProduct",line.sourceId)}
      for(const [field,value] of Object.entries(projected))values[field.replace(/[A-Z]/g,c=>"_"+c.toLowerCase())]=value
      records.push({object:"OpportunityLineItem",sourceId:"@primary-quote:"+line.sourceId,table:"opportunity_products",values,status:"ready",issues:[],generated:true})
    }
  }
  normalizePrecision()
  const rates=unique(group("Quote").filter(r=>r.status==="ready").map(r=>number(r.values.tax_rate_snapshot)))
  return { records, notes, changes, taxonomy, natures, rates, nextQuoteNumber:Math.max(1,...usedRunning)+1 }
}
