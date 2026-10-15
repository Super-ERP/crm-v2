import "dotenv/config"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, join } from "node:path"
import { parseArgs } from "node:util"
import { createHash, randomUUID } from "node:crypto"
import postgres from "postgres"
import { parseCsv } from "./csv"
import { planBillingBackfill, type BillingDatabaseSnapshot } from "./billing-backfill-plan"
import type { Dataset } from "./plan"

async function main() {
  const { values } = parseArgs({ options: { dir: { type: "string" }, tenant: { type: "string" }, "report-dir": { type: "string" }, snapshot: { type: "string" }, apply: { type: "boolean", default: false } } })
  if (!values.dir || !values.tenant || !values["report-dir"]) throw new Error("Required: --dir <Salesforce export> --tenant <tenant ID> --report-dir <private output directory>")
  if (values.apply && values.snapshot) throw new Error("Offline snapshots are read-only; --apply requires a live database")
  const tenantId = values.tenant
  const data: Dataset = {}
  const hashes: Record<string, string> = {}
  for (const name of ["Account", "Company__c", "Contact", "Quote"]) {
    const raw = readFileSync(join(values.dir, `${name}.csv`), "utf8")
    data[name] = parseCsv(raw)
    hashes[name] = createHash("sha256").update(raw).digest("hex")
  }
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL
  if (!values.snapshot && !url) throw new Error("Live mode requires DATABASE_ADMIN_URL or DATABASE_URL")
  const sql = values.snapshot ? null : postgres(url!, { max: 1 })
  try {
    const stored: BillingDatabaseSnapshot = values.snapshot ? JSON.parse(readFileSync(values.snapshot, "utf8")) : {
      accounts: await sql!`select * from accounts where tenant_id = ${tenantId}`,
      persons: await sql!`select * from persons where tenant_id = ${tenantId}`,
      quotations: await sql!`select *, updated_at::text as updated_at from quotations where tenant_id = ${tenantId}`,
    } as BillingDatabaseSnapshot
    const plan = planBillingBackfill(data, tenantId, stored)
    const reportDirectory = resolve(values["report-dir"], `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`)
    const sourceDirectory = resolve(values.dir)
    if (reportDirectory === sourceDirectory || reportDirectory.startsWith(sourceDirectory + "/")) throw new Error("Report directory must be outside source export")
    mkdirSync(reportDirectory, { recursive: true, mode: 0o700 })
    const report = { generatedAt: new Date().toISOString(), sourceHashes: hashes, mode: values.apply ? "apply" : "dry-run", ...plan }
    // Persist before images before the transaction; private report includes billing details.
    writeFileSync(join(reportDirectory, "quotation-billing-backfill.json"), JSON.stringify(report, null, 2), { mode: 0o600 })
    if (values.apply) {
      await sql!.begin(async tx => {
        for (const row of plan.ready) {
          const updated = await tx`update quotations set bill_to_account_id = ${row.after.billToAccountId},
            attention_contact_id = ${row.after.attentionContactId}, billing_snapshot = ${tx.json(row.after.billingSnapshot)}, updated_at = now()
            where id = ${row.quoteId} and tenant_id = ${tenantId} and deleted_at is null
              and updated_at = ${row.updatedAt}::text::timestamptz and bill_to_account_id is null and billing_snapshot is null
              and attention_contact_id is not distinct from ${row.before.attentionContactId}::uuid
              and exists (select 1 from accounts a where a.id = ${row.after.billToAccountId} and a.tenant_id = ${tenantId} and a.deleted_at is null)
              and (${row.after.attentionContactId}::uuid is null or exists (select 1 from persons p
                where p.id = ${row.after.attentionContactId} and p.account_id = ${row.after.billToAccountId} and p.tenant_id = ${tenantId} and p.deleted_at is null)) returning id`
          if (updated.length !== 1) throw new Error(`Quotation changed since planning: ${row.quoteNumber}; entire transaction rolled back`)
          await tx`insert into audit_log (tenant_id, action, entity_type, entity_id, "before", "after", source, metadata)
            values (${tenantId}, 'quotation.billing_backfilled', 'quotation', ${row.quoteId},
              ${tx.json(row.before)}, ${tx.json(row.after)}, 'salesforce-billing-backfill',
              ${tx.json({ sourceQuoteId: row.sourceQuoteId, sourceHashes: hashes })})`
        }
      })
      writeFileSync(join(reportDirectory, "committed.json"), JSON.stringify({ committedAt: new Date().toISOString(), count: plan.ready.length }), { mode: 0o600 })
    }
    console.log(JSON.stringify({ mode: report.mode, ready: plan.ready.length, review: plan.review.length, alreadyCaptured: plan.alreadyCaptured, reportDirectory }))
  } finally { await sql?.end() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
