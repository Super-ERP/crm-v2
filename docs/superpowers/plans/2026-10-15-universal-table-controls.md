# Universal CRM Table Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects that method. Implement and verify each task before proceeding.

**Goal:** Give every CRM record list nested filters and personal column layouts, fully included in Saved Views.

**Architecture:** Use one validated field/filter contract for UI, client evaluation and server adapters. Keep SQL mappings server-only and compose user predicates beneath existing access/business predicates. Extend Saved Views compatibly and store personal layouts separately; migrate all table adapters against a checked coverage manifest.

**Tech Stack:** Next.js App Router, React, TanStack Table, existing CRM UI components, TypeScript/Zod, Drizzle/PostgreSQL, Vitest and the T3 collaborative browser.

**Spec:** `docs/superpowers/specs/2026-10-15-universal-table-controls-design.md` (approved).

## Global Constraints

- Nested groups: maximum depth 5, 50 conditions, 100 selected values per condition, 32 KiB serialized tree.
- Column widths: 48–800 px with field-specific minimum/default widths; retain an identifying column and fixed required action columns.
- At most five sort fields, followed by a stable record-ID tie-breaker.
- Business timezone: deployment `TZ`, UTC fallback; preserve date-only values and Funnel expected-close-year filtering.
- Tenant, own/team, module, soft-deletion and 4A/Won rules remain mandatory outer predicates.
- Preserve existing saved views, URL state, Funnel name-only free-text search, money/currency semantics and licensed write guards.
- Every record/list table is in scope; quotation documents and editable line-entry grids are recorded exemptions.
- Read relevant installed Next.js docs and repository instructions before modifying code. Use an isolated feature worktree. No production data mutation or automatic release is part of implementation.

## Review Focus

1. Adversarial OR groups and related fields must never reveal another owner's/tenant's records (Tasks 2, 5–7).
2. A filter/sort matching rows beyond the first 25 must produce the right full count and page (Tasks 5–7).
3. A stale/revoked saved-view filter must fail visibly rather than be silently removed (Tasks 2–4).
4. Zero, false, null, literal wildcard characters, date boundaries and currencies must match between JS and SQL (Tasks 2, 5).
5. Applying saved layouts or fetched rows must not produce refresh loops, hydration overwrites or cross-user preference writes (Tasks 3–4, 8).

## File and interface map

New shared contracts live in `apps/web/lib/table-controls/`: `types.ts`, `filter-tree.ts`, `evaluate.ts`, `layout.ts`, `state.ts` and `registry.ts`. Public table definitions contain stable IDs and field descriptors; each domain supplies its own explicit value accessor and server adapter.

New server functions live in `apps/web/server/services/table-controls/`: `compile.ts`, `preferences.ts` and domain adapter modules. New UI lives in `apps/web/components/table-controls/`: `advanced-filter-editor.tsx`, `column-controls.tsx` and `use-table-preferences.ts`. Integrate through existing `components/data-table.tsx`, `components/saved-view-menu.tsx`, `lib/saved-views.ts`, `lib/data-table-saved-views.ts`, `lib/table-pagination.ts` and `lib/record-list-query.ts`.

Concrete shared types:

- `FilterCondition = { kind: 'condition'; id: string; fieldId: string; operator: string; value?: unknown }`.
- `FilterGroup = { kind: 'group'; id: string; logic: 'and' | 'or'; children: FilterNode[] }`; `FilterNode = FilterCondition | FilterGroup`.
- `TableLayout = { visibility: Record<string, boolean>; order: string[]; widths: Record<string, number>; pinning: { left: string[]; right: string[] } }`.
- `TableStateV2 = { version: 2; filterTree: FilterGroup; layout: TableLayout }`.
- `TableFieldDefinition` contains ID/label/type/operators/availability/sort/default-layout metadata and a client value accessor. `SqlTableField` binds an approved field to SQL expressions or a scoped predicate compiler.
- `ValidatedTableQuery` contains a validated tree, bounded paging, up to five sorts, search and timezone context. It never contains client-provided SQL.

## Task 1: Checked field/table coverage

**Files:** Create `apps/web/lib/table-controls/types.ts`, `registry.ts`, `docs/operations/universal-table-coverage.md`, `apps/web/tests/table-controls-coverage.test.ts`; extend `tests/data-table-call-sites.test.ts`.

