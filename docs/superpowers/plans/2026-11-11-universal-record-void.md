# Universal record void implementation plan

User confirmed every module with linked-record rules. Existing Sales → Sales Admin request/review remains the pattern; extend without changing historical amounts or silently reversing external money.

## Rules
- Transactional coverage: opportunity containers, funnels at any stage (duplicate replacement optional), quotations, projects, payment milestones, Sales Orders, every finance document kind, contracts, contract years and deal costs.
- Master records (leads/accounts/contacts/products) retain archive semantics and existing reference guards; shared Void review may archive only when their live dependent references have been resolved. No automatic destruction of customer history.
- One preview and execution adapter catalogue. Request identifies type/id/reason; preview shows active dependencies and totals/projections affected. Dependencies resolve downstream-first with their own approvals, rather than an upstream approval cancelling previously unreviewed money/delivery.
- Review recomputes a fingerprint; changed impacts require refreshed request/review, never stale execution. Requester and reviewer must retain capability, entitlement and record scope. No self review; dedicated review capability, finance reversal capability for posted money. Same-tenant only, intercompany blocked pending reconciliation.
- Preserve record content/numbering/links and request snapshots, activity/audit. Use existing soft archives and terminal states; add retained archive metadata where physical deletion exists, and apply active-row filtering consistently to allocation/report/relationship queries.
- Quotation void repairs primary/value/product projection. Funnel void cancels pending stage requests and recomputes Opportunity currency totals. Milestone/cost/year void releases allocation/totals without deleting history. Finance cancel/reversal recomputes settlement where supported; no pretend refunds or automatic milestone changes.
- Existing direct destructive delete/cancel paths must use shared rules or route to reviewed Void flow. All child creators/state mutations must reject inactive parents and use matching locks.

## Tasks
1. Add shared target types, impact model, request persistence/RLS, typed adapter contract and regression fixtures.
2. Implement sales/master adapters and retention filters, finance/SO adapters and financial guards.
3. Implement generic preview/request/approve/reject service with scoped reviewer pool and existing Approvals integration; preserve historical funnel requests.
4. Add shared Void affordance to all supported detail/related panels and read-only/history messaging. No unrelated UI redesign.
5. Run PostgreSQL lifecycle/race/access/report regressions, full checks/build, independent review, update guides and open PR; deploy only after checks.

## Evidence and ledger
Initial audits found no general approved-SO void; milestone/year/cost physical deletes; financial cancel only guarded settling children and did not structurally track original-invoice intercompany mirrors. These are explicit implementation concerns, not permission to infer cross-entity finance reversals.

## Implementation ledger

- Added universal registry and preview/request/review flow for all 14 business record types. Configuration and derived reporting/mirror views keep their source-driven administration semantics.
- Resolved dependencies individually downstream-first; no automatic financial cascade. Imported intercompany links remain explicit reconciliation blockers because the system lacks a reliable original-to-mirror reversal map.
- Kept old funnel requests readable/decidable and cancel superseded pending ones when a generic funnel Void completes. New funnel requests work at any stage, with no retained-funnel requirement.
- Preserved three formerly deleted child types with deleted_at, active allocation/relationship filters, and archive-aware split/reorder handling.
- Added SQL lifecycle write/read-only/parent guards and per-tenant write serialization. This favours consistency over concurrent write throughput; reads are not globally serialized.
- Closed direct Delete/financial Cancel bypasses; all affected UI now offers shared Void. Operational status changes (for example work being on hold/cancelled) remain distinct from record correction. Already Cancelled projects can be archived through Void.
- Review found a specialized rejection-permission gap; fixed for both decisions and covered by an actual posted-receipt PG regression. No remaining independent review finding.
- Normal full suite passed (1010 tests, 146 environment-dependent skipped) before final focused fixes; clean PostgreSQL 17 CI-equivalent suite passed all 1158 tests with no skips. Final adapter/PG-focused suite passed 15 tests after preview refinements. Fresh migration and all adapter paths, leaf-first execution, stale previews, disabled requester, posted settlement reversal, master archives and actual role-based RLS tested.
- Production build, lint/typecheck and workflow tests pass; quotation PDF pagination fixtures also pass. PR CI remains required before deployment. Browser visual QA unavailable on this host (previously confirmed AppArmor limitation); no screenshot claim.
