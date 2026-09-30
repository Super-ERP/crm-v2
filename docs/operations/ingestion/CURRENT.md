# QM production ingestion — 30 September 2026

Status: committed to the existing Quandatics Malaysia (QM) production tenant on 30 September 2026. The source was the unchanged `Full Data` export (all 1,114 source-file hashes matched the reviewed manifest), with the approved two-quotation parent overrides. A full database backup was saved on the server at `/home/internalops/quandatics-client/backup/pre-qm-full-ingestion-20260930-utc.dump` (SHA-256 `721e1ac532f85c7caa34a5384759212d2233a46cbc004df4e461a62403f0c76b`). The rollback dry run and committed run both had zero failed and zero quarantined rows. Quandatics quotation styling remains separate from record ingestion.

## Result in brief

From 8,529 in-scope business source rows: **7,668 transferred, 861 superseded product snapshots, zero quarantined and zero unexpected failures**. The 861 snapshots were replaced by 1,159 funnel product rows derived from primary quotation lines, giving 8,827 stored business rows. The committed report verified all 8,827 rows and 17,081 relationship entries. All 943 quotations and 2,071 quotation lines are present in QM. The two approved quotations have their confirmed funnel and four child lines. Independent live SQL checks found zero orphan quotations or quote lines and zero owner mismatches on contacts, opportunity containers, funnels and contracts. This does not mean all fields in the full export were imported.

## What differs from the original

| Area | Saved rule / difference |
| --- | --- |
| IDs and references | CRM IDs are deterministic tenant-scoped IDs; opportunity/quotation references follow CRM formatting and revision rules. Original references remain in the report ledger. |
| Company and contact names | Account company lookup IDs resolve to company names. Full person names are retained without guessing first/last boundaries. |
| Parent and child links | Two approved ALLIANCE quotes use the saved parent override file; their four child lines follow automatically. They remain non-primary. |
| Product snapshots | Primary quote lines become the authoritative funnel products, using the same projection as manual CRM sync. Old opportunity snapshots are superseded. |
| Financial representation | Unsupported negative lines/excess discounts become header discounts with zero-value descriptive lines. Decimal precision follows CRM storage. Individual line allocation can differ even when quote totals match. |
| Product code and price | No ProductCode column exists in this export. Codes derive from category; category/subcategory labels are retained. All 161 catalog standard prices remain zero because multiple price books cannot be chosen safely. Actual quote prices are retained. |
| Users and optional links | Duplicate emails share membership; inactive/system users are omitted. Unavailable owners use the reported fallback. Incompatible attention contacts and ambiguous optional relationships are omitted and logged. No passwords are imported. |
| Account ownership | The account owner is authoritative for its contacts, opportunity containers, funnels and contracts. The source had 16, 32, 33 and 1 owner differences respectively; the import aligned them and recorded each change in the ledger. Quotations inherit access through their funnel. |
| Converted lead links | All 201 source ConvertedAccountId links resolve to imported accounts. Of 199 source ConvertedContactId links, 196 contacts belong to the converted account; 3 cross-account links are omitted and reported. Two converted leads have no source account ID and four have no source contact ID, so those links stay blank. No duplicate accounts or contacts are created. |
| Historical statuses | Converted lead status follows IsConverted; blank/4A milestone status becomes won/unbilled planning. No invoices, payments, or historical automation are executed. |
| Unsupported content | 1,101 unsupported objects / 405,657 rows are omitted. Unsupported fields are inventoried, not treated as insert failures. Source CSVs stay unchanged. |
| Organization settings | Company branding/profile, pipeline, default tax and other settings are not a complete Salesforce settings migration. Imported quote tax rates are preserved. Six industry labels on 152 accounts still need matching picklist options. |

The QM run created eight active user memberships, reused one existing membership, and omitted 14 inactive, system, or unneeded source users. The importer verifies existing deterministic rows rather than merging arbitrary later edits. The older local review reports predate the final owner alignment and should not be used as the production result.

## Reproduce consistently

Use the same unchanged Full Data export, a freshly seeded target tenant, the approved overrides in this directory, and the importer documented in [the runbook](../../../apps/web/db/import/README.md). Default mode performs the database run then rolls back; use `--commit` only for the intended target. Never point this at production by default. Keep database credentials outside Git.

```sh
# From apps/web; set DATABASE_ADMIN_URL for the intended local target first.
pnpm db:import --dir='/absolute/path/to/Full Data' --tenant=remap-audit --quote-funnel-map=../../docs/operations/ingestion/approved-quote-funnels.json --report-dir=/absolute/path/to/new-report
```

The confirmed local database is `crm_confirmed_final`, tenant `remap-audit`. These are local review identifiers, not required production settings. The approved override file is export-specific, not a default for every future customer.

Production evidence retained outside Git: `outputs/qm-production-ingestion-20260930/{dry-run,committed}/migration-report.json`. Historical local evidence remains at `import-audit-20260925/confirmed-{dryrun,commit,repeat}/migration-report.json`, `confirmed-database-verification.json`, and `outputs/crm-confirmed-migration-20260925/CRM-confirmed-migration-results.xlsx`. Reports contain full field-level omissions, transformations, and verification outcomes.

Quotation template implementation and sample-data differences are recorded separately in [the Quandatics template review](../quotation-template-follow-up.md). Template changes must not rewrite imported amounts, references, parents, or product mappings merely to resemble a sample PDF.