- [ ] Write a failing inventory test requiring every shared table call site and every concrete dynamic list key to resolve to a registered definition or explicit document/editor exemption; assert the missing set is empty.
- [ ] Inventory field accessors and server/client data sources from all call sites. Record per table: list key, source file, loader, field descriptors, complete versus truncated relationship scope and adapter completion.
- [ ] Define the public interfaces above; reject duplicate IDs and impossible metadata combinations. Register descriptors from actual columns, not guessed data types or database-wide fields.
- [ ] Run `pnpm --filter web exec vitest run tests/table-controls-coverage.test.ts tests/data-table-call-sites.test.ts`; require no unregistered sites or duplicate keys.
- [ ] Commit the contracts and checked manifest.

Coverage seeds: `leads`, `accounts`, `persons`, `opportunities`, `funnel`, `quotations`, `products`, `projects`, `payment-milestones`, `sales-orders`, `finance-${direction}`, `intercompany-inbound`, `forecast`, `audit`, `team-members`, `settings-api-keys`, `settings-tax-rates`, `settings-funnel-stages`, `project-codes`, `project-code-funnels`, `account-project-codes`, `person-project-codes`, `code-opportunities`, `code-quotations`, `code-accounts`, `code-contacts`, `code-projects`, `account-contacts`, `account-opportunities`, `account-pipelines`, `account-projects`, `account-quotations`, `account-children`, `person-pipelines`, `person-projects`, `opp-funnels`, `opp-quotations`, `opp-products`, `product-usage`, `product-deals`, `funnel-quotes`, `funnel-products`, `funnel-projects`, `funnel-costs`, `funnel-contract`, `so-milestones`, `so-finance-docs`; also inventory approval inbox record lists outside these shared call sites. Dynamic keys are separate preference scopes, not duplicate table instances.

## Task 2: Validated filter engine and compatibility reader

**Files:** Create `lib/table-controls/filter-tree.ts`, `evaluate.ts`, `state.ts`, `server/services/table-controls/compile.ts`, `tests/table-filter-tree.test.ts`, `tests/table-filter-parity-db.test.ts`; modify `lib/data-table-filters.ts`, `lib/table-pagination.ts`, `lib/record-list-query.ts`.

**Interfaces:** `validateFilterTree(input: unknown, fields: readonly TableFieldDefinition[]): FilterValidationResult`; `evaluateFilterTree(row: unknown, tree: FilterGroup, fields: readonly TableFieldDefinition[], context: FilterContext): boolean`; `compileFilterTree(tree: FilterGroup, fields: SqlFieldRegistry, context: FilterContext): SQL`; `readLegacyTableState(input: unknown): TableStateV2`.

- [ ] Write failing tests for nested AND/OR truth tables, depth 6, condition 51, value 101, 32 KiB overflow, unknown fields/operators, null/empty/zero/false, inverted ranges, leap dates, year boundaries and literal `%_\\'` inputs.
- [ ] Implement spec operators with identical JS/SQL semantics. Monetary values carry a currency on mixed-currency lists. Scope relationship predicates and validate every operand; never interpolate SQL identifiers from requests.
- [ ] Extend the query contract to carry the validated tree and all five sorts, retaining legacy quick filters as an AND translation. New invalid requests return a visible validation failure rather than silently dropping conditions.
- [ ] Implement namespaced/versioned URL compatibility and explicit state precedence. Legacy flat saved filters retain their meaning. Stale filter fields return a view-needs-update result.
- [ ] Run tree/parity tests against disposable PostgreSQL with adversarial OR and money/date fixtures; require identical matching IDs and zero scope leaks.
- [ ] Commit the engine and compatibility layer.

## Task 3: Saved Views and personal layout storage

**Files:** Modify `db/schema/saved-views.ts`, `db/schema/index.ts`, `db/sql/rls.sql`, `lib/saved-views.ts`, `lib/data-table-saved-views.ts`, `app/(app)/_shared/saved-view-actions.ts`, `components/saved-view-menu.tsx`; create `db/schema/table-preferences.ts`, next unused additive migration/journal entry, `server/services/table-controls/preferences.ts`, `app/(app)/_shared/table-preference-actions.ts`, `tests/table-preferences-db.test.ts`; extend existing saved-view tests.

