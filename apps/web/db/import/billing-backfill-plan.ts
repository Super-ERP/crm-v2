import { migrationId, type Dataset } from "./plan"
import { resolveSourceBillTo } from "./quotation-billing"
import type { QuotationBillingSnapshot } from "../../lib/quotation-billing"

export type BillingDatabaseSnapshot = {
  accounts: { id: string; tenant_id: string; name: string; code: string | null; phone: string | null; billing_address: QuotationBillingSnapshot["account"]["address"]; deleted_at: string | null }[]
  persons: { id: string; tenant_id: string; account_id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; deleted_at: string | null }[]
  quotations: { id: string; tenant_id: string; funnel_id: string; quote_number: string; bill_to_account_id?: string | null; billing_snapshot?: QuotationBillingSnapshot | null; attention_contact_id: string | null; updated_at: string; deleted_at: string | null }[]
}

export function planBillingBackfill(data: Dataset, tenantId: string, stored: BillingDatabaseSnapshot) {
  const sourceAccounts = new Map(data.Account.rows.map(account => [account.Id, account]))
  const companies = new Map((data.Company__c?.rows ?? []).map(company => [company.Id, company.Name]))
  const sourceContacts = new Map((data.Contact?.rows ?? []).map(contact => [contact.Id, contact]))
  const accounts = data.Account.rows.map(account => ({ id: account.Id, name: account.Name || companies.get(account.Company_Name__c) || "" }))
  const ready: { sourceQuoteId: string; quoteId: string; quoteNumber: string; updatedAt: string; before: { billToAccountId: string | null; attentionContactId: string | null; billingSnapshot: QuotationBillingSnapshot | null }; after: { billToAccountId: string; attentionContactId: string | null; billingSnapshot: QuotationBillingSnapshot } }[] = []
  const review: { sourceQuoteId: string; reason: string }[] = []
  let alreadyCaptured = 0
  for (const source of data.Quote.rows) {
    const sourceAccount = sourceAccounts.get(source.AccountId)
    const sourceAccountName = sourceAccount?.Name || companies.get(sourceAccount?.Company_Name__c ?? "") || ""
    if (!source.Bill_To_Name__c?.trim() || source.Bill_To_Name__c.trim().toLowerCase() === sourceAccountName.trim().toLowerCase()) continue
    const sourceContact = sourceContacts.get(source.ContactId)
    const resolved = resolveSourceBillTo({ billToName: source.Bill_To_Name__c,
      contactAccountId: sourceContact?.AccountId || null, endUserAccountId: source.AccountId || null, accounts })
    const fail = (reason: string) => review.push({ sourceQuoteId: source.Id, reason })
    if (!resolved.accountId) { fail(resolved.issue ?? "Unresolved Bill To"); continue }
    const quote = stored.quotations.find(q => q.id === migrationId(tenantId, "Quote", source.Id) && q.tenant_id === tenantId && !q.deleted_at)
    const account = stored.accounts.find(a => a.id === migrationId(tenantId, "Account", resolved.accountId!) && a.tenant_id === tenantId && !a.deleted_at)
    if (!quote || !account) { fail("Imported quotation or billing account missing/deleted"); continue }
    const person = source.ContactId ? stored.persons.find(p => p.id === migrationId(tenantId, "Contact", source.ContactId) && p.tenant_id === tenantId && !p.deleted_at) : null
    if (source.ContactId && (!person || person.account_id !== account.id)) { fail("Imported contact missing/deleted or belongs to another billing account"); continue }
    if (quote.bill_to_account_id) {
      if (quote.bill_to_account_id === account.id && quote.billing_snapshot && quote.attention_contact_id === (person?.id ?? null)) alreadyCaptured++
      else fail("Quotation already has billing data; preserve existing values")
      continue
    }
    if (quote.billing_snapshot || (quote.attention_contact_id && quote.attention_contact_id !== person?.id)) { fail("Quotation has manually populated billing/contact data; review required"); continue }
    ready.push({ sourceQuoteId: source.Id, quoteId: quote.id, quoteNumber: quote.quote_number, updatedAt: quote.updated_at,
      before: { billToAccountId: quote.bill_to_account_id ?? null, attentionContactId: quote.attention_contact_id, billingSnapshot: quote.billing_snapshot ?? null },
      after: { billToAccountId: account.id, attentionContactId: person?.id ?? null, billingSnapshot: {
        account: { name: account.name, code: account.code, phone: account.phone, address: account.billing_address },
        contact: person ? { name: [person.first_name, person.last_name].filter(Boolean).join(" "), email: person.email, phone: person.phone } : null,
      } },
    })
  }
  return { tenantId, ready, review, alreadyCaptured }
}
