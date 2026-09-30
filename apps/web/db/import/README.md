# Salesforce migration and reconciliation

Saved baseline: [short differences and reproducible settings](../../../../docs/operations/ingestion/CURRENT.md). Quotation template work is tracked separately and is not part of this importer.

This importer plans the export, validates relationships, executes SQL in one transaction, and reads every planned field back before allowing a commit. The default is a **real database dry run followed by rollback**. It does not run Salesforce automations or create historical payments, notifications, or passwords.

## Authoritative logic

`mapping.ts` owns direct source-to-target mappings and aliases. `plan.ts` owns normalization, dependency checks, and the `TECHNIQUES` registry used in the report. `runner.ts` writes the same plan and generates `migration-report.json`. Do not maintain an independent Excel mapping or a second import script. Rebuild the workbook from that report after each rehearsal.

Shared application functions are used for opportunity codes, quotation references, quotation validation/calculation, product taxonomy, and primary-quotation product projection (`quote-sync-projection.ts`). A funnel inherits its account, owner, PPVVC, and project nature from its opportunity container. Its primary quotation sets both sides of the primary link, its net amount, and its currency. Opportunity estimated amounts roll up from child funnels.

## Run safely

Use a freshly seeded migration tenant/database for the first run. This is an import and reconciliation tool, not a general merge engine for an existing populated CRM. It does not match business records by company name. The new tenant-scoped IDs differ from the earlier importer: never run both importers into the same target and expect deduplication.

From `apps/web`, with `DATABASE_ADMIN_URL` set explicitly to the intended database:

```bash
pnpm db:import --dir=/absolute/path/to/export --tenant=existing-tenant --report-dir=/absolute/path/to/dry-run-report
```

The tenant must already have settings, a default pipeline/stages, an active default owner, and the target role. The default new-member role is `Rep`. Override with `--user-role=RoleName`. Specify `--owner=member-id` to avoid relying on the oldest active member. Optionally use `--owner-map=/path/owners.json` with a JSON object of Salesforce user IDs to existing target-tenant member IDs.

After reviewing the report, a commit uses the same command with `--commit` and a new report directory. Repeating identical input and settings reuses deterministic IDs and verifies stored values. Existing business rows are not overwritten; changed existing values fail readback and roll back the entire transaction. Do not edit imported records between idempotence checks. Source CSVs are never rewritten; reports must be outside the source directory.

Exit codes: `0` means no quarantined or unexpected failures; `2` means some source records were deliberately quarantined (a `--commit` can still have committed the other rows); `1` means an unexpected error or verification failure. Always read `committed`, `rolledBack`, and the report counts rather than interpreting a nonzero exit as an automatic rollback. An unexpected SQL error aborts the entire transaction, without per-row savepoints. A dry run reports verified inserts attempted inside the rolled-back transaction, not persisted rows.

For explicitly approved missing quotation parents, add `--quote-funnel-map=/absolute/path/approved-quote-funnels.json`. This file maps source quotation IDs to source funnel IDs and records the approval reason:

```json
{
  "source-quotation-id": {
    "funnelId": "source-funnel-id",
    "reason": "Confirmed by the data owner"
  }
}
```

The target quotation and funnel must exist in the export. Conflicting existing source links are rejected. The file is recorded with its SHA-256 and contents in the report. Children retain their original QuoteId; no separate child overrides are needed. Normal funnel-wide quotation reference/revision rules still apply, so attaching another quotation series may normalize its displayed reference. Old/new references remain in the ledger. Approval to attach quotations does not make them the primary quote; existing primary selection rules remain in force.

## Preservation and normalization rules

