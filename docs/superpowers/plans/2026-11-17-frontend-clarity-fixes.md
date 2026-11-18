# Frontend clarity audit fixes implementation plan

Goal: resolve F01–F27 in docs/operations/2026-11-17-frontend-interface-clarity-audit.md plus the quotation Set primary help icon. Deliver a signed-in, fictional-data Tailscale preview; no production push/deploy in this iteration.

Architecture/decisions: keep stable table IDs and permissions. Keep current effective Funnel amount calculation but name it Deal value (excl. tax) and expose estimated/primary-quote source. Sum board totals by currency. Distinguish manual estimates, quote net, own weighted forecast and actual receipts. Do not change historical numbering or reclassify stored finance amounts: show document total with its recorded currency, explain unrecorded tax basis, and avoid comparing it as a net percentage against Project value. Label SO amount Current project value (not an invented approved snapshot). Account creation must choose a Funnel explicitly. Shared references must respect existing access; inbound intercompany uses its own context, not a fake Funnel link. Preserve desktop left-details/right-related design, add mobile app navigation and restore tabs with URL state. No arbitrary reporting designer.

Work groups (disjoint writes):
- CRM/Funnel group: api-readers, Leads/Accounts/Contacts/Opportunities/Funnel pages/actions/components; currency buckets, clear identities, source labels, contextual links, explicit creation choices and null semantics. Own shared reference component if useful.
- Finance group: quotations/help button, milestones, projects billing, sales orders, billing/purchasing and intercompany; monetary correctness, receipts, bill-to context, related links and tax-basis clarity. No api-readers edits.
- Shell group: shared site header/layout/DataTable, input labels, audit/forecast/team/settings, responsive navigation/toolbars, headings/URL tab helper, chart labels. No api-readers or finance/CRM module edits.
- Root: coordinate field metadata, dependency patch, acceptance ledger, integrated tests/build/screenshots/preview and review.

Checklist:
- [x] F01 currency-grouped board totals; F02 effective value + source; F03 explicit parent estimate scope.
- [x] F04 role/name labels; F05 contextual links; F06 actual Account owner; F07 converted entity name; F08 relation membership text; F09 explicit Funnel choice; F10 metadata/export labels.
- [x] F11 milestone currency; F12 product currency; F13 document discount reconciliation; F14 actual receipts; F15 visible document currency/basis; F16 bill-to default/context.
- [x] F17 current vs approved value; F18 fallback line labels; F19 invoicing planning distinction; F20 forecast/share meaning; F21 null vs zero.
- [x] F22 mobile navigation; F23 responsive controls; F24 labels/sort semantics; F25 audit chronology/links; F26 headings/tab restoration; F27 chart labels.
- [x] Set primary help icon inside button; tooltips remain keyboard accessible and do not trigger action by themselves.
- [x] Apply supported Next security patch separately in dependency scope; verify existing checks.
- [x] Meaningful regression tests, lint/typecheck, production build, current demo desktop/mobile captures and final independent review.
- [x] Refresh local synthetic entitlement via existing signed flow if needed; no auth/license bypass; start built preview with time-limited signed-in demo entry and verify exact Tailscale URL.
- [x] Deliver itemized resolution ledger, screenshots and local preview; disclose any remaining verification limits.
