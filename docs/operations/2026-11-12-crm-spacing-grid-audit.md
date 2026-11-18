# CRM spacing and grid audit — 12 November 2026

Scope: source-level spacing/grid inventory across all 54 signed-in page entry points, 11 detail-body files, 11 files matching `*form.tsx`, shared page/detail/table/card/dialog/tab primitives, and settings layout. This is not a claim that every screen has been rendered or that accessibility/performance has been fully audited.

Reference: https://www.checklist.design/design-system/spacing-and-grid . The page was fetched but returned only a title/no readable checklist text. No exact checklist requirements are attributed to it. Apply the requested principles through measurable app-specific rules: consistent outer gutters, clear spacing hierarchy, deliberate density, responsive available-width grids and alignment. https://github.com/shadcn-ui/lint recommends enforcing contracts on existing components; no dependency was installed in this audit.

## Verdict

The app has a coherent base: shared page gutters, theme spacing utilities, responsive forms and table overflow containment. It does not yet have an explicit spacing/density contract for detail cards and nested grids. Four implementation concerns merit a shared-component pass; two additional responsive risks require browser evidence before treating them as confirmed defects. No P0 blocker was established by this audit.

Visual inspection limitation: T3 preview startup reports: “This host blocks the sandbox T3's browser runs in (AppArmor on Ubuntu 23.10+).” No measured screenshots, computed bounds, contrast score or mobile pass is claimed. Existing user screenshots provide context only, not coverage of the whole app.

## Findings

### S1 — P2: Header action groups cannot wrap internally
Location: `apps/web/components/page-header.tsx:43`.
The outer header wraps, but its actions container is `flex items-center gap-2` without `flex-wrap` or a shrink constraint. Several actions must stay together on one line even after moving below the heading. Long action labels/localisation can exceed narrow content widths. This is a verified layout constraint; actual overflow at a given width is unmeasured.
Recommendation: make the action group `min-w-0 max-w-full flex-wrap`; preserve button variants and natural group alignment. Test a multi-action header at 360px and 200% text zoom. Suggested workflow: Impeccable adapt/layout.

### S2 — P2: Shared related-tab cards impose large blank areas and different top gutters
Location: `apps/web/components/detail-page.tsx:92`; `apps/web/components/ui/card.tsx:17`.
`TabsCard` hard-codes `min-h-[26rem] pt-6`. Card already provides its vertical padding through `--card-spacing` (16px default), so the standalone tab-card content adds another 24px top padding, unlike ordinary card content. Every short/empty tab reserves at least 26rem regardless of content.
Recommendation: make minimum panel height an intentional optional variant and use the card spacing token for the tab inset. Preserve any minimum needed for loading stability, rather than removing it blindly. Test empty, short, loading and long tabs. Suggested workflow: Impeccable layout.

### S3 — P2: Similar detail sections use inconsistent density without named variants
Locations: `leads/[id]/lead-detail-body.tsx:154` uses gap-5; `opportunities/[id]/opportunity-detail-body.tsx:240` and `sales-orders/[id]/sales-order-detail-body.tsx:201` use gap-3; `billing/[id]/doc-detail-body.tsx:101` uses gap-2.5. Quotation build uses gap-6 while ordinary detail shells use gap-4.
These values are on the Tailwind scale; they are not invalid merely because they differ. The issue is that equivalent detail-section roles have no declared compact/default distinction, so future edits cannot tell intentional density from drift.
Recommendation: define compact field rows, normal sections and major panel gaps as shared variants. Preserve denser financial summaries and the quotation builder where their tasks justify it. Suggested workflow: Impeccable document/layout.

### S4 — P2: Shared field value cells do not wrap long unbroken values
Location: `apps/web/components/detail-page.tsx:157` (FieldRow value span).
The value span has min-w-0, but no overflow-wrap rule. Long URLs/codes/emails without break opportunities can extend beyond the cell, unlike shared table cells, which explicitly use `[overflow-wrap:anywhere]`.
Recommendation: apply a safe wrap rule to read-only field text/links while preserving editor controls and numeric formatting. Test long URLs, email addresses, registration strings and translated labels. Suggested workflow: Impeccable harden/adapt.

## Responsive risks requiring rendered verification

R1: `DetailTabs` uses `lg:col-span-2` without `min-w-0` (`detail-page.tsx:104`). Related tables use explicit computed column widths. Verify that a wide table scrolls inside its card rather than enlarging the grid track. If reproduced, add min-w-0 at the grid boundary and retain the table's internal horizontal scrolling.

R2: Detail fields switch to side-by-side labels at viewport `sm`, and Account Details sections also split at viewport `sm`. These nested decisions use viewport width, not the actual card width. With a sidebar and two sections, label/value areas may become cramped before a new viewport breakpoint. Verify 640/768/1024/1280px widths, expanded/collapsed sidebar and 200% text zoom; consider container-query thresholds if compression is confirmed.

