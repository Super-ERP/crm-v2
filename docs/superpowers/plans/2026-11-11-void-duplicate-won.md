# Void a duplicate Closed Won funnel

Approved scope: authorized managers/admins void a duplicate with a reason and an accessible retained Closed Won funnel for the same customer/currency/entity. Use existing soft-delete markers for the duplicate funnel and its quotations so established list/report/project-code predicates exclude it. Preserve statuses, values, numbering, line items, schedules, documents and history; write a dedicated audit event and activity on the retained funnel. Recompute the source parent opportunity's totals. No migration or financial reversal.

Block before mutation for any linked project (including quotation links and archived projects, protecting sales orders/finance), invoiced or legacy-invoice milestones, contract records/schedules, purchase costs or intercompany shares/mirrors. Pending un-invoiced funnel schedules remain stored and become ineligible via the existing milestone scope. Cancel pending stage requests. No sales-rep void permission by default; reuse Delete pipelines + Approve stage advances and existing ownership/team scope.

1. Shared validation plus transactional service: deterministic funnel locks, state/access validation, blockers, quotation archival, audit/activity/total recalculation. Protect related writers from inserting against an archived funnel after waiting on its lock.
2. Manager-only dialog on Closed Won: searchable scoped retained-funnel options, required reason, explicit archive effects, pending/error recovery, redirect to retained record after success.
3. Regression tests for permissions, state, target scope, blockers, atomic archival and reporting exclusion. Run DB tests on disposable database and standard checks. Update funnel guide and open PR. Do not mutate production records during implementation.
