# Salesforce quotation Bill To recovery

## Verified source and production findings (2026-10-15)

The Salesforce export contains 943 quotations. In 158 quotations the explicit
`Quote.Bill_To_Name__c` differs from `Quote.AccountId`'s account name. All 158
Bill To names agree with the quote contact's Salesforce account. The source
quote/opportunity account identifies the end user; the billing account identifies
the intermediary. Some billing accounts are classified Customer, Prospect or
blank in Salesforce, so account type must not determine historical billing.

With the existing approved missing-funnel overrides, the updated billing import
planner resolves billing data for all 943 source quotations without billing
conflicts.

A read-only production snapshot and the recovery planner matched all 158 to
existing imported quotation, account and contact IDs: **158 ready, 0 review**.
No production data was changed by this audit. The private report contains before
images and the proposed billing snapshots; do not commit it or the source CSVs.

The subset whose billing accounts have source Type Reseller spans 37 distinct
reseller/end-user pairs across 67 quotes; eight resellers serve multiple end
users. A single `accounts.end_user_account_id` cannot represent this relationship.
Quotation `bill_to_account_id` plus the existing Funnel account represents each
transaction's relationship, supporting both directions without inferring account
ownership or changing source account types.

## Application behavior

Migration 0097 adds nullable `bill_to_account_id` and `billing_snapshot` fields.
Existing quotations retain legacy rendering until deliberately recovered or edited
as Draft. New quotation creation stores an explicit billing account, defaulting
to the Funnel account, and a saved account/contact snapshot. PDF document readers
use the billing snapshot. Draft edits can change Bill To; Attention must belong
to it. Copies/revisions preserve billing data in a new Draft.

Account and contact reads share reseller master data within the tenant. Related
sales transactions keep owner/team scope. Edits/deletes retain their existing
owner permission checks. Resellers no longer require one default end user.

This change does not change Funnel ownership, quotation numbering, totals,
approvals, currencies, or payment milestone eligibility.

## Recovery procedure

Deploy migration 0097 and the matching application version before applying data.
Use the exact original export, outside the repository. Run from `apps/web` with
`DATABASE_ADMIN_URL` set through the deployment's normal secret mechanism:

```sh
pnpm exec tsx db/import/backfill-quotation-billing.ts \
  --dir /secure/salesforce-export \
  --tenant TENANT_ID \
  --report-dir /secure/billing-recovery/dry-run
```

Review the ready/review counts and before/after images. For an offline audit,
`--snapshot /secure/database-snapshot.json` accepts arrays named `accounts`,
`persons`, and `quotations` with database column names. Offline mode cannot apply.

Apply against a fresh live read after deploying:

```sh
pnpm exec tsx db/import/backfill-quotation-billing.ts \
  --dir /secure/salesforce-export \
  --tenant TENANT_ID \
  --report-dir /secure/billing-recovery/apply \
  --apply
```

Each run writes a unique private subdirectory within `--report-dir`, preserving
previous before-image reports when rerun. The tool defaults to dry-run. Apply updates only the three billing fields and
`updated_at`, records source hashes and an audit event per quotation, and commits
all ready rows in one transaction. It refuses to overwrite existing billing
snapshots or conflicting manually selected contacts. Deleted/missing/cross-tenant
parents and unresolved source matches go to review. An intervening quote change
rolls back the entire transaction. Exact timestamp comparison preserves
PostgreSQL microseconds. A rerun recognizes completed records without rewriting
history. Keep the before-image report for any deliberate reversal.

Source account billing addresses are absent from this export; recovery snapshots
use the currently stored CRM billing address. This does not recover missing
addresses. Do not claim the current address was the original Salesforce address.

The full Salesforce importer now uses the same explicit Bill To matching policy.
Unresolved or conflicting explicit billing names quarantine the quote for review
rather than silently addressing it to an unrelated company. Do not rerun a full
import against production to perform this focused recovery.

## Address restoration from field history (2026-10-15)

Salesforce is the sole historical source. Although the working and archived
`Account.csv` and `Company__c.csv` omit address columns, **AccountHistory.csv
contains recoverable BillingStreet/City/State/PostalCode/Country changes**. The
earlier audit overlooked field history; the conclusion that the export had no
recoverable addresses was incorrect.

Recovery uses the latest timestamp per account and address field. Conflicting
NewValues at the same timestamp require review; Salesforce record IDs are not
used to guess event order. Cleared values are not resurrected. A street is
required; country/city alone is insufficient. Existing nonempty CRM addresses
are preserved in full, including manually entered values. Deterministic imported
account IDs and tenant checks prevent name-based matching mistakes.

**Completed in production:** 8 accounts restored, 8 audit events recorded, and
all other accounts verified unchanged:

- Dell Global Business Center
- Petronas Lubricants International
- Fraser & Neave (Malaya)
- Alliance Bank Malaysia
- Eco-Shop Marketing
- Lumut Maritime Terminal
- TT Dotcom
- Malaysia Aviation Group

The private before/after reports and guarded SQL are retained outside Git.
Restoration changed only billing_address and updated_at; no application release
or new database migration was required. Quotation Bill To migration/backfill
remains a separate pending release operation.

**Still unresolved:** six accounts have conflicting latest street changes at
the same timestamp: Universiti Teknologi MARA, Quandatics Omnitech, Opensoft,
PR1MA, TARC Education Foundation, and Mesiniaga. Isianpadu has only a country
change. Bridgenet and IGS have no address values in the available field history.
TM/MOHR still need an authoritative Salesforce address record. Existing Zurich
addresses were preserved. This is partial restoration, not recovery of every
missing address.

For another export/snapshot, prepare a dry-run report and SQL transaction from
`apps/web`:

```sh
pnpm exec tsx db/import/prepare-account-address-recovery.ts \
  --dir /secure/salesforce-export \
  --tenant TENANT_ID \
  --snapshot /secure/accounts-snapshot.json \
  --report-dir /secure/address-recovery
```

The snapshot contains an `accounts` array with id, tenant_id, name,
billing_address, exact updated_at, and deleted_at. The tool only prepares SQL;
it never executes it. Review the report before running restore.sql with
`psql -v ON_ERROR_STOP=1` through the deployment's administrative connection.
The transaction compares both prior address and exact timestamp, audits each
update, and rolls back all updates if any account changed since planning.

The normal Salesforce import now applies the same field-history fallback when
explicit source address columns are absent. Existing imported production rows
must use the focused recovery instead of rerunning the full import.

## Follow-up address audit (2026-10-16)

See [the complete re-audit](account-address-audit-20261016.md). One whitespace-only history conflict was safely resolved and Quandatics Omnitech restored, bringing the total recovered to nine accounts. Five substantive street conflicts and the country-only case remain. The imported entity still has 292 completely blank addresses because the available Account export omits billing-address columns. A fresh authoritative address export is required to complete restoration.
