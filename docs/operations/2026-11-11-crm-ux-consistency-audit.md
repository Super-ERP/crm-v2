# CRM UX consistency audit — 11 November 2026

Scope: source audit of Accounts (including proposed PR #282), Contacts, Leads, Funnels, Products, Projects, billing documents, Sales Orders, quotations and shared detail/inline/table controls. Baseline: branch feat/account-details-edit, commit 251b16a. No product code changed during this audit.

Method: Impeccable audit/Operate principles; consistency, user control, visibility of status, error prevention/recovery and accessible controls. The detector returned no findings for the inspected shared controls and representative detail/quotation pages. Manual source inspection found behavioral issues that the detector does not cover. Runtime desktop/mobile screenshots, contrast measurements, screen-reader testing and performance profiling were not performed: the preceding browser attempt was blocked by the host AppArmor sandbox prerequisite, and the fallback browser inventory was empty. These findings are implementation evidence, not a certification of accessibility or visual quality.

## Findings in priority order

### 1. P1 — Failed inline saves discard the attempted edit

Evidence: `apps/web/components/inline-value.tsx:47` closes the editor before saving and clears the optimistic value in finally. `apps/web/components/inline-combobox.tsx:42` follows the same pattern. `apps/web/components/detail-page.tsx:181` awaits the shared save helper but does not forward its false result. The helper catches errors and returns false, so caller controls cannot reliably distinguish success from failure.

Impact: after a validation/permission/network failure, the old value returns and the user must re-enter their change. A toast alone is insufficient recovery.

Recommendation: one typed save result across controls. Keep the editor/draft on failure; associate the error with the field. Close only after success or explicit Cancel. Preserve legitimate optimistic feedback without presenting an unconfirmed save as complete.

### 2. P1 — Shared inline inputs lack a programmatic field label

Evidence: `apps/web/components/inline-value.tsx:79` and `:100` render textarea/input without an accessible name. `apps/web/components/detail-page.tsx:138` renders field labels as spans rather than associated labels. InlineCombobox also does not pass its field label to the actual control.

Impact: screen-reader users may hear a value or generic textbox without knowing which record field it changes. This risks WCAG 1.3.1/4.1.2 failures; actual assistive-technology behavior still needs testing.

Recommendation: require a field label/id in the shared editor contract; connect the label and input, with error/help text via aria-describedby. Test keyboard editing, Escape, save and error recovery.

### 3. P1 — Unsaved-change protection is not consistent across forms

Evidence: `apps/web/components/use-unsaved-changes.ts` is used only by the new Account Details editor. Contacts (`persons/person-form.tsx`), Products (`products/product-form.tsx`), Funnel (`funnel/opportunity-form.tsx`) and quotation editing (`quotations/quotation-form.tsx`) use local form state without that shared navigation guard. Modal closing and document navigation require separate checks as well.

Impact: users cannot predict which pages protect unfinished work.

Recommendation: shared dirty/saving/error lifecycle for full-record editors. Apply guards to actual modal close, route navigation and tab changes; preserve the Account hook's documented Navigation API browser limitation. An explicit Save/Cancel editor should never silently abandon dirty input.

### 4. P1 risk — Rapid independent field saves can overwrite changes

Evidence: Contact detail `persons/[id]/person-detail-body.tsx:95` submits `updatePerson(personId, { ...record, ...patch })`; Account detail uses the same full-record merge pattern. Separate field controls have separate in-flight state. There is no shared revision check or edit queue at this UI boundary.

Impact: if two edits start before refreshed props arrive, a later full-record payload can contain an older value for the first field. This race was identified from the write path, not reproduced in a browser.

Recommendation: grouped editing for full records; for retained quick edits, use explicitly validated patch actions or serialize saves until refreshed state is available. Add a concurrent-edit regression before changing the save contract.

### 5. P2 — Accounts still offers two save models and duplicate detail surfaces

Evidence: `accounts/[id]/account-detail-body.tsx:350` retains left-column click-to-save editors when the Details editor is closed; `:516` introduces a separate Edit details form with grouped Save/Cancel. The same field sections appear in both columns.

Impact: a user may reasonably think all account changes require Save, while sidebar changes save immediately. Showing every field twice increases scanning effort.

Recommendation: before expanding PR #282's pattern, make the left column a concise read-only summary and make Details the authoritative editing surface. Keep only a documented, deliberate quick action if there is a strong workflow reason.

### 6. P2 — Edit affordances do not consistently match record-level authorization

Evidence: Contact detail `persons/[id]/page.tsx:120` gates editing by PERSON_UPDATE alone, while `persons/actions.ts:210` also checks ownership/management of the related account. Account PR #282 resolves both before showing its editor, but other record pages have not adopted this pattern.

Impact: visible editing controls can lead to an avoidable Forbidden error. This is an affordance problem, not evidence of a server authorization bypass.

Recommendation: return record-specific capabilities from authorized detail readers and use them consistently for edit/delete/primary/reassign controls. Keep server enforcement authoritative.

### 7. P2 — Related-tab location is not shareable or reliably restored

Evidence: Contacts default to pipelines (`person-detail-body.tsx:91`), Funnels/Leads to activity, Projects to milestones and Accounts to details. These choices are stored in local useState rather than a tab query parameter.

Impact: refresh, browser navigation or a shared URL can lose the user's related-panel context.

Recommendation: common tab URL/state handling with safe dirty-edit transitions. Preserve workflow-appropriate defaults: a quotation builder and a Sales Order review page should not be forced into an identical tab arrangement merely for symmetry.

### 8. P2 — Compact controls need a consistent touch strategy

Evidence: `components/ui/button.tsx` uses 28px icon-sm and 32px default controls; InlineCombobox explicitly uses h-7. `app/globals.css:202` enlarges only choice-chip targets for coarse pointers.

Impact: the CRM is optimized for desktop density, but touch users face smaller precision targets. These sizes alone do not prove a WCAG AA failure: WCAG 2.5.8 has a 24px minimum and exceptions; 44px is the proposed ergonomic target for primary touch interactions.

Recommendation: retain desktop density, enlarge interactive targets on coarse pointers and verify wrapped toolbars, dropdowns, keyboard focus and real touch behavior at narrow widths.

## What is already consistent and should be retained

- Shared DetailAside/TabsCard/FieldRow/FieldSection and wrap-friendly TabsList.
- Shared Form/FormLabel/FormMessage, Button, Combobox, theme tokens and focus styles.
- Shared DataTable filtering, columns, saved views and export controls.
- Existing server validation, permission enforcement and frozen quotation/document workflows.
- Account PR #282's explicit edit state, Save/Cancel, pending state, unique form id, focus restoration and primary-control disabling.

## Provisional dimension assessment

| Dimension | Source assessment | Runtime evidence needed |
| --- | --- | --- |
| Accessibility | 2/4: good form primitives; shared inline naming gap | Screen reader, keyboard and contrast checks |
| Performance | Not scored | Interaction timing, requests, render/profile evidence |
| Theming | 3/4: inspected components use shared tokens | Light/dark contrast and state screenshots |
| Responsive design | 2/4: responsive groups/wrapping exist; touch target policy incomplete | Desktop/mobile layouts and actual touch gestures |
| Implementation integrity | 2/4: coherent shell, divergent editing/save contracts | End-to-end comparison of task flows |

No aggregate score is given because performance and visual behavior were not measured. No P0 blocker was established by this audit. Four P1 issues/risks and four P2 issues are listed; the race condition is explicitly unconfirmed at runtime.

## Recommended implementation order

1. Finish the Account pattern: one authoritative editor, concise read-only summary, clear error recovery.
2. Standardize the shared edit contract: labels, dirty/pending/error state, typed save result, safe patch or grouped saves, navigation guards.
3. Apply to Contacts, then Leads/Funnels, then Products and Projects. Use a common shell with module-specific fields and validation.
4. Apply capability and tab-state conventions across detail pages.
5. Review quotation, Sales Order and billing editors under the same principles while preserving their document/workflow-specific interactions.
6. Run one desktop/mobile browser audit and keyboard pass once the host browser prerequisite is available; fix observed issues in one bounded pass.

Audit only: these findings do not mean all proposed fixes are implemented or deployed.
