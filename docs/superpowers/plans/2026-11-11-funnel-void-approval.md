# Sales-requested funnel void approval

User authorised implementing the proposed sales request → Sales Admin approval flow. Reuse the existing approval queue and duplicate-void transaction. Do not add general financial reversal or allow sales to archive directly.

- Add tenant-isolated void requests, one pending per source, requester/decision identity, reason, retained funnel and source owner snapshot.
- Dedicated approval capability, granted to Owner/Admin and existing Sales Admin roles. Sales with funnel update access may request against their own accessible Closed Won funnels. Admin role configuration may delegate the approval capability.
- Shared Sales Admin review pool; no reporting-manager routing, self approval or silent fallback. Fail clearly if no other active eligible reviewer exists.
- Expose Void on eligible record pages. Submit only creates pending request. Existing direct action must not bypass approvals.
- Integrate fourth type into Approvals, including search/count/cursor, My requests history, approve/reject with rejection reason. Show source and retained record links.
- Approval rechecks requester active/access and source ownership snapshot, stage/customer/currency and all financial guards, atomically with decision. Rejection never archives. Audit request/decision and activity. Preserve all current archive/history behavior.
- Validate schema/RLS/migration, request/decision permission and atomicity regression tests, queue integration, typecheck/lint/workflow tests and production build as appropriate. Open PR with clear deployment/migration notes.

## Implementation ledger

- Implemented request-only Void action, Sales Admin shared review pool, My requests history, rejection notes and approval execution.
- Added dedicated capability and migration 0102 with tenant RLS and one-pending constraint. No production record or role edits were made; migration grants existing Owner/Admin and matching Sales Admin roles on deployment.
- Review fixes: minimal sales page guard, actual reviewer read/scope eligibility, both requester record scopes rechecked on approval, unrelated quotation/lead roles return an empty void source instead of breaking the shared queue.
- Local migration completed; RLS enabled and forced; expected local Admin/Owner grants verified.
- Validation: full normal suite 992 passed/139 skipped before final review fixes; final 50 focused regressions (including PostgreSQL), lint and production build including TypeScript passed against the review fixes. Existing duplicate archive DB regressions remain included.
- Browser visual QA remains unavailable on this host (documented T3 preview AppArmor limitation); no screenshot claim.
