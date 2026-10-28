# Shared CRM relationship engine

User authorized closing the relationship gap across existing table panels without changing defaults. Implement approved business relationships in either direction, including bridge-table relationships. Parent lists retain their row grain. Related summaries, nested same-record filters and exports use the same tenant/permission/ownership scopes. Defaults and saved field IDs remain unchanged.

## Execution

1. Inventory entity and panel mapping; define approved scalar business fields and relationship edges (one, many, bridge), including Account → Milestones and inverse paths.
2. Extend typed filters with bounded collection matching (some/none/every, every requires a nonempty collection); metadata drives a nested editor. Keep existing AST compatible.
3. Implement tenant-bound correlated SQL registries for filters/sorts and requested-only projections. Enforce target module/record permissions before matching or aggregating; deduplicate bridge targets. Separate currencies; never fan out parent rows.
4. Wire server adapters before count/pagination. Use authorized batched projection for complete-client panels, with condition results computed server-side and no partial-page filtering. Show loading/errors rather than treating unavailable relation values as empty.
5. Preserve existing controls/defaults and exports; add searchable summary choices, nesting and meaningful labels. Test actual PostgreSQL parity, owner/tenant/module denial, missing relations, bridge duplicates, same-child rules, currencies and paging/export. Review and document honest coverage/limits.

## Review focus

No permissions inferred from foreign keys; no counts/sums revealing protected children. Same-child conjunction, existential/universal empty semantics, money currency isolation, bridge deduplication, parent row count and full-result filtering. Existing saved views and initial visible columns must remain compatible. Unregistered or sensitive/legacy fields stay rejected.

## Delivered and verified

All five execution steps are complete. The approved graph covers all 46 catalogue keys and all three cardinalities. Single targets expose supported fields; collections expose explicit summaries and same-record predicates. Main lists filter/count/sort in SQL; complete-client panels project authorized values for their whole source arrays. Existing visible columns, custom cells, layouts and saved views remain intact. Excel/CSV retain the parent grain and include selected related columns across every matching page.

- Full suite: 121 files / 928 tests passed; 24 environment-dependent files / 87 tests skipped in the ordinary run.
- Disposable PostgreSQL: relationship SQL, core adapters, SQL/client parity and preference ownership suites: 4/4 passed. Every registered related expression/predicate compiled against the actual schema shape. Fixtures cover all critical semantics and >25-parent pagination.
- Latest targeted catalogue/layout/export/relationships/panel coverage: 5 files / 16 tests passed. Final typecheck, changed-file lint and whitespace checks passed.
- Browser: original Account columns preserved; milestone count and total selected only through Columns; empty account0 and linked account2/MYR300. Nested pending-milestone filter works. Saved view reset/reapply restores both filter and summaries. Excel downloaded and inspected with one matching parent, count2, numeric300 and MYR. Complete-client Contacts panel loads Account → Name without errors.
- Fresh whole-change review: Forecast eligibility and source-panel permission bugs reproduced and fixed; long condition IDs use bounded generated SQL identifiers. No deferred findings.
- Related FK queries use indexable identity/FK predicates where practical; no performance benchmark on production-size data is claimed.

## Explicit boundaries

The catalogue remains an approved business graph, not arbitrary database/schema access. New data capture or a genuinely new relationship requires registration. Nested related conditions support two relationship steps within existing filter size/depth budgets. Parent summaries include all accessible children; a parent-matching condition does not define a custom filtered aggregate. Exports do not flatten children or combine currencies; individual child reports start from the child's dataset. Existing 100,000-row export and non-snapshot consistency limits remain. No production data or deployment was changed.
