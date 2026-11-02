# Independent quotation duplication

Approved flow: Duplicate chooses the same or another accessible funnel, reviews Bill To and Attention, and creates an independent draft with a fresh parent number and revision 1. Revision retains its source series. Copy commercial content, reset workflow history and expiry, date today. Preserve original numbers and source records.

An explicit series_key identifies each numbering family. Backfill canonical quote prefixes; preserve nonstandard legacy references as independent families. Replace funnel/version uniqueness with tenant/series/version uniqueness. A compatibility trigger initializes series keys for imports and older application inserts. Keep the funnel default series for ordinary create compatibility; explicitly allocate fresh series for duplicates. Lock funnels in a consistent order and allocate tenant counters atomically. Revisions aggregate only within their source series, including deleted history.

Cross-funnel copies require source and destination access, same entity, compatible currency (do not invent FX), and authorized destination billing/contact selection. UI reviews destination and billing before creating. Tests cover independent same-funnel series, series-specific revisions, legacy numbering, concurrent allocation, permissions, billing and source immutability. No production data changes during implementation.

## Verification

- Migration applied to disposable seeded PostgreSQL without changing existing references. A read-only audit of production data found zero conflicting backfill keys; no production data was modified.
- 51 focused tests passed with PostgreSQL enabled, including migration execution, nonstandard legacy references, compatibility inserts, series uniqueness, concurrent allocation, deleted history, independent revisions, destination access/currency and reseller billing.
- Full ordinary suite: 942 tests passed, 104 environment-dependent tests skipped. Full lint and production build passed. Final targeted tests and typecheck cover subsequent test/accessibility refinements.
- Browser on disposable data: Q-SMP-0005 duplicated in its own funnel as Q10001-1, then copied to Acme ERP Implementation as Q10002-1; commercial content was retained, both drafts have independent series and no revision link, and the source remains unchanged.
- One accepted quotation per funnel remains an existing workflow constraint. Cross-entity and automatic currency conversion remain unsupported. No production deployment performed.
