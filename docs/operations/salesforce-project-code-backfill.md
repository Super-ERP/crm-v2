# Salesforce deal project code recovery

Salesforce `Opportunity` records are CRM funnels. `Project_Code__c` maps to `funnels.project_code`; `Project_Code_For_Cross_Deal__c` maps independently to `funnels.cross_deal_project_code`. Only surrounding whitespace is removed. These central pipeline fields remain available when the Projects module is disabled. Container `opportunities.project_code` is an internal delivery code generated at first 4A entry and is never changed by this recovery. Do not collapse codes onto containers: one container can have several distinct deal codes.

Deploy migration `0099_funnel_project_codes` before live recovery. Use the original Salesforce export and exact tenant ID. Reports contain private source identifiers and before/after values, and must stay outside the export and repository. The CLI creates private report directories and files, records SHA-256 source hashes, and defaults to dry run.

```sh
pnpm --filter web exec tsx db/import/backfill-salesforce-project-codes.ts \
  --dir /private/salesforce-export --tenant TENANT_ID --report-dir /private/recovery-reports
```

Supply `DATABASE_ADMIN_URL` or `DATABASE_URL` through the approved secret mechanism. Do not print credentials. Review `sourceCount`, `ready`, `review`, and `alreadyCaptured`, then inspect the private JSON. Every source ID must match `migrationId(tenant, 'Opportunity', sourceId)` and the deterministic source parent. Missing, deleted, wrong-tenant, duplicate or conflicting records require review; names and code formats are never identity evidence. Nonempty different target values are preserved.

For an offline dry run, add `--snapshot /private/snapshot.json`. Snapshot shape is `{ "funnels": [...] }`, with `id`, `tenant_id`, `opportunity_id`, `deleted_at`, exact text `updated_at`, `project_code`, and `cross_deal_project_code`. Before migration, a read-only snapshot may extract missing columns through `to_jsonb(f)->>'project_code'` and `to_jsonb(f)->>'cross_deal_project_code'`. Offline snapshots cannot be applied.

After the concrete plan is reviewed and deployment is verified, rerun against the live database with `--apply`. All rows and their audits commit in one transaction. Any review row blocks application. Updates check the exact before values, timestamp, tenant, source parent, soft deletion and an active same-tenant container; a concurrent change rolls everything back. The committed marker is written only after the transaction succeeds. Preserve both the plan and marker with recovery evidence.

Rerun dry run after application: expect zero ready/review rows and all source rows already captured. Confirm container internal codes and unrelated funnel fields remain unchanged. For rollback, use the private before images with equivalent tenant, timestamp and current-after-value guards in a reviewed transaction; never execute an unconditional restore.
