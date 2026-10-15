# Universal CRM table filtering and column controls

## Approved requirements

One consistent table experience across the CRM, including related-record tables:

- Nested AND/OR filter groups.
- Show/hide, reorder, resize and left/right pin columns.
- Each user's layout persists independently.
- Familiar CRM rendering, icons, labels and saved views.
- Filters operate on the complete authorized result set before pagination.

## Current implementation and scope

There are 42 shared DataTable call sites across 30 application files at the current main revision. Existing controls provide column visibility, limited typed filters and named saved views. `normalizeRecordListQuery` preserves primarily enum/relation/boolean selections and the first sort, dropping most typed comparisons. Filter definitions and backend support are maintained separately. Saved views store flat column filters, sorting, visibility and page size, without column ordering, widths or pinning.

The rollout covers record/list tables in Leads, Accounts, Contacts, Opportunities, Funnel, Quotations, Products, Payment Milestones, Project Codes, Projects, Sales Orders, Billing, Intercompany, Forecast, Audit, Team and Settings, and their related lists. Include reusable record-list tables found outside the app route directory, such as approval inbox lists. Produce a checked coverage manifest before implementation and keep it current through completion.

Printed quotation/PDF tables are document layouts and retain their fixed contractual formatting. Editable quotation line-entry grids retain their edit behavior and required columns; they are not converted into record-list filter surfaces. These exclusions must be recorded in the coverage manifest, not counted as completed universal record lists.

## Shared field definitions

Each table has a stable list key and explicit field descriptors: ID, user-facing label, data type, availability, supported operators, sort capability, default visibility, minimum/default width and layout locks. Do not infer field types from the current page or from the first nonempty row. Computed values must have explicit semantics. Action-only columns cannot be filtered and may remain fixed.

The browser receives public descriptors. Server-only adapters map those IDs to authorized SQL expressions, joins, aggregates and relationship predicates. A client cannot supply table names, SQL, arbitrary relation paths or fields absent from its descriptor set. Permission-dependent descriptors are omitted when access is unavailable; the server independently checks every requested field.

## Filter model and semantics

Represent filters as a versioned tree of condition leaves and AND/OR groups. Maximum depth is 5, with 50 conditions, 100 selected values per condition and a 32 KiB serialized request limit. Exceeding limits or using unknown fields/operators produces a visible validation error; it must not silently remove a condition and broaden results.

Supported operator families:

- Text: contains, does not contain, equals, does not equal, starts with, ends with, is empty, is not empty.
- Number: equals/not equal, greater/less than, greater/less than or equal, inclusive between, empty/not empty.
- Money: numeric comparisons with explicit currency semantics. On multi-currency lists, require a currency in a money condition; do not sum or compare converted amounts unless the existing report explicitly supplies a converted value.
- Date: on, before, after, inclusive range, calendar year, relative periods and empty/not empty. Preserve the existing Funnel expected-close-year requirement.
- Enum/relation: is any of, is none of, empty/not empty, with searchable choices restricted by existing access rules.
- Boolean: yes, no and unset where the underlying field is nullable.

Empty means null or an empty string for text, null for numeric/date/boolean fields, and no association for relationships. Zero and false are valid values. Ordinary comparison and negative-comparison operators require a nonempty value; empty values match only explicit empty/not-empty conditions. Multi-select any-of is an OR within one condition. Date-only fields compare calendar dates; timestamp boundaries use the deployment business timezone (`TZ`, UTC fallback), shown beside relative-date controls. Literal `%`, `_`, backslashes, apostrophes and historical project-code punctuation remain literal input.

A shared validator and client evaluator define the same condition semantics as the server compiler. SQL predicates are parameterized. Relationship filters use scoped EXISTS predicates or equivalent duplicate-safe queries. Aggregate filters use the aggregate's correct query level, and counts use exactly the same predicates as rows.

Authorization, tenant scope, module entitlement, soft deletion and business eligibility remain mandatory outer predicates:

    authorized_scope AND existing_business_eligibility AND (user_filter_tree)

An OR group cannot include, replace or weaken these mandatory predicates. Project Codes remains limited to active 4A/Won relationships; sales ownership/team rules remain unchanged. Funnel free-text search continues to search names only; explicit column filters are separate.

