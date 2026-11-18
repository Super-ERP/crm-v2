# Milestone flow interface audit and cleanup

Scope: quotation payment tab, Funnel milestone panel and stage context, shared Project milestone panel, milestone detail, schedule editor and stage setup. Existing record permissions and financial restrictions remain authoritative; this is a local-only iteration.

Findings confirmed in current source and built screenshots:

1. Quotation and Funnel/Project use separate milestone table implementations, status styling, columns and row links.
2. Quotation defaults to a summary with an explicit edit mode; Funnel/Project expose always-active inline editors and workflow controls.
3. Remarks and due-date columns are always present even when blank. A wide table hides primary amount/period on small screens.
4. The billing editor opens every row’s fields together, repeating product source/month/year labels and generating a long stage dialog.
5. Quotation repeats a title and several explanatory sentences; Funnel uses different planning guidance. Secondary help has no consistent disclosure.
6. Allocation is duplicated as a table footer and another summary, using Allocated/Remaining vs Scheduled/Unallocated.
7. Funnel procurement and expected invoice fields repeat in the aside and stage panel. Stage field selection is easy to mistake for advancement.
8. Funnel’s editable scalar invoice period competes with dated milestone rows as a forecast source.
9. Milestone detail repeats the name in the record header and Planning details; source links are mixed with editable planning fields.
10. Rows with financial history have different edit affordances across the tab and detail; this audit will preserve server restrictions rather than imply history can be edited.

Chosen cleanup: extract one read table and allocation/help primitives used by quotation/Funnel/Project. Keep the existing mutation adapters and record-detail edit flow. Read tables link to authoritative milestone detail for field edits; row workflow actions remain available through a disclosure. Hide optional remarks/due date until a row expands. Schedule editing uses individual collapsible instalments with expand/collapse all. Stage requirements are closed by default in read mode and open for record editing; scalar invoice period becomes a link to the schedule when rows exist. Milestone detail owns planning fields once, with source references and optional metadata grouped separately.

Do not introduce another reporting module, automatic invoice creation, currency conversion, or guessed historical product sources. No production push. Verify shared presentation, permissions, data-preserving edits, browser expansion/keyboard behavior and responsive widths.

## Additional functional findings from integration review

11. Project milestone create/update/read adapters omitted invoice period/remarks fields collected by the shared form. Added persistence and period validation; existing financial amount locks remain enforced.
12. Whole-plan saves archived/recreated retained milestone rows, invalidating links and dropping secondary metadata/Project links. Retained owned IDs now update in place; only removed rows archive, only additions insert. Remarks, due dates, Project linkage and finance-history rules are preserved.
13. Project-only row Split used the Funnel-only endpoint. It is now offered only when the owning adapter supports splitting.
14. The one-record Add form exposed multi-row controls although it could save only one record. Those controls are removed for single-row creation/editing; batch quotation planning still supports multiple rows.

## Resolution and ownership

- Shared `payment-milestone-table.tsx`: read columns, status presentation, original currency, optional expanded remarks/due date, accessible record link where supported, allocation summary and collapsed planning help.
- `quotation-billing-schedule.tsx`: uses shared read presentation, explicit bulk Edit/Save/Cancel; no duplicate link list.
- `milestones-panel.tsx`: shared Funnel/Project read view; explicit inline row editing; workflow controls under Actions. Project rows keep their own updater and do not link to an incompatible core editor.
- `billing-schedule-editor.tsx`: per-instalment expansion, Expand/Collapse all, incomplete rows open, and single-row mode that cannot create unsavable extra rows.
- Funnel: stage requirements collapsed by default, available on selection/editing; invoice plan points to the schedule once rows exist rather than exposing a competing scalar edit.
- Milestone detail: name shown once in read content, source links kept in Related, optional planning metadata behind Additional details; forecast dates can be edited independently of locked invoice amounts.
- Schedule saves now revalidate linked milestone/Project/Funnel views. Existing permissions, invoicing eligibility and saved-view/table IDs are preserved.

Context-dependent columns and capabilities remain deliberate: quotation item is shown when its source metadata is available; Project rows use Project permissions/updater; financially linked schedules retain date-only bulk editing. No unsupported split endpoint is offered.

This audit does not claim a new whole-application screen-reader/WCAG certification. The unavailable SharePoint workbook remains a separate pending source-verification task.

15. Built-screen comparison found different ordering between Quotation’s unordered query and Funnel’s due-date sort. Both now use saved sort order with a deterministic ID tie-breaker, so viewing/saving does not silently rearrange the plan. Due date remains separate from forecast invoice period.
16. Prepared schedules visible before4a inherited manual Funnel actions that the server rejects until eligibility. Those actions now remain hidden until eligible, with a scoped **Edit plan on quotation** link for the preparation flow. Void review remains a separate permission-controlled action.