## What should remain

- PageBody uses 16px outer padding, rising to 24px at lg, and 16px block gap (`page-header.tsx:13`).
- Cards expose one spacing token with default/compact sizes; reuse these rather than overriding padding on every page.
- Most forms already stack then use sm:grid-cols-2 with gap-4; retain this predictable form rhythm.
- Shared table toolbar and pagination wrap; tables contain horizontal scrolling and wrap cell text.
- Tabs already allow wrapping. Do not replace them with a nonwrapping strip without a deliberate navigation decision.
- Settings uses a separate stacked-to-sidebar layout with min-w-0 on its content.
- Printable quotation pages intentionally use paper dimensions/mm spacing. These are valid document-layout exceptions, not app spacing defects.
- `/projects/new` and `/tax-settings` are redirects; absence of PageBody there is not a gap. Settings children inherit PageBody from settings/layout.

## Proposed implementation checklist

- [ ] Document app spacing roles: inline controls 8px, normal field/toolbar groups 12–16px, panel gaps 16px, major sections 24px; mark compact summaries and print documents as explicit exceptions.
- [ ] Make PageHeader action groups wrap and shrink safely.
- [ ] Standardise TabsCard inset with card tokens; expose intentional minimum-height variant.
- [ ] Add safe read-only value wrapping to FieldRow.
- [ ] Verify nested grid containment, then add min-w-0/container-based breakpoints where evidence supports them.
- [ ] Apply named variants across detail pages, quotation builder, dashboard, forecast, approvals, settings and forms; avoid replacing every gap with one number.
- [ ] Keep spacing/typography owned by shared UI variants; consider scoped shadcn lint contracts after those rules exist.
- [ ] Validate desktop/mobile, long data, empty/loading/error states, expanded sidebar and text zoom. Final bounded polish pass.

## Inventory by module

| Module | Page entries |
|---|---:|
| accounts | 2 |
| approvals | 1 |
| audit | 1 |
| billing | 2 |
| dashboard | 1 |
| forecast | 1 |
| funnel | 2 |
| intercompany | 1 |
| leads | 3 |
| opportunities | 2 |
| payment-milestones | 2 |
| persons | 2 |
| products | 2 |
| project-codes | 2 |
| projects | 3 |
| purchasing | 1 |
| quotations | 4 |
| sales-orders | 2 |
| settings | 16 |
| tax-settings | 1 |
| team | 2 |
| voids | 1 |

## Route inventory

- `accounts/[id]/page.tsx`
- `accounts/page.tsx`
- `approvals/page.tsx`
- `audit/page.tsx`
- `billing/[id]/page.tsx`
- `billing/page.tsx`
- `dashboard/page.tsx`
- `forecast/page.tsx`
- `funnel/[id]/page.tsx`
- `funnel/page.tsx`
- `intercompany/page.tsx`
- `leads/[id]/convert/page.tsx`
- `leads/[id]/page.tsx`
- `leads/page.tsx`
- `opportunities/[id]/page.tsx`
- `opportunities/page.tsx`
- `payment-milestones/[id]/page.tsx`
- `payment-milestones/page.tsx`
- `persons/[id]/page.tsx`
- `persons/page.tsx`
- `products/[id]/page.tsx`
- `products/page.tsx`
- `project-codes/page.tsx`
- `project-codes/view/page.tsx`
- `projects/[id]/page.tsx`
- `projects/new/page.tsx`
- `projects/page.tsx`
- `purchasing/page.tsx`
- `quotations/[id]/page.tsx`
- `quotations/[id]/preview/page.tsx`
- `quotations/new/page.tsx`
- `quotations/page.tsx`
- `sales-orders/[id]/page.tsx`
- `sales-orders/page.tsx`
- `settings/access/page.tsx`
- `settings/billing/invoicing/page.tsx`
- `settings/billing/numbering/page.tsx`
- `settings/billing/page.tsx`
- `settings/billing/tax/page.tsx`
- `settings/documents/page.tsx`
- `settings/general/page.tsx`
- `settings/page.tsx`
- `settings/people/page.tsx`
- `settings/security/page.tsx`
- `settings/subscription/page.tsx`
- `settings/taxonomy/funnel-stages/page.tsx`
- `settings/taxonomy/industries/page.tsx`
- `settings/taxonomy/page.tsx`
- `settings/taxonomy/product-codes/page.tsx`
- `settings/taxonomy/project-natures/page.tsx`
- `tax-settings/page.tsx`
- `team/page.tsx`
- `team/roles/page.tsx`
- `voids/page.tsx`

## Verification

Mechanical Impeccable detector ran once over `apps/web/app/(app)` and `apps/web/components`: zero findings. This detector result does not check computed spacing, wrapping or usability, and does not override the source findings above. Audit-only: no product code or dependencies changed and no production records touched. No tests were rerun because this pass produced documentation only.