## User experience

Keep the shared table toolbar. Existing common filters remain quick shortcuts to conditions in the same model, rather than a second independent filtering mechanism. An Advanced filters control opens the editor with Add condition, Add group, AND/OR selectors and clear group boundaries. Build changes as a draft; Apply validates and commits atomically, Cancel preserves the active filter. Show an understandable active-filter summary and Clear filters.

Filters and sort apply before paging; editing them resets to the first page. Multi-column sorting supports up to five fields, with a stable record-ID tie-breaker. Loading, error, retry, empty results and total count follow the existing DataTable patterns. Relative-date saved views resolve their time window on each request, not when saved.

A Columns control lists readable field names with show/hide, keyboard-accessible move up/down, left/right/unpin and width controls. Header resizing supports pointer and keyboard input. Widths are bounded from 48 to 800 px, further constrained by field metadata. At least one identifying data column remains visible. Mandatory action/identity columns may be locked. Narrow screens keep the center usable through horizontal scrolling and temporary pin suspension when necessary, without overwriting the user's saved desktop layout. Reset layout restores the table defaults without clearing filters.

## Persistence and backwards compatibility

Persist layout preferences by tenant, member and stable list key, using a dedicated preferences row with a unique composite key and RLS. Debounce saves. Preference failures show an unsaved-state message and do not block reading records. Use the existing commercial write-access guards; do not bypass read-only licensing to persist preferences.

Extend named saved views with an optional versioned table-state document containing the filter tree, column order, widths and pinning. Use an additive migration; retain existing filters/sorting/visibility/page-size columns and accept legacy view payloads. Existing flat filters become an AND group without changing meaning. New views can save the complete filter and layout configuration.

State precedence: explicit URL state, selected named view, default named view, personal layout preferences, table defaults. Layout preferences do not silently replace the filters of a named view. URL state is versioned and namespaced per table; preserve existing bookmarks through a compatibility reader. Oversized filter trees stay in saved views rather than producing unusable URLs.

When a field is removed or a user loses access, remove it from visible column settings and notify the user. A saved filter referencing an unavailable field cannot be applied silently; show that the view needs updating. Reapply all authorization server-side regardless of saved data.

## Rollout and acceptance

Implement in reviewable stages, preserving the final scope:

1. Checked table/field coverage manifest; shared definitions, compatibility and persistence contracts.
2. Column layout controls and per-user persistence on every shared record table.
3. Validated filter tree, matching client evaluator and server compiler, saved-view compatibility and advanced editor.
4. Migrate every record-list adapter, including related tables whose data is currently only a parent-page slice. Such tables must query their complete authorized relationship dataset, or be explicitly identified as scoped views until migrated; they cannot be claimed as universal filtering while filtering a truncated page.
5. Remove unsupported filter controls, document actual field capabilities, verify the coverage manifest and publish GitBook instructions with the change.

Do not mark the rollout complete while a registered server table ignores a valid filter or filters only its currently loaded page. Complete each stage's adapter coverage before exposing that capability on the affected table. Keep the existing working quick filters available throughout.

## Verification

- Operator and nested-group tests, including null/empty/zero/false, invalid values, inverted ranges, date/year boundaries, punctuation, depth and size limits.
- Matching client/server results for the same fixtures.
- PostgreSQL tests proving filtering and totals precede pagination, sorting is stable and relationships do not duplicate rows.
- Tenant/own/team/module and Project Code eligibility tests with adversarial OR groups and inaccessible related fields.
- Saved-view upgrade and round-trip tests, revoked/removed fields, independent users/tenants/list keys, and read-only preference-save failure behavior.
- Layout tests for order/width/pinning/visibility persistence, reset, required columns and keyboard controls.
- Browser checks at desktop and mobile sizes: filter typing, nested groups, saved views, resize/reorder/pin, navigation/back, paging and no refresh loops.
- Full appropriate tests, build, typecheck and lint; coverage audit for every record-list call site and documented exemptions.

## Delivery boundary

No production data ingestion or sales-record mutation is needed. Additive preference/view migrations deploy through the normal release workflow. Preserve old clients and views during rollout. Production changes are delivered through PRs; merge/deployment status must be reported separately from implementation completion.