## Verification record

- Full PostgreSQL-required regression suite:197 files /1,269 tests passed after the shared UI and stable-record save changes.
- Subsequent ordering/eligibility presentation changes have focused regression checks; final build/type checking and lint are checked before delivery.
- Actual built browser at320,768,1024,1440: three-row quotation table stayed within the page, with internal table scrolling on narrow widths.
- Complete editors initially collapsed; keyboard Space expanded all nine inputs. Empty added row produced inline validation; Cancel restored three saved rows. Valid Save succeeded without alerts or client exceptions.
- Before/after Save milestone ID lists matched exactly; retained remarks/due dates persisted. Quotation/Funnel share the core read summary, and stage requirements/default optional details were closed.
- Project history row had no unsupported Split; correcting its invoice month saved and reappeared in the table using the Project adapter.
- Independent reviewer’s two concrete action dead ends were corrected and rechecked. Stable-record saving was independently re-reviewed with no concrete issue found.

No changes pushed or deployed. Existing signed-in fictional-data preview remains on the same Tailscale host.

Final delivery check: the last production build/typecheck passed, focused lint passed, and17 focused tests passed after saved-order and pre4a-affordance adjustments. The final rebuilt preview repeated the responsive/disclosure/save/cancel checks successfully with no browser exceptions. Existing login entry was retained. No production deployment occurred.

## Accountant table and relationship follow-up

- [x] Quotation Related includes a counted Payment milestones shortcut.
- [x] Funnel Payment Milestones tab and Related shortcut remain visible to permitted viewers even before 4a and with no schedule; existing management eligibility remains enforced.
- [x] Milestone entry uses a shared aligned table with invoice month/year, source quotation item and right-aligned amount in the record currency. Optional linkage expands without hiding required inputs.
- [x] Scheduled amount must equal quotation net excluding tax, in cents. Underallocation and overallocation block Save in both UI and server validation, including the stage readiness check.
- [x] Funnel rows show their authorized quotation and source item, with direct quotation links. One item may still feed several milestones.

Verification: 20 focused tests across six files passed, TypeScript and focused ESLint passed, production build passed. Rebuilt demo checked Q10002-1 Related, Q10001-1 table/expanded linkage, unbalanced Save disabled, Wonka's empty 0e milestone tab, and Wayne's three source-linked rows. No browser exceptions or page overflow at 320, 768, 1024 and 1440 pixels. Changes remain local and unpushed.

## Shared-component consistency implementation

Implemented the requested follow-up after the 107-item review:

- Read/edit quotation plans now render through one shared table with identical column widths/order, Status retained, month/year within one period cell, matching control heights and expandable source/remarks/due details.
- Replaced native selects with existing shared Select components. Retained shared Input/Button/Table, blue primary actions and semantic theme colors.
- Header Edit becomes Save/Cancel; unchanged plans cannot submit. New/edit/error/cancel focus is handled and required fields expose their semantics.
- Row-specific inline errors identify the field, are associated using aria-describedby/aria-invalid and clear after correction. Draft removal has Undo, cleared when the editing session ends.
- Milestone identity remains visible while horizontally scrolling narrow tables.

Final verification: 14 focused tests passed; focused ESLint and production build passed. Dedicated synthetic browser compared all seven header positions/widths between modes (identical at 1440px), observed all 12 shared month options/current selection, first-field focus, unchanged Save disabled, invalid-title focus/association, correction clearing, Undo preserving another edit, Cancel focus restoration and no stale Undo in a new editing session. At 320/768/1024px the page had no horizontal overflow and the identity cell stayed at the scroll-container edge. No runtime exceptions. No valid financial write was needed for this UI regression check.

The earlier review's unverified measured contrast, screen-reader, actual 200% zoom and slow-save checks remain unverified; this implementation does not certify full WCAG conformance or every application screen. Local demo only, no push/deployment.

### Compact allocation summary

Removed the repeated balanced sentence and always-visible planning description. The shared summary now shows quotation/project net (excluding tax), scheduled and remaining/overallocated figures with a fully-allocated check icon. Optional guidance is behind the shared keyboard-operable help popover; editing an imbalanced plan still displays a short save-blocking instruction. Quotation, Funnel and Project panels reuse the compact summary.

Verified eight focused tests, focused ESLint and production build. Browser confirmed no old balanced paragraph or inline guidance, help opens on demand, Escape closes it and returns focus to the trigger, and the closed-help layout has no page overflow at 320px. No runtime exceptions. Local preview refreshed, no push.
