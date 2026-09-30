# CRM ingestion version evidence — 29 September 2026

## What to open

- CRM-ingestion-old-vs-latest.xlsx: comparison, individual outcomes/errors, field mappings, omissions, users and version/source evidence.
- csv/v1-failed-source-records/: original failed CSV rows with diagnosis and exact database error/detail appended after original columns (6,298 business records + one user).
- csv/v1-failed-records.csv: compact failed business record index.
- csv/v3-failed-or-quarantined-records.csv: headers only; latest run had zero failures.
- csv/v1-unmapped-field-values.csv and v3-unmapped-field-values.csv: individual populated values with no mapping. Field-level mapping coverage is distinct from record success.
- csv/v3-superseded-records.csv: 861 deliberately superseded opportunity product snapshots.
- csv/v3-field-omissions-and-defaults.csv and v3-value-changes.csv: omissions/defaults and before/after transformation evidence.
- csv/unsupported-records-all-versions.csv: 405,657 rows outside both importers; many are Salesforce configuration/log records.

## Exact scripts, not reconstructed approximations

Each versions/*/source/apps/web/db/import/import.ts is the preserved entry point with its local source dependencies. Each manifest.json contains SHA256 hashes.

- v1-original: commit 8417a7823f33e6b615a00630fddc2d84ad93d6d3. Unchanged original importer. Historical log and fresh replay retained.
- v2-confirmed: commit a958dbf3484760ac92443147ab0cdb7985bca584. Confirmed Sep25 baseline with historical native report and DB verification.
- v3-latest: working-tree snapshot based on HEAD 06768fcc0994d177e6fc27e3794eaad3eba448d7, including the uncommitted converted-lead fix. This is not a committed release/tag.

Package version labels are separate from the native report's formatVersion.

## Counts and scope

The same source hashes were checked against the historical confirmed report and current runs: 1,114 CSVs, 414,209 rows. Business scope is 12 objects / 8,529 rows. User scope is 23 rows, reported separately.

Original: 2,231 business inserts; 6,298 failures. Latest: 7,668 transferred source rows; 861 superseded; zero failed/quarantined/not-attempted. Latest also generated 1,159 replacement product rows, so stored business total is 8,827. Repeating latest created no duplicate inserts.

603 populated object-field pairs within recognized objects: old 134 mapped/used + 469 unmapped; latest 220 mapped/used + 383 unmapped. Mapped/used includes identity, derivation and validation; it does not promise unchanged retention of every value. Review the field notes and value-change ledger.

## Evidence provenance

Only isolated local database copies were written: crm_version_old_20260929 and crm_version_latest_20260929, tenant import-audit. Both cloned the same prepared local audit seed. Existing audit databases and production were not modified by these replay runs. Seeded user memberships remained: latest reused 15, omitted 8; original had 14 eligible members present, one email conflict and 8 filtered. These are not fresh user-creation counts.

Original Sep25 logs contain shortened/deduplicated errors. Full ERROR/DETAIL text appended to failed rows was recovered from PostgreSQL logs during the Sep29 replay of unchanged original code. Each business error was matched to CSV order and verified using the failed row UUID or expected parent foreign-key UUID. logs/v1-original-replay/postgres-errors.log retains the raw evidence. Do not describe these full messages as captured on Sep25.

Latest verification checked all 943 quotation net/tax/payable totals, business table counts, and converted-lead links: 203 converted leads, 201 account links, 196 contact links, with 3 cross-account contacts intentionally omitted. See logs/database-verification.json.

## Logging and repeatable usage

Install the project's locked dependencies in a compatible crm-v2 checkout first. Set DATABASE_ADMIN_URL securely in your shell to the intended isolated database. Credentials are not bundled. From the extracted package, run:

```bash
python3 tools/run_logged.py \
  --snapshot versions/v3-latest \
  --repo /absolute/path/to/crm-v2 \
  --data '/absolute/path/to/Full Data' \
  --tenant import-audit \
  --out /absolute/path/to/a-new-run-directory
```

Default is dry-run. Add --commit only to persist an explicitly intended run. Use --owner or --quote-funnel-map if the selected migration configuration requires them. Use v1-original in --snapshot to exercise the historical importer; its dry-run is not equivalent to latest SQL validation. Original commit mode can partially persist failures. Never run old and new imports into the same populated target: their ID schemes differ.

The wrapper checks source snapshot hashes, records source file hashes, writes console.log/events.jsonl/run.json and retains any native migration report. Legacy process exit 0 can conceal failed rows; the wrapper returns failure when logged row failures are detected. Native error detail is limited by the original importer. Full historical-replay DB errors additionally came from local PostgreSQL server logs; the generic wrapper does not automatically collect server logs on arbitrary hosts.

Every run needs a new output directory; existing evidence is never overwritten. Snapshot source is unchanged. Dependencies are linked from the installed checkout at runtime and are not bundled. snapshot.py can archive a commit or working tree; build_comparison.py and verify_local.py reproduce this specific audit using its documented workspace/database layout, not arbitrary tenants.

CSV files use UTF-8 with BOM. To prevent Excel treating source strings as formulas, strings beginning with =, +, -, @, tab or newline are prefixed with an apostrophe in exported CSVs. Original source CSVs are unchanged; this export escaping is the only deliberate change to raw source columns in failed-row CSVs. Data and logs contain customer information; keep them within the intended project access scope.

Workbook was generated with @oai/artifact-tool. Its dependency installation is not bundled. tools/build_workbook.mjs accepts the report directory containing comparison-data.json. Source files in tools are the logging, snapshot, comparison and verification implementation for this audit.
