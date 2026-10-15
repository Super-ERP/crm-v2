import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import { createHash, randomUUID } from "node:crypto"
import { parseCsv } from "./csv"
import { migrationId } from "./plan"
import { recoverAccountAddresses } from "./account-address-history"

const { values } = parseArgs({ options: { dir: { type: "string" }, tenant: { type: "string" }, snapshot: { type: "string" }, "report-dir": { type: "string" } } })
if (!values.dir || !values.tenant || !values.snapshot || !values["report-dir"]) throw new Error("Required: --dir --tenant --snapshot --report-dir. Generates a guarded SQL transaction; never applies automatically.")
const tenant = values.tenant
const rawHistory = readFileSync(join(values.dir, "AccountHistory.csv"), "utf8")
const rawAccounts = readFileSync(join(values.dir, "Account.csv"), "utf8")
const sourceAccounts = new Set(parseCsv(rawAccounts).rows.filter(row => !/^(true|1)$/i.test(row.IsDeleted ?? "")).map(row => row.Id))
const hashes = { AccountHistory: createHash("sha256").update(rawHistory).digest("hex"), Account: createHash("sha256").update(rawAccounts).digest("hex") }
const stored = JSON.parse(readFileSync(values.snapshot, "utf8")) as { accounts: { id: string; tenant_id: string; name: string; billing_address: unknown; updated_at: string; deleted_at: string | null }[] }
const recovered = recoverAccountAddresses(parseCsv(rawHistory).rows)
const ready: { account: typeof stored.accounts[number]; address: Record<string, string>; sourceAccountId: string; historyIds: string[] }[] = []
const preserved: { sourceAccountId: string; accountName: string }[] = []
const review = [...recovered.review]
for (const row of recovered.ready) {
  const account = stored.accounts.find(a => a.id === migrationId(tenant, "Account", row.sourceAccountId) && a.tenant_id === tenant && !a.deleted_at)
  if (!account || !sourceAccounts.has(row.sourceAccountId)) { review.push({ sourceAccountId: row.sourceAccountId, reason: "Source or imported account missing/deleted" }); continue }
  const blank = account.billing_address == null || (typeof account.billing_address === "object" && !Array.isArray(account.billing_address) && Object.values(account.billing_address).every(value => value == null || (typeof value === "string" && !value.trim())))
  if (!blank) { preserved.push({ sourceAccountId: row.sourceAccountId, accountName: account.name }); continue }
  ready.push({ account, ...row })
}
const reportDirectory = resolve(values["report-dir"], randomUUID())
const sourceDirectory = resolve(values.dir)
if (reportDirectory.startsWith(sourceDirectory + "/")) throw new Error("Reports must be outside source export")
mkdirSync(reportDirectory, { recursive: true, mode: 0o700 })
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'"
const json = (value: unknown) => value == null ? "NULL::jsonb" : literal(JSON.stringify(value)) + "::jsonb"
const statements = ["BEGIN;", "SET LOCAL lock_timeout = '5s';", "SET LOCAL statement_timeout = '30s';", "CREATE TEMP TABLE address_recovery_counts (n integer) ON COMMIT DROP;"]
for (const row of ready) {
  statements.push(`WITH changed AS (
    UPDATE accounts SET billing_address = ${json(row.address)}, updated_at = now()
    WHERE id = ${literal(row.account.id)}::uuid AND tenant_id = ${literal(tenant)} AND deleted_at IS NULL
      AND billing_address IS NOT DISTINCT FROM ${json(row.account.billing_address)}
      AND updated_at = ${literal(row.account.updated_at)}::text::timestamptz
    RETURNING id
  ), audited AS (
    INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, "before", "after", source, metadata)
    SELECT ${literal(tenant)}, 'account.address_restored', 'account', id::text,
      ${json({ billingAddress: row.account.billing_address })}, ${json({ billingAddress: row.address })}, 'salesforce-address-history-recovery',
      ${json({ sourceAccountId: row.sourceAccountId, historyIds: row.historyIds, sourceHashes: hashes })} FROM changed RETURNING id
  ) INSERT INTO address_recovery_counts SELECT count(*) FROM audited;`)
}
statements.push("DO $$ BEGIN IF EXISTS (SELECT 1 FROM address_recovery_counts WHERE n <> 1) THEN RAISE EXCEPTION 'Account changed since planning; entire address recovery rolled back'; END IF; END $$;", "COMMIT;")
writeFileSync(join(reportDirectory, "restore.sql"), statements.join("\n"), { mode: 0o600 })
writeFileSync(join(reportDirectory, "report.json"), JSON.stringify({ tenant, generatedAt: new Date().toISOString(), sourceHashes: hashes, ready, preserved, review }, null, 2), { mode: 0o600 })
console.log(JSON.stringify({ ready: ready.length, preserved: preserved.length, review: review.length, accounts: ready.map(row => row.account.name), reportDirectory }))