| Source condition | Technique and preservation limit |
| --- | --- |
| Account Name absent | Resolve Company_Name__c through Company__c.Name. The custom field is a lookup ID in this export, not a display name. Unresolved lookup IDs quarantine the account; no ID is stored as its name. |
| Contact/lead split names absent | Preserve the full Name without guessing first/last boundaries; use custom designation, department, and full mobile aliases when standard values are absent. |
| Converted lead | IsConverted overrides Status. Map ConvertedAccountId and ConvertedContactId to the actual imported Account and Contact with stable source IDs. Keep the contact only when its AccountId matches the lead's ConvertedAccountId; otherwise preserve the account link, omit the incompatible optional contact link, and record the reason. Missing source links stay blank; do not create duplicate accounts or contacts. |
| Active user with retained owned records | Import only active Standard users who own a non-deleted Account, Contact, Lead, Opportunity, Funnel, Quote, Contract, or Payment Milestone source record. Normalize email and reuse one tenant membership; preserve existing permissions. New members receive the explicit role. Active users with no such record and inactive/system users are omitted; owner fallback is reported where needed. A rerun does not revoke memberships created by an earlier import. No passwords or verified-email claim imported. |
| Legacy opportunity/quote identifiers | Use shared CRM formatters and deterministic increasing revision allocation. Original and replacement identifiers remain in the change ledger. |
| Source financial decimals exceed storage scale | Round before quote calculation to the actual target column scale, using decimal half-away-from-zero like PostgreSQL. Record each changed value. All quote totals must reconcile within 0.02 currency units. |
| Line discount already included in source subtotal | Keep absolute Item_Discount__c; do not subtract Total_Discount__c a second time. CRM net is subtotal minus header discount. |
| Negative discount line or discount exceeding line value | Move the negative net into supported header discount; retain product and description on a zero-value line. Preserve source net/tax/payable total within reconciliation tolerance. Original monetary values remain in the ledger. Shared CRM math allocates header discount/tax across lines, so historical line totals can change. |
| Tax | Preserve source rate, create/reuse a matching tax setting, and calculate line/header totals using the shared helper. Never infer withholding treatment from a label. |
| Primary quotation product sync | Supersede source OpportunityLineItem snapshots for funnels with a valid primary quote; generate product rows from that quote using the same helper as manual sync. Report superseded source rows separately from generated rows. Retain source product snapshots only where there is no valid primary quote. |
| Reseller end user | Infer only from one unique different account of linked quote contacts. Ambiguous/missing relationships stay null and are reported; such accounts need business resolution before manual reseller editing. |
| Quote attention contact | Retain only when the contact belongs to the recipient account. Omit and report an incompatible optional link. |
| Milestone quote text | Match an exact ID/reference/name within its funnel only if unique. Do not fuzzy-match ambiguous revision names. Preserve an unlinked historical milestone if the source lacks a funnel. |
| Milestone status 4A/blank | Normalize to the CRM won/unbilled planning bucket; report this explicitly. No invoice or payment is created. |
| Cross-deal source names | Do not invent intercompany entities/parties. Historical recognized percent can remain; intercompany automation flag stays false. |
| Multiple price books | No arbitrary catalog standard price is selected; default remains zero and is reported. Actual quote prices are retained. Price-book objects are omitted. |
| Missing required parent | Quarantine the row and recursively quarantine dependent rows. Never invent a parent. |
| Unsupported field/object | Deliberately omit it and list it in the full field/object inventory, including populated-row counts. Original export stays available. Omitted fields are not SQL failures. |

## Report meanings

- `summary`: source rows partitioned into inserted, existing, superseded, quarantined, failed, and notAttempted. These categories sum to sourceRows. Generated replacement products are excluded from source totals.
- `generatedRecords`: new CRM rows derived from primary quote lines, with their own readback status. Their IDs begin from a separate deterministic namespace.
- `outcomes`: every source business record plus generated rows, source IDs, failure reasons, and readback verification. An inserted row is persisted only when `committed=true`.
- `fields`: every object/field pair from every CSV, including empty and unsupported objects. “Mapped/used” includes validation and derivation; it does not mean every source scalar is copied unchanged. `verifiedRecordRows` counts nonempty source values on verified records, not guaranteed exact-value retention. Use `fieldExceptionRows`, `exceptions`, `changes`, and superseded record outcomes to see omissions and normalization.
- `exceptions`: optional links omitted, deliberate defaults, historical exceptions, and superseded snapshots by source ID and field.
- `changes`: before/after target values and the applied technique. Original files plus SHA-256 inventory provide provenance for unchanged, omitted, or transformed values.
- `relationships`: planned nonnull object links verified by readback. Owners are separately reconciled through users and ownerFallbacks.
- `inventory`, `codeHashes`: source counts/hashes and the implementation/helper hashes used for the run.

## September 2026 rehearsal