**Interfaces:** Optional `SavedViewPayload.tableState: TableStateV2`; `readTablePreferences(listKey: string): Promise<TableLayout | null>` and `saveTablePreferences(listKey: string, layout: TableLayout): Promise<ActionResult<void>>` authenticate, bind tenant/member and validate list/fields on the server.

- [ ] Write failing tests: legacy view loads unchanged; create/update/duplicate/default preserve tree/order/widths/pins; two users/tenants/list keys cannot read or overwrite each other; removed filter fields fail visibly; read-only licensing denies persistence while reads remain available.
- [ ] Add nullable/default-compatible `saved_views.table_state` JSON and a unique tenant/member/list-key preferences table. Register RLS and owner checks. Recheck migration numbering against main before creating the migration.
- [ ] Extend repository reads/writes/duplication and validation to round-trip the entire optional state; keep old columns and old request shapes readable. Named views include filters, sorting, visibility, order, widths, pinning and page size.
- [ ] Add preference actions using existing `runAction` and write-access guards, bounded payloads and registered-list permissions. Do not change commercial policy.
- [ ] Run saved-view and PostgreSQL preference tests, including migration reruns/legacy rows; commit.

## Task 4: Universal column controls

**Files:** Create `lib/table-controls/layout.ts`, `components/table-controls/column-controls.tsx`, `use-table-preferences.ts`, `tests/table-layout.test.ts`; modify `components/data-table.tsx`, `components/saved-view-menu.tsx`, `lib/data-table-saved-views.ts` and shared coverage tests.

**Interfaces:** `normalizeTableLayout(input: unknown, fields: readonly TableFieldDefinition[]): TableLayout`; the DataTable accepts a registered definition and owns column order/sizing/pinning/visibility state. Preference saves and named-view saves consume the same normalized layout.

- [ ] Write failing layout tests for duplicate/unknown order IDs, width 47/801, duplicate left/right pins, hidden required identity fields, restore/reset and version-one payloads.
- [ ] Implement TanStack order/sizing/pinning state and a shared Columns editor with labeled show/hide, move up/down, left/right/unpin and width controls. Keep pointer resizing and keyboard controls accessible.
- [ ] Apply the precedence rules before persistence starts; debounce saves and suppress writes during hydration/view application. Surface unsaved preference errors. Reset layout must not clear filters.
- [ ] Preserve usable center width on narrow screens without persisting temporary pin suspension. Restore desktop preferences on wider viewports.
- [ ] Run layout/saved-view tests and a keyboard/pointer browser pass; commit when state survives navigation without a refresh/save loop.

## Task 5: Core CRM server adapters

**Files:** Modify `lib/api-readers.ts`; `app/(app)/{leads,accounts,persons,opportunities,funnel,quotations,products}/actions.ts`; create domain SQL registries under `server/services/table-controls/`; extend resource reader tests and `tests/table-filter-parity-db.test.ts`.

- [ ] Write failing integration cases where only rows after row 25 match text/date/number conditions; assert returned IDs, total and stable multi-sort order before LIMIT/OFFSET.
- [ ] Register actual typed columns from the core tables. Compile trees in row and count queries beneath existing tenant/owner/module/business predicates. Apply aggregate filters at their correct query level and avoid duplicate rows from relationship joins.
- [ ] Preserve Funnel name-only free-text search, expected-close-year quick filters and distinct Project Code identities. Test nested `(4A OR Won) AND close-year` plus cross-owner and cross-tenant OR attempts.
- [ ] Use explicit currency conditions for mixed-currency amount filters, and test that changing display columns does not affect filtering or record access.
- [ ] Run resource/unit/PostgreSQL suites and mark these adapters complete in the manifest; commit.

## Task 6: Optional-module, operational and Project Code adapters

**Files:** Modify actions in `app/(app)/{projects,payment-milestones,sales-orders,billing,intercompany,audit,project-codes}/`, `server/services/project-codes.ts`, `_shared/project-code-actions.ts`, and Forecast/Team/Settings loaders identified by Task 1. Add corresponding SQL registries and adapter tests.

