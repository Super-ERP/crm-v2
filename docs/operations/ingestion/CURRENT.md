# Saved ingestion baseline — 25 September 2026

Status: confirmed local rehearsal; production unchanged. Quotation template work is separate and deferred. Keep this baseline unless a new data-mapping change is explicitly required.

## Result in brief

From 8,529 in-scope business source rows: **7,668 transferred, 861 superseded product snapshots, zero quarantined and zero unexpected failures**. The 861 snapshots were replaced by 1,159 products derived from primary quotation lines, giving 8,827 stored business rows. Repeating the import created zero duplicates. All 943 quotation net/tax/payable totals matched the source exactly in this rehearsal. This does not mean all fields in the full export were imported.

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
| Historical statuses | Converted leads are normalized; blank/4A milestone status becomes won/unbilled planning. No invoices, payments, or historical automation are executed. |
| Unsupported content | 1,101 unsupported objects / 405,657 rows are omitted. Unsupported fields are inventoried, not treated as insert failures. Source CSVs stay unchanged. |
| Organization settings | Company branding/profile, pipeline, default tax and other settings are not a complete Salesforce settings migration. Imported quote tax rates are preserved. Six industry labels on 152 accounts still need matching picklist options. |

## Reproduce consistently

Use the same unchanged Full Data export, a freshly seeded target tenant, the approved overrides in this directory, and the importer documented in [the runbook](../../../apps/web/db/import/README.md). Default mode performs the database run then rolls back; use `--commit` only for the intended target. Never point this at production by default. Keep database credentials outside Git.

```sh
# From apps/web; set DATABASE_ADMIN_URL for the intended local target first.
pnpm db:import --dir='/absolute/path/to/Full Data' --tenant=remap-audit --quote-funnel-map=../../docs/operations/ingestion/approved-quote-funnels.json --report-dir=/absolute/path/to/new-report
```

The confirmed local database is `crm_confirmed_final`, tenant `remap-audit`. These are local review identifiers, not required production settings. The approved override file is export-specific, not a default for every future customer.

Evidence retained outside Git in the workspace: `import-audit-20260925/confirmed-{dryrun,commit,repeat}/migration-report.json`, `confirmed-database-verification.json`, and `outputs/crm-confirmed-migration-20260925/CRM-confirmed-migration-results.xlsx`. The manifest alongside this document records file hashes to identify the saved evidence without committing customer datasets. Reports contain full field-level omissions, transformations, and verification outcomes.

Quotation template requirements are recorded separately in [the deferred template brief](../quotation-template-follow-up.md). Template changes must not rewrite imported amounts, references, parents, or product mappings merely to resemble a sample PDF.
