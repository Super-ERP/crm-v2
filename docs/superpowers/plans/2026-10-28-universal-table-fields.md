# Universal Table Fields Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution, authorised by the user.

**Goal:** Consistent configurable fields, filters, layouts and exports in every registered CRM table panel.

**Architecture:** Extend the existing catalogue with explicit optional fields and typed options. Share safe server field expressions between filtering, sorting and page enrichment; render optional columns and export through the common DataTable.

**Tech Stack:** TypeScript, React 19, Next.js 16, TanStack Table, Drizzle/PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-universal-table-fields-design.md`

## Status

Implementation, fresh whole-change review, browser checks and final validation complete. Results and limits are recorded below.

## Global constraints

- Preserve tenant/owner/module guards and existing saved field IDs.
- No arbitrary SQL/joins or client-page-derived server option lists.
- Exports use the same authorised loader and query as the list.
- Read local Next.js server/client directive documentation before code changes.

## Review focus

- Missing related records and project-only invoiced milestones must remain visible with blank related fields.
- Fields displayed as names must filter/export with the same semantics.
- New hidden fields must not break persisted layouts or shared views.
- Multi-page exports must fail visibly rather than silently deliver a partial result.
- Related queries must correlate tenant and parent identity without multiplying rows.

## Tasks

### Task 1 Shared metadata and panel controls

Files: `lib/table-controls/{registry,types,field-types,fields}.ts`, `components/data-table.tsx`, `components/table-controls/advanced-filter-editor.tsx`.

- [x] Define explicit per-dataset optional field metadata, typed options and generic display values.
- [x] Test optional fields, typed formatting and existing catalogue rejection/layout compatibility.
- [x] Resolve catalogue capability from adapters, not a duplicated table-name allowlist; expose a universal filter button.
- [x] Build hidden optional columns using approved data fields while retaining custom existing cells.

### Task 2 Complete-result export

Files: `lib/table-controls/export.ts`, `components/data-table.tsx`, tests.

- [x] Test CSV quoting/formula safety, dates, labels, currency and multi-page export failures.
- [x] Implement `collectTableExport` using the captured existing query and authorised loader; enforce explicit row bounds and count-change errors.
- [x] Add CSV export to all table panels; disable incomplete capped datasets with explanatory copy.

### Task 3 Server related fields and choices

Files: `server/services/table-controls/{dataset-fields,record-filter}.ts`, `_shared/table-preference-actions.ts`, core `lib/api-readers.ts`, operational list actions, `lib/record-list-query.ts`.

- [x] Define safe root/relationship expressions and `enrichTableRows` for supported root datasets.
- [x] Use those same expressions before pagination/counting for filters and sorting; enrich only already-authorised row IDs.
- [x] Provide entity stage choices and dataset status options, with stale-response protection on entity changes.
- [x] Audit every adapter; keep complete-client semantics and explicitly non-filterable action cells.
- [x] Test the milestone stage/status example, blank relationships, and SQL/metadata coverage.

### Task 4 Verification and documentation

- [x] Run focused Vitest suites, typecheck and lint on modified code; use database tests when configured.
- [x] Review whole diff for permission regressions, unavailable fields and saved-view compatibility.
- [x] Document the available fields, all-panel coverage and how users create/export a view; update this plan with evidence and limitations.

## Validation evidence

- `pnpm --filter web exec vitest run`: **119 passed files, 921 passed tests**; 23 database/environment-dependent files and 86 tests skipped in the ordinary suite.
- Disposable PostgreSQL: `table-core-adapters-db` plus `table-panel-field-coverage`: 2/2 passed; `table-filter-parity-db` plus `table-preferences-db`: 2/2 passed. The core adapter test compiles every optional root expression against actual schema and exercises milestone stage/status, ownership and historical project-only rows.
- Final review regressions (`api-readers.module`, `table-export`, `table-related-fields`): 22/22 passed after observing each new defect test fail.
- `pnpm --filter web run typecheck`: passed. ESLint on all changed/new TypeScript files: passed without warnings. `git diff --check`: passed.
- Browser on local disposable seeded database: original Payment Milestone five columns and Account nine columns preserved; optional columns unchecked; selected stage displays a name; entity-configured 4a/Won filter matches; downloaded CSV inspected; related Contacts Primary filter works. Existing saved personal layout restored on reload.
- Fresh read-only whole-change review completed; lead-stage CSV projection, stable export identity checks and funnel relationship sort labels fixed with regressions. No deferred review findings.

## Limits

No production deployment or production database changes. Configuration covers explicitly registered business fields; new captured data/relationships still require adapter registration. CSV exports are bounded at 100,000 rows and detect common changing-result errors, not transaction snapshots. Deprecated legacy invoice fields remain excluded from the live CRM catalogue.