- [ ] Write failing full-result tests for each registered loader, with an AND/OR condition and a match beyond the first page. Include module-disabled requests and payment/project-code eligibility fixtures.
- [ ] Integrate the same compiler/sorts/count contract into these loaders. Keep finance direction, intercompany party scope, approvals routing and Project Code 4A/Won gates as mandatory outer predicates.
- [ ] Register typed fields for complete client-side operational datasets; bounded datasets must use server filtering. Keep audit/settings/team controls within existing permissions.
- [ ] Run adapter suites, including module-denial and Project Code tests; mark completed adapters and commit.

## Task 7: Related lists and approval inboxes

**Files:** Modify related-list bodies/actions under Accounts, Contacts, Opportunities, Funnel, Products, Sales Orders, Project Codes and the approval inbox paths discovered in Task 1; add shared scoped related-list readers under `server/services/table-controls/` and integration tests.

- [ ] Write failing tests for a related record outside a parent funnel's first page, revoked parent access, child-owner/parent-owner mismatches and duplicate relationships.
- [ ] Convert truncated related arrays into bounded related-list readers filtering their complete authorized parent relationship dataset. Require parent visibility and retain child ownership/module restrictions independently.
- [ ] Wire every related table and concrete dynamic key to field definitions, stable data inputs and accurate totals; expose no filter the underlying reader cannot apply.
- [ ] Keep approval request type/routing/status predicates outside the user filter tree; verify managers cannot broaden an inbox through OR groups.
- [ ] Run related/approval/access tests and the manifest audit; commit only when these registered scopes no longer filter a partial page silently.

## Task 8: Advanced editor and shared table integration

**Files:** Create `components/table-controls/advanced-filter-editor.tsx`; modify `components/data-table.tsx`, typed quick-filter controls and registered call sites; extend filter/state/saved-view tests.

- [ ] Write tests for draft-versus-applied state, Cancel, invalid Apply, add/remove nested groups, Clear filters, URL/back navigation and stale-view errors.
- [ ] Build one editor using existing form/popover/dialog primitives. Keep quick filters as shortcuts into the same tree. Show active summaries and validation errors with accessible field labels and keyboard focus.
- [ ] Apply each draft atomically, reset page zero and fetch once. Keep server-owned rows separate from stable initial props; cancel/discard obsolete requests and synchronize related data without refresh loops.
- [ ] Save and restore the complete filter tree and table layout through the existing Saved View menu, including update/duplicate/default operations. Applying personal preferences must not overwrite named-view filters.
- [ ] Run focused tests and desktop/mobile browser checks covering typing, nested groups, all four column controls, Saved Views, navigation and paging; commit.

## Task 9: Documentation and delivery audit

**Files:** Update `docs/user-guide/01-workspace-and-views.md`, `docs/gitbook-documentation/04-opportunities-and-funnel.md`, `docs/gitbook-documentation/help-center/troubleshooting.md`, `docs/gitbook-documentation/help-center/faqs.md` and `docs/operations/universal-table-coverage.md`.

- [ ] Run the coverage test and require every record-list instance/concrete key to be complete or a justified document/editor exemption. Do not declare success while a server adapter ignores a valid filter.
- [ ] Document nested examples, currency/date behavior, personal layouts versus named views, stale views, reset, licensing failures and per-user scope. Describe only implemented controls.
- [ ] Run full web tests, real PostgreSQL adapter/persistence tests, production build, typecheck and lint. Check desktop/mobile rendering and keyboard accessibility; report any tooling limitation explicitly.
- [ ] Request one independent whole-branch review of authorization, query parity, persistence races and table-state interactions; fix important findings and rerun affected checks.
- [ ] Create reviewable PRs with actual completed checkboxes and migration/compatibility notes; link each PR to this thread. Do not merge/deploy automatically. Report implementation, CI, merge and deployment separately.

## Delivery order and self-review

Tasks 1–4 establish compatible state and layouts; Tasks 5–7 complete server and related-list coverage; Task 8 exposes the completed advanced filtering UX; Task 9 verifies the whole rollout. Column controls may be delivered in a separate PR after their tests pass, but universal filtering is not marked complete until every registered adapter is covered. Existing quick filters remain functional during transition.

Self-review: the contracts above have one public definition; Tasks 2/5 own operator/SQL parity and scope, Task 3 owns all Saved View persistence paths, Task 4 owns automatic personal layouts, Tasks 5–7 own complete-result coverage, and Task 8 owns interaction/race behavior. The coverage test is the completion gate rather than a fixed claim about how many tables exist.