Base: latest merged PR #220, commit `8417a7823f33e6b615a00630fddc2d84ad93d6d3`, plus this migration branch. Full Data contains 1,114 CSVs, 414,209 rows, and 18,292 object/field pairs. The migration scope is 8,529 business rows in 12 objects plus 23 User rows; 1,101 unsupported objects contain 405,657 rows and are deliberately omitted.

The earlier rehearsal transferred 7,662 source rows and left two quotations/four child lines quarantined. It also incorrectly treated Company_Name__c lookup IDs as account names. Its successful-insert counts were not evidence of correct account names; that report is superseded by the corrected rehearsal.

The data owner confirmed that source quotations `0Q0Mg000003GIwvKAG` (Q100211-02) and `0Q0Mg000003NVfhKAG` (Q100211-03), both ALLIANCE_PTVA SCOPE, belong to source funnel `006Mg00000D4TwoIAF` (2025 ALLIANCE - PTVA). The approved map fills their missing OpportunityId; all four child lines retain their existing quotation references. All 318 account company lookups resolve to Company__c.Name.

Quotations keep increasing revision numbers after series are combined; collisions advance the affected revision and following revisions. Original Ref_No__c / Quote_Number__c displayed references are recorded alongside target references in the change ledger.

The corrected committed rehearsal transferred **7,668 source business records**, superseded **861** historical product snapshots with **1,159** generated products, and had **zero quarantined rows and zero unexpected failures**. Independent checks verified all 943 source quotation net/tax/total amounts exactly, all 318 resolved account names, the two approved parent links, all four child links, and increasing revision chains. The full test suite passed 673 tests (61 skipped); TypeScript and scoped ESLint passed.

| Original displayed quote reference | Corrected CRM reference | Confirmed source funnel |
| --- | --- | --- |
| Q100211-02 | Q25-0044-3 | 006Mg00000D4TwoIAF |
| Q100211-03 | Q25-0044-4 | 006Mg00000D4TwoIAF |

The repeat commit verified all 8,827 existing business rows and inserted zero duplicates.

Both linked quotations are non-primary; approval to attach them did not replace the existing primary quotation.

The corrected rehearsal results and independent checks are recorded in the updated workbook and `confirmed-*/migration-report.json` evidence directories. The previous rehearsal database is retained separately for comparison. Original exports and production are unchanged.

The local startup module-resolution error is fixed: development builds and loads the control-protocol JavaScript output before starting Next.js. The local review organization was activated (seed defaults had suspended it). Authenticated HTTP checks now render the dashboard, products, accounts, confirmed funnel, both quotations, product taxonomy, and tax settings. A connected browser was unavailable, so interactive browser parity remains unverified. This is not a claim of full UI or automation equivalence. Historical finance/payment execution, audit actors/history, and unsupported Salesforce features remain outside this migration.

## Local review and settings coverage

The local review server runs at http://localhost:3300 against `crm_confirmed_final`, using the RLS-enforced app role and local demo administrator. Production is unchanged. Run `pnpm dev --hostname 127.0.0.1 --port 3300` from `apps/web` with explicit local database/auth environment variables to restart it; dev now builds the shared control-protocol package first. Rebuild/restart after editing that shared package. If accessing from another machine, forward port 3300 through the existing SSH connection.

- Product list: 161 source names/category labels/subcategory labels independently matched; 7 category groups and 32 dependent subcategory choices. There is no source ProductCode header: CRM product codes are derived from Product_Category__c, not copied SKU codes. Subcategory identifiers are normalized; original display labels remain.
- Currencies: MYR, USD, BND. Quotation tax settings: imported 0%, 6%, 8%, 10%; original quotes use their respective rates.
- Still seeded/unselected: DEMO entity code, default VAT 5%, zero catalog standard prices (161 products), pipeline configuration, branding/company profile, country list, and several picklists. Five project-nature codes match the source normalization but the organization configuration is not a full Salesforce settings migration.
- Industry mismatch: six preserved source labels on 152 accounts are absent from the current organization picklist: Others (77), Financial_Services (42), Property_&_Construction (15), Transportation_&_Logistics (10), Agriculture_&_Plantation (5), Energy_&_Utilities (3). No source values were dropped; reconcile these options before relying on editing/reporting consistency.
- The installation displays a preview entitlement notice because no valid entitlement bundle is installed locally. No licensing/security bypass was introduced.
