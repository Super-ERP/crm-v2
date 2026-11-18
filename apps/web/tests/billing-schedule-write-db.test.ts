import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { describe, it, expect, vi } from "vitest"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "@/db/schema"
vi.mock("server-only", () => ({}))
import { saveBillingSchedule, assertBillingScheduleForFunnel } from "@/server/services/billing-schedule"
const databaseUrl = process.env.TEST_DATABASE_ADMIN_URL
describe.skipIf(!databaseUrl)("billing schedule writes", () => {
 it("repeat saves omit primary keys and locked history accepts only forecast dates", async () => {
  const client = postgres(databaseUrl!,{max:1})
  const namespace = `billing_write_${randomUUID().replaceAll("-","")}`
  const funnelId=randomUUID(), quoteId=randomUUID(), lineId=randomUUID()
  try {
   await client.unsafe(`CREATE SCHEMA "${namespace}"`)
   await client.unsafe(`SET search_path TO "${namespace}"`)
   await client.unsafe(`
    CREATE TABLE funnels(id uuid PRIMARY KEY, tenant_id text, primary_quotation_id uuid, deleted_at timestamptz);
    CREATE TABLE quotations(id uuid PRIMARY KEY, tenant_id text, funnel_id uuid, status text, subtotal numeric, discount_total numeric, deleted_at timestamptz);
    CREATE TABLE quotation_line_items(id uuid PRIMARY KEY, quotation_id uuid, description text, line_subtotal numeric);
    CREATE TABLE finance_docs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),milestone_id uuid,tenant_id text);
    CREATE TABLE payment_milestones(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text, project_id uuid, funnel_id uuid, quotation_id uuid, quotation_line_item_id uuid, title text, description text, name text, amount numeric, due_date date, status text DEFAULT 'pending_invoicing', sort_order integer, split_percentage numeric, invoice_number text, invoice_date date, expected_invoice_month text, expected_invoice_year integer, so_number text, product_category text, product_subcategory text, is_default boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz);
   `)
   await client`INSERT INTO funnels VALUES (${funnelId},'tenant',${quoteId},null)`
   await client`INSERT INTO quotations VALUES (${quoteId},'tenant',${funnelId},'sent',100,0,null)`
   await client`INSERT INTO quotation_line_items VALUES (${lineId},${quoteId},'Delivery',100)`
   await client.unsafe("ALTER TABLE funnels ADD COLUMN amount numeric, ADD COLUMN updated_at timestamptz; ALTER TABLE quotations ADD COLUMN is_primary boolean DEFAULT true")
   await client`UPDATE funnels SET primary_quotation_id=null WHERE id=${funnelId}`
   const repairDb=drizzle(client,{schema})
   const repairRow={title:"Delivery",amount:"100.00",expectedInvoiceMonth:"January",expectedInvoiceYear:2027,quotationLineItemId:lineId}
   await expect(repairDb.transaction(tx=>saveBillingSchedule(tx,{funnelId,quotationId:quoteId,rows:[repairRow]}))).rejects.toThrow("Select this quotation as primary")
   const repair=readFileSync(new URL("../db/migrations/0107_reconcile_primary_quotation.sql",import.meta.url),"utf8")
   await client.unsafe(repair)
   const [reconciledPrimary]=await client`SELECT primary_quotation_id,amount,updated_at FROM funnels WHERE id=${funnelId}`
   expect(reconciledPrimary).toMatchObject({primary_quotation_id:quoteId,amount:"100"})
   await client.unsafe(repair)
   expect((await client`SELECT updated_at FROM funnels WHERE id=${funnelId}`)[0].updated_at).toEqual(reconciledPrimary.updated_at)
   const db=drizzle(client,{schema})
   const row={title:"Delivery",amount:"100.00",expectedInvoiceMonth:"January",expectedInvoiceYear:2027,quotationLineItemId:lineId}
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[row]}))
   const [first]=await client`SELECT * FROM payment_milestones WHERE deleted_at IS NULL`
   await client`UPDATE payment_milestones SET description='Keep these remarks',due_date='2027-01-31' WHERE id=${first.id}`
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:first.id,status:"invoiced",deletedAt:new Date()} as typeof row]}))
   const [second]=await client`SELECT * FROM payment_milestones WHERE deleted_at IS NULL`
   expect(second.id).toBe(first.id)
   expect(second.description).toBe('Keep these remarks')
   expect(String(second.due_date)).toContain('2027-01-31')
   expect((await client`SELECT count(*)::int AS count FROM payment_milestones`)[0].count).toBe(1)
   expect(second.status).toBe("pending_invoicing")
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,description:'Updated plan remarks',dueDate:'2027-02-01'}]}))
   expect((await client`SELECT description,due_date::text FROM payment_milestones WHERE id=${second.id}`)[0]).toMatchObject({description:'Updated plan remarks',due_date:'2027-02-01'})
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,description:null,dueDate:null}]}))
   expect((await client`SELECT description,due_date FROM payment_milestones WHERE id=${second.id}`)[0]).toMatchObject({description:null,due_date:null})
   await client`UPDATE payment_milestones SET status='invoiced', expected_invoice_month=null, expected_invoice_year=null WHERE id=${second.id}`
   await client`INSERT INTO finance_docs(milestone_id,tenant_id) VALUES (${second.id},'tenant')`
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,expectedInvoiceMonth:"March"}]}))
   const [repaired]=await client`SELECT * FROM payment_milestones WHERE id=${second.id}`
   expect(repaired).toMatchObject({id:second.id,status:"invoiced",amount:"100.00",quotation_id:quoteId,quotation_line_item_id:lineId,expected_invoice_month:"March",expected_invoice_year:2027,deleted_at:null})
   await expect(db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,amount:"99"}]}))).rejects.toThrow("must equal")
   await expect(db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,description:'Rewrite locked remarks'}]}))).rejects.toThrow('only allow')
   await expect(db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,title:"Changed financial row"}]}))).rejects.toThrow("only allow")
   await expect(db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[row]}))).rejects.toThrow("existing rows")
   await client`UPDATE payment_milestones SET status='pending_invoicing' WHERE id=${second.id}`
   await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,expectedInvoiceMonth:"April"}]}))
   const [pendingLinked]=await client`SELECT status,amount,quotation_line_item_id,expected_invoice_month FROM payment_milestones WHERE id=${second.id}`
   expect(pendingLinked).toMatchObject({status:"pending_invoicing",amount:"100.00",quotation_line_item_id:lineId,expected_invoice_month:"April"})
   for (const oldQuotationId of [null, randomUUID()]) {
    const oldLineId = randomUUID()
    await client`UPDATE payment_milestones SET quotation_id=${oldQuotationId}, quotation_line_item_id=${oldLineId}, expected_invoice_month=null, expected_invoice_year=null WHERE id=${second.id}`
    await db.transaction(tx=>saveBillingSchedule(tx,{funnelId,rows:[{...row,id:second.id,quotationLineItemId:oldLineId,expectedInvoiceMonth:"May"}]}))
    await db.transaction(tx=>assertBillingScheduleForFunnel(tx,funnelId))
    const [retained] = await client`SELECT quotation_id,quotation_line_item_id,status,amount,expected_invoice_month FROM payment_milestones WHERE id=${second.id}`
    expect(retained).toMatchObject({quotation_id:oldQuotationId,quotation_line_item_id:oldLineId,status:"pending_invoicing",amount:"100.00",expected_invoice_month:"May"})
   }
   await client`DELETE FROM finance_docs WHERE milestone_id=${second.id}`
   await expect(db.transaction(tx=>assertBillingScheduleForFunnel(tx,funnelId))).rejects.toThrow("current primary")
   expect((await client`SELECT count(*)::int n FROM payment_milestones WHERE deleted_at IS NULL`)[0].n).toBe(1)
  } finally {await client.unsafe("SET search_path TO public");await client.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);await client.end()}
 })
})
