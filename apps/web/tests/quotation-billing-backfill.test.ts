import { describe, expect, it } from "vitest"
import { planBillingBackfill, type BillingDatabaseSnapshot } from "@/db/import/billing-backfill-plan"
import { migrationId, type Dataset } from "@/db/import/plan"
const tenant = "tenant-1"
const id = (object: string, source: string) => migrationId(tenant, object, source)
const data: Dataset = {
  Account: { headers: [], rows: [{ Id: "end", Name: "MCMC" }, { Id: "bill", Name: "Uniti" }] },
  Contact: { headers: [], rows: [{ Id: "person", AccountId: "bill" }] },
  Quote: { headers: [], rows: [{ Id: "quote", AccountId: "end", ContactId: "person", Bill_To_Name__c: "Uniti" }] },
}
function snapshot(): BillingDatabaseSnapshot {
  return {
    accounts: [{ id: id("Account", "bill"), tenant_id: tenant, name: "Uniti", code: null, phone: null, billing_address: { line1: "Saved address" }, deleted_at: null }],
    persons: [{ id: id("Contact", "person"), tenant_id: tenant, account_id: id("Account", "bill"), first_name: "Billing", last_name: "Contact", email: null, phone: null, deleted_at: null }],
    quotations: [{ id: id("Quote", "quote"), tenant_id: tenant, funnel_id: "funnel", quote_number: "Q123-1", attention_contact_id: null, updated_at: "2026-10-01T00:00:00Z", deleted_at: null }],
  }
}
describe("billing recovery plan", () => {
  it("recovers source links using deterministic IDs and captures before images", () => {
    const result = planBillingBackfill(data, tenant, snapshot())
    expect(result.review).toEqual([])
    expect(result.ready).toEqual([expect.objectContaining({ quoteNumber: "Q123-1", before: { billToAccountId: null, attentionContactId: null, billingSnapshot: null },
      after: { billToAccountId: id("Account", "bill"), attentionContactId: id("Contact", "person"), billingSnapshot: { account: { name: "Uniti", code: null, phone: null, address: { line1: "Saved address" } }, contact: { name: "Billing Contact", email: null, phone: null } } } })])
  })
  it("is idempotent and preserves manually populated billing data", () => {
    const db = snapshot()
    const first = planBillingBackfill(data, tenant, db)
    const after = first.ready[0].after
    Object.assign(db.quotations[0], { bill_to_account_id: after.billToAccountId, attention_contact_id: after.attentionContactId, billing_snapshot: after.billingSnapshot })
    expect(planBillingBackfill(data, tenant, db)).toMatchObject({ ready: [], review: [], alreadyCaptured: 1 })
    db.quotations[0].bill_to_account_id = "manual"
    expect(planBillingBackfill(data, tenant, db).ready).toEqual([])
    expect(planBillingBackfill(data, tenant, db).review).toHaveLength(1)
  })
  it("rejects missing, cross-tenant, deleted, or reassigned contacts and edited quotation contacts", () => {
    for (const mutate of [
      (db: BillingDatabaseSnapshot) => { db.persons = [] },
      (db: BillingDatabaseSnapshot) => { db.persons[0].tenant_id = "other" },
      (db: BillingDatabaseSnapshot) => { db.persons[0].deleted_at = "2026-10-01" },
      (db: BillingDatabaseSnapshot) => { db.persons[0].account_id = "another" },
      (db: BillingDatabaseSnapshot) => { db.quotations[0].attention_contact_id = "manual" },
      (db: BillingDatabaseSnapshot) => { db.accounts[0].tenant_id = "other" },
    ]) {
      const db = snapshot(); mutate(db)
      expect(planBillingBackfill(data, tenant, db)).toMatchObject({ ready: [], review: [expect.anything()] })
    }
  })
})
