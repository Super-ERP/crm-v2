# CRM frontend interface, linkage and field-meaning audit

Date: 17 November 2026. Baseline: production v1.2.203 / main 4f865314; the audited checkout has an equivalent application tree. Skill: frontend-ui-engineering, including its accessibility checklist. This is an audit, not an implementation or production change.

## Outcome

The main problem is semantic consistency: identical-looking money, owner and relationship fields sometimes represent different sources. Changing spacing alone would leave important user misunderstandings intact. Fix incorrect monetary displays first, then establish shared field descriptions and links, then polish layouts and accessibility.

Priority definitions: P1 = can materially mislead a commercial decision or block a common navigation task; P2 = confusing workflow, provenance or accessibility; P3 = consistency/polish. These are audit priorities, not production incident declarations.

## Scope and evidence limits

- Inventoried all 58 web page route files: 53 authenticated routes plus sign-in, documentation, root redirect and quotation-preview alias.
- Recursively traced route components into module tables/forms/details, shared controls, readers/actions, monetary calculations and relationship rules. Table catalogue contains 46 dataset keys in 29 files. This is not a claim that every field or every permission/state combination was exercised.
- Captured 23 current-build demo screenshots: 14 desktop screens (including Account), plus Account, Opportunity and Funnel at 320/768/1024 px. Desktop width was 1440 px. Used existing fictional demo data, not customer data. All 22 automated route captures completed without the detected page error boundary.
- T3 preview was explicitly unavailable because the host blocks its browser sandbox through AppArmor. Used installed headless Chrome with a dedicated demo profile after that failure. DOM and screenshots were inspected; no screen-reader session, manual keyboard traversal, automated axe scan or measured contrast certification was performed.
- The demo displays an expired-lease grace banner. Its presence is an environment condition, not evidence of a production billing problem.
- Existing product code, production records and production deployment were not changed. Build succeeded on retry. Initial build surfaced a dependency security warning; see the separate note at the end.

## What the Funnel amount actually means

### Current behavior

The main Funnel table's “Est. funnel amount” and each board card use `estimatedAmount ?? amount`. `estimatedAmount` is the manually entered Funnel estimate. `amount` is normally synchronized from the primary quotation's **net amount excluding tax**, calculated as quotation subtotal minus header discount. Thus the same column can show an estimate for one row and a quoted net value for another, without telling the reader which source was used.

An explicit stored zero estimate is retained by the nullish fallback; a missing estimate falls through to quoted amount. A card is not showing tax-inclusive quotation total, invoiced value, cash received, probability-weighted forecast or the entity's allocated share.

The board's stage total uses the same effective values, but currently sums across currencies and formats the result using the default MYR. Opportunity's “Total est. funnel amount” instead sums only `estimatedAmount`, grouped by currency, across non-deleted child Funnels. It does not apply the quoted fallback and is not inherently a current-filter/active-stage total. These are different measures, despite similar labels.

The Forecast is yet another measure: for own-entity rows it uses the manual estimate (missing = zero), multiplied by stage probability (`db/sql/views.sql:24–43`), without the quotation fallback. “Recognized” is the entity's commercial allocation of that weighted estimate, not a receipt or accounting recognition event. Inbound partner rows use their allocated share of quoted net, falling back to estimated value (`forecast/actions.ts:137–166`). These source rules should be visible; current introductory copy referring to primary quotations is inaccurate for own-entity rows.

### Recommended visible vocabulary

- Funnel name: the commercial deal description. Opportunity number/name: its parent pursuit/container, often generated as QMOPP-YYYY-NNNN. Pipeline: the configured sales process; not another deal record.
- Estimated deal value (excl. tax): manual estimate only; missing means “Not set”, not zero.
- Primary quote net (excl. tax): subtotal minus header discount; show the linked quotation revision and its status.
- If retaining a combined headline: call it “Deal value (excl. tax)” and add “Estimated” or “From Qxxxxx-x” beside each value. Do not silently change the source behind an estimate label.
- Stage estimated total: group by currency; state whether it covers all matching cards or only the loaded page. Current server total is all matching rows in that stage.
- Probability-weighted value: deal basis × stage probability. Our weighted share: weighted value × allocation rule.
- Invoiced: issued invoice amount on a defined tax basis. Received: actual receipt amounts. Outstanding: defined invoice balance after receipts/credits. Do not use any of these as synonyms for deal value.

## Findings: Funnel, names and relationship clarity

### F01 — P1: Board stage totals give foreign-currency values an RM label

Evidence: `apps/web/lib/api-readers.ts:992` sums `coalesce(estimatedAmount, amount, 0)` without grouping/conversion. `apps/web/app/(app)/funnel/funnels-board.tsx:161` calls `formatMoney(valueTotal)` without a currency. Cards pass their own currency at lines 67–68. Observed in the demo: the Identified stage says **RM 174,000.00**, above **US$54,000.00** and **US$120,000.00** cards. No FX conversion happened.

Correction: return per-currency stage totals and format each bucket. If one base-currency headline is wanted, introduce an explicit dated FX policy and label; do not assume one. Regression must include two currencies in one stage and pagination.

### F02 — P2: Estimate column silently substitutes quotation value

Evidence: `funnel/funnels-table.tsx:56–68`, `funnel/funnels-board.tsx:67`, and `api-readers.ts:917`. `server/services/value.ts:23–28, 60–65` defines quotation net. Detail already separates “Estimated funnel amount” and “Quoted amount” (`funnel/[id]/funnel-detail-body.tsx:1016–1048`).

Correction: retain two selectable measures, or explicitly label the fallback source. Suggested default column: “Estimated deal value”; optional “Primary quote net”. If the business prefers one effective value, use “Deal value” plus source. Agree that business meaning before changing calculations.

### F03 — P2: Opportunity totals do not necessarily reconcile with Funnel list values

Evidence: `server/services/opportunity-container.ts:175–201` aggregates only estimates of all non-deleted children, while F02's list substitutes quotes and may be filtered. Related Opportunity Funnel rows also use the raw estimate. A missing estimate with a quote can appear as a positive list value but contribute zero to the parent estimate total.

Correction: use one explicitly named measure per rollup. State “All non-deleted child estimates, by currency” for the existing parent total. Never imply it is a current-filter total or booked revenue. Test missing estimates, zero estimates, Lost/Won children and mixed currencies.

### F04 — P2: Funnel identities and owner roles are underspecified

Evidence: main list says “Name”, “Account”, “Opportunity” and “Account owner” (`funnel/funnels-table.tsx:17,27,47,53`). Board shows Funnel owner `c.ownerName` without a role label (`funnels-board.tsx:71–72`), whereas the default list shows Account owner. Detail labels the configured pipeline “Funnel” beside a separate “Funnel Name” (`funnel/[id]/funnel-detail-body.tsx:970–988`).

Correction: use “Funnel / deal name”, “End customer”, “Parent Opportunity”, “Account owner”, “Salesperson / Funnel owner” and “Pipeline”. Board person should have a concise role hint. Generated Opportunity code should be called “Opportunity number” where it is the identifier, not presented as a human-readable project description.

### F05 — P2: Related-record names frequently cannot be followed

Evidence: Funnel list Account and parent Opportunity are plain text despite available IDs (`funnel/funnels-table.tsx:25–30,45–48`); Opportunity list Account is plain text (`opportunities/opportunities-table.tsx:30–36`). Forecast Funnel names are spans despite `funnelId` (`forecast/forecast-client.tsx:38`). SO Source Funnel/Quotation and finance SO/Quotation are also plain text (`sales-orders/[id]/sales-order-detail-body.tsx:97–104`; `billing/[id]/doc-detail-body.tsx:150–152`).

Correction: a shared permission-aware record-reference component for name/number, route, optional secondary identifier and unavailable/deleted state. Link the actual record, not a generic directory. Inbound intercompany IDs are not own-tenant Funnel IDs; use a separate accessible drill-down, never an assumed `/funnel/{id}` link.

### F06 — P1: Opportunity detail Account owner can name the Opportunity owner instead

Evidence: `api-readers.ts:700–705` resolves `opp.ownerMemberId`; `opportunities/[id]/opportunity-detail-body.tsx:250` labels it “Account owner”. List reader resolves actual Account owner separately (`api-readers.ts:581`).

Correction: return distinct account owner, internal Opportunity owner and customer owner-contact fields; never reuse one owner label. Test deliberately different owners.

### F07 — P2: Converted-lead link describes the wrong entity

Evidence: `api-readers.ts:145–152` derives pipeline-definition name from `lead.pipelineId`. `leads/[id]/page.tsx:74–83,163–164` and `lead-detail-body.tsx:234–235` use that label while linking to the converted Opportunity.

Correction: resolve actual converted Opportunity number/name and show it as “Converted Opportunity”. Keep pipeline name under “Pipeline”. Preserve unavailable/deleted/access-denied states.

### F08 — P2: Contact related tabs do not explain which relationships count

Evidence: `api-readers.ts:489–506` selects Funnels where this person is the Funnel primary contact and Projects from those Funnels. `persons/[id]/person-detail-body.tsx:262–283` presents broad Funnels/Projects tabs and account-oriented empty guidance.

Correction: state “Funnels where this person is the primary contact” and distinguish owner-contact/sponsor/account relationships. Do not suggest all account work must appear here. Related counts and empty-state text should explain the same membership rule.

### F09 — P2: Account create actions silently choose a Funnel

Evidence: `accounts/[id]/account-detail-body.tsx:152` chooses `pipelines[0]?.funnelId`; create quotation/project links use it at lines 576/608. Reader ordering by stage/name (`api-readers.ts:353`) is not user intent.

Correction: require a Funnel choice or show the exact preselected deal beside the action with a change control. Test Accounts with multiple Funnels.

### F10 — P2: Column controls/export names differ from the visible measure

Evidence: `lib/table-controls/registry.ts:8–12,41` has no Funnel-specific label override for `amount`; it becomes “Amount”, while the custom visible header says “Est. funnel amount”. `lib/table-controls/export.ts:13` uses field metadata labels for CSV headers. Related Account/Contact tables also call estimates “Value”.

Correction: metadata should own the business label and description used by header, Columns, filters, saved views and export. Preserve existing field IDs/saved layouts. Include source, grain, currency and tax basis in that metadata; labels alone cannot repair wrong calculations.

## Findings: commercial amounts and documents

### F11 — P1: Milestone details relabel USD as RM

Evidence: list resolves quote/Funnel/Project currency (`payment-milestones/actions.ts:102–115`), detail omits it (`:158–180`), detail display/draft call `formatMoney(amount)` (`payment-milestone-detail-body.tsx:81,86,102`). Demo database says UAT acceptance = 15,960 USD; screenshot displays RM15,960.00.

Correction: one shared currency resolver for list/detail/edit. Display “Planned amount (excl. tax)” with real currency. Verify legacy Project-only and quotation-only milestones as well as Funnel-linked ones.

### F12 — P1: Opportunity product unit prices use the parent's currency

Evidence: product reader selects child Funnel currency (`api-readers.ts:776`), product action type omits it (`opportunities/actions.ts:75`), and formatter uses `o.currency` for every product (`opportunities/[id]/opportunity-detail-body.tsx:223–231`).

Correction: preserve per-product currency and use it for display/export. No relabelling or implicit conversion across child Funnels. Test MYR Opportunity with USD child products.

### F13 — P1: QAR/CC quotation totals hide header discount

Evidence: `quotations/[id]/preview/entity-quotation-document.tsx:165–170` renders subtotal, tax and final total without discount; CC calls subtotal “Total (excl. of SST)”. `server/services/quotation-math.ts:62–71` calculates net = subtotal − header discount, then tax.

Example: subtotal 1,000, discount 100, tax 54, final 954. Current customer document can show 1,000 + 54 = 954 with no explanation. Correction: Subtotal, Header discount, Net excluding tax, Tax, Total including tax. Check both browser preview and exported PDF for every entity template, including zero tax and discounts.

### F14 — P1: Project “paid” is not actual receipts

Evidence: `billing/actions.ts:1016–1017` sums face value of settled invoices for paid; `projects/[id]/billing-panel.tsx:39–42` calls this “paid”. Partial receipts leave parent issued (`billing/actions.ts:530–570`).

Correction: distinguish actual received receipts from invoice settlement state and derive outstanding consistently with credit notes. A 40% receipt must show 40% received, not zero. A manual settled flag must not masquerade as documentary receipt evidence.

### F15 — P1: Invoice creation gives no clear currency or tax basis

Evidence: `billing/finance-docs-table.tsx:193–200` labels input only “Amount”; `billing/actions.ts:384–429` inherits currency and falls back to MYR. Project value is net, but billing compares it directly with the single finance amount.

Correction: show inherited currency and define “Document total incl. tax” versus net/tax/gross. Do not change business basis without agreement. Ensure progress numerators/denominators use the same basis. Apply the same rule to Purchasing.

### F16 — P1/P2: Finance customer defaults from end user, not quotation Bill To

Evidence: `billing/actions.ts:392–405` resolves Project Account into free-text partyName; quotation separately supports Bill To and Attention (`quotations/quotation-form.tsx:760–791`). Project creation inherits end-customer Account (`projects/actions.ts:726`).

Correction: show linked End customer, Bill To and invoice Attention separately, deriving billing party from the approved source quotation/snapshot where appropriate. Keep an explicit editable choice; do not silently overwrite existing documents. Validate reseller and PSMB-type third-party payer cases.

### F17 — P2: Approved Sales Order value is live Project context

Evidence: `sales-orders/actions.ts:166–176` joins current Project value/currency and links; detail calls amount simply “Value” (`sales-order-detail-body.tsx:90–96`). Later Project edits can change what an approved order appears to represent.

Correction: either snapshot submitted/approved value/currency/quote revision or explicitly label it “Current project value” and show changed-since-approval context. Snapshotting is a separate workflow/data change, not a cosmetic rename.

### F18 — P2: Fallback quotation line “Sub-total” is a tax-inclusive final value

Evidence: `quotations/quotation-form.tsx:1507,1542` labels `lineTotal` as Sub-total; `quotation-math.ts:77–83` includes tax and allocated header discount. QM template uses a different correct field.

Correction: render lineSubtotal under “Line net before header discount”, or label final value “Line total incl. tax” and explain allocation. Avoid misleading line/header reconciliation.

### F19 — P2: Mark invoiced is a planning state without invoice evidence

Evidence: `payment-milestone-detail-body.tsx:131` changes the status; `billing/actions.ts:424–426` intentionally does not create milestone-linked documents. Detail has no invoice reference.

Correction: explain this records planning progress, not invoice creation/payment. Consider an optional linked invoice/reference rather than inventing a document. Preserve eligibility/locking rules and legacy history.

### F20 — P2: Recognized, Weighted, Value and Share are overloaded

Evidence: Funnel detail derives own commercial share from quoted net or estimate (`funnel-detail-body.tsx:330–345`); Forecast defines probability-weighted allocation (`forecast/actions.ts:30–38`) and labels “Value”, “Weighted”, “Recognized”, “% cut” (`forecast-client.tsx:101–142`). Intercompany shows quoted/estimated basis without consistent net/source labels.

Correction: “Estimated deal value (excl. tax)” for own rows, “Allocated deal basis” for inbound rows, “Probability-weighted value”, “Our allocated share”, “Our weighted share”. Correct the introduction that says the figures are computed from primary quotations: own rows use estimates in `db/sql/views.sql:24–43`; inbound basis differs. Keep actual invoiced/received/accounting recognition separate. Distinguish forecast month from expected close date in the same cell.

### F21 — P2: Not set budgets and estimates appear to be zero

Evidence: `opportunities/[id]/opportunity-detail-body.tsx:308,315` passes nullable budget to formatMoney; that helper converts null to zero (`lib/format.ts:5`). A related Funnel estimate uses the same behavior. Demo shows an unset budget as US$0.00.

Correction: display “Not set”/em dash for null; format explicit zero as zero. Preserve distinction in filtering/export. Do not globally redefine formatMoney without checking existing deliberate zero totals.

## Findings: navigation, responsive behavior and accessibility

### F22 — P1: Mobile detail pages lack an app navigation trigger

Observed at 320 px: Account and Opportunity detail show no sidebar/menu control. DOM contains zero “Toggle Sidebar” buttons and zero h1 elements. The Funnel list contains both. Detail routes omit SiteHeader; app layout renders children without a permanent header (`accounts/[id]/page.tsx`, `opportunities/[id]/page.tsx`, `app/(app)/layout.tsx:110–136`). Sidebar is off-canvas on mobile (`components/ui/sidebar.tsx:182–210`).

Correction: shared record-page shell with a mobile navigation trigger, record identity/breadcrumb and stable actions. Do not duplicate all details or bring back the removed Void page. Test back/forward, sidebar open/close and long record names at 320/768 px.

### F23 — P2: Narrow Funnel toolbar/header clips controls

Observed 320 px screenshot: toolbar continues past the viewport through Columns/Export; top header utilities also extend right. Evidence: `components/site-header.tsx:40–73` fixed-height, non-wrapping layout; `components/data-table.tsx:785–809` toolbar actions. Horizontal scrolling inside a board/table is expected; clipped page-level actions are not an adequate mobile pattern.

Correction: responsive toolbar grouping with one primary action, overflow menu for secondary actions, accessible compact search, and intentional horizontal scrolling confined to the board/table. Keep Export/Columns accessible.

### F24 — P2: Shared controls lack complete accessibility semantics

Evidence: Rows-per-page select is associated only visually with a span (`components/data-table.tsx:895–901`); headers lack aria-sort (`:841`). Settings company profile labels are not programmatically associated (`settings/general/general-client.tsx:512–591`); similar security/team/entity selects exist. Split-milestone repeated title/amount inputs use placeholders only (`components/milestone-split-dialog.tsx:130–136`).

Correction: field IDs and htmlFor/aria-labelledby; label each split amount with part and currency; aria-sort and multi-sort priority; named rows-per-page control even when visible text is hidden. Keep primitive keyboard handling. Follow with real keyboard, focus-return, screen-reader and axe checks; source alone cannot certify WCAG conformance.

### F25 — P2: Audit log conceals useful chronology and record identity

Evidence: `audit/audit-table.tsx:78` formats date without time; `:55–60` shows opaque entity ID without a record link/name; entity types can be raw identifiers.

Correction: visible date, time and timezone; human record label, event details and permission-aware detail link, with copyable historical ID fallback when deleted/inaccessible. Hover-only timestamps are insufficient.

### F26 — P2/P3: Missing headings and inconsistent restore/drill-down context

Evidence: SiteHeader renders h1 only without breadcrumbs (`site-header.tsx:47–67`), PageHeader renders h2 (`page-header.tsx:38`), several record routes omit page header entirely. Related tabs often use local component state rather than URL query state. Screenshot 768 px places the entire Opportunity summary before related work, requiring substantial vertical travel.

Correction: one page h1 for actual record identity; breadcrumbs as navigation, shareable/restorable selected tabs, relevant list-return context. Preserve the approved left-detail/right-related desktop structure; consider collapsible summaries on mobile after verifying the main job per record page.

### F27 — P3: Forecast stage-axis labels collide

Observed 1440 px screenshot: long stage labels merge/overlap along the chart x-axis. `forecast/forecast-charts.tsx` renders all configured stage labels in a constrained half-width chart.

Correction: short stage codes with full tooltip/accessible list, horizontal bars or responsive label rotation/spacing. The screenshot's blank-looking animated plots were not diagnosed as a data defect; verify after animations settle before changing chart calculations.

## What already works and should be preserved

- Shared table framework supports saved layouts, typed nested filters and exports of all accessible matching pages. Keep stable field IDs when improving text.
- Opportunity totals are grouped by currency; recent duplicate MYR/RM fix works. Reuse this approach for stage totals rather than inventing unlabelled conversion.
- Current Funnel code fallback fix preserves stored codes and parent ownership checks. Do not renumber identifiers as part of a clarity change.
- Record Edit/Save/Cancel and More→Void conventions are now largely shared. Fix remaining shell/mobile gaps without reintroducing duplicate detail surfaces.
- Approvals has explicit search/select names, busy/error treatment and decision disabling during stale/loading states. Sign-in fields are properly associated. Use these as internal patterns.
- Authentication, owner scope and server-side mutation validation remain authoritative; making a name clickable must not grant access to another record.

## Recommended implementation sequence and acceptance checks

1. **Financial truth:** F01, F11–F16. Correct currency, stage totals, discount reconciliation, receipts and visible invoice basis. Test each currency separately; include mixed currencies, null vs zero, discounts and partial receipts. Preserve existing documents and approval history.
2. **Field and relation contract:** F02–F10, F17–F21. Define each field's human label, entity/row grain, source, null behavior, currency, tax basis, aggregate scope, source link and permission state. Drive list header, tooltip/help, Columns/filter/export label from the same metadata. No arbitrary joins or user-defined financial formula engine is needed.
3. **Shared navigation and access:** F22–F26. Ensure every detail has mobile app navigation, one h1, consistent editable fields, scoped reference links and usable audit history. Deep links preserve tab/filter context.
4. **Responsive finish:** F23/F27. Verify 320, 768, 1024, 1440 with realistic long names and large amounts, keyboard traversal and focus-return. Check empty/error/loading/permission states and quotations in exported PDFs. Only then call visual/a11y verification complete.

## Separate dependency warning discovered during the audit

The first local build stopped on a Next.js security advisory; retry completed successfully without package changes. Installed Next is 16.4.1. Package audit reported GHSA-mfr8-8qww-v76h affecting 16.3.0–16.4.4, patched in 16.4.5: https://github.com/advisories/GHSA-mfr8-8qww-v76h . It concerns a specific use-cache/unstable_cache root-param combination. This audit did not establish exploitation or production exposure. Schedule a separate dependency security update; do not mix an unreviewed framework upgrade into UI copy fixes.

## Route coverage appendix

Every route below was inventoried from its page wrapper and assigned to a recursively traced family. Desktop screenshot coverage is representative rather than exhaustive. Settings aliases/redirects share their destination's audit. Permission-denied and every edit/dialog state were not exhaustively exercised.

- `apps/web/app/(app)/accounts/[id]/page.tsx` (250 lines in page wrapper)
- `apps/web/app/(app)/accounts/page.tsx` (34 lines in page wrapper)
- `apps/web/app/(app)/approvals/page.tsx` (46 lines in page wrapper)
- `apps/web/app/(app)/audit/page.tsx` (25 lines in page wrapper)
- `apps/web/app/(app)/billing/[id]/page.tsx` (41 lines in page wrapper)
- `apps/web/app/(app)/billing/page.tsx` (45 lines in page wrapper)
- `apps/web/app/(app)/dashboard/page.tsx` (411 lines in page wrapper)
- `apps/web/app/(app)/forecast/page.tsx` (81 lines in page wrapper)
- `apps/web/app/(app)/funnel/[id]/page.tsx` (354 lines in page wrapper)
- `apps/web/app/(app)/funnel/page.tsx` (69 lines in page wrapper)
- `apps/web/app/(app)/intercompany/page.tsx` (34 lines in page wrapper)
- `apps/web/app/(app)/leads/[id]/convert/page.tsx` (47 lines in page wrapper)
- `apps/web/app/(app)/leads/[id]/page.tsx` (174 lines in page wrapper)
- `apps/web/app/(app)/leads/page.tsx` (44 lines in page wrapper)
- `apps/web/app/(app)/opportunities/[id]/page.tsx` (101 lines in page wrapper)
- `apps/web/app/(app)/opportunities/page.tsx` (19 lines in page wrapper)
- `apps/web/app/(app)/payment-milestones/[id]/page.tsx` (39 lines in page wrapper)
- `apps/web/app/(app)/payment-milestones/page.tsx` (17 lines in page wrapper)
- `apps/web/app/(app)/persons/[id]/page.tsx` (124 lines in page wrapper)
- `apps/web/app/(app)/persons/page.tsx` (26 lines in page wrapper)
- `apps/web/app/(app)/products/[id]/page.tsx` (44 lines in page wrapper)
- `apps/web/app/(app)/products/page.tsx` (22 lines in page wrapper)
- `apps/web/app/(app)/project-codes/page.tsx` (16 lines in page wrapper)
- `apps/web/app/(app)/project-codes/view/page.tsx` (16 lines in page wrapper)
- `apps/web/app/(app)/projects/[id]/page.tsx` (147 lines in page wrapper)
- `apps/web/app/(app)/projects/new/page.tsx` (23 lines in page wrapper)
- `apps/web/app/(app)/projects/page.tsx` (113 lines in page wrapper)
- `apps/web/app/(app)/purchasing/page.tsx` (46 lines in page wrapper)
- `apps/web/app/(app)/quotations/[id]/page.tsx` (105 lines in page wrapper)
- `apps/web/app/(app)/quotations/[id]/preview/page.tsx` (424 lines in page wrapper)
- `apps/web/app/(app)/quotations/new/page.tsx` (50 lines in page wrapper)
- `apps/web/app/(app)/quotations/page.tsx` (23 lines in page wrapper)
- `apps/web/app/(app)/sales-orders/[id]/page.tsx` (61 lines in page wrapper)
- `apps/web/app/(app)/sales-orders/page.tsx` (32 lines in page wrapper)
- `apps/web/app/(app)/settings/access/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/billing/invoicing/page.tsx` (9 lines in page wrapper)
- `apps/web/app/(app)/settings/billing/numbering/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/billing/page.tsx` (5 lines in page wrapper)
- `apps/web/app/(app)/settings/billing/tax/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/documents/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/general/page.tsx` (6 lines in page wrapper)
- `apps/web/app/(app)/settings/page.tsx` (5 lines in page wrapper)
- `apps/web/app/(app)/settings/people/page.tsx` (5 lines in page wrapper)
- `apps/web/app/(app)/settings/security/page.tsx` (16 lines in page wrapper)
- `apps/web/app/(app)/settings/subscription/page.tsx` (23 lines in page wrapper)
- `apps/web/app/(app)/settings/taxonomy/funnel-stages/page.tsx` (9 lines in page wrapper)
- `apps/web/app/(app)/settings/taxonomy/industries/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/taxonomy/page.tsx` (5 lines in page wrapper)
- `apps/web/app/(app)/settings/taxonomy/product-codes/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/settings/taxonomy/project-natures/page.tsx` (7 lines in page wrapper)
- `apps/web/app/(app)/tax-settings/page.tsx` (5 lines in page wrapper)
- `apps/web/app/(app)/team/page.tsx` (32 lines in page wrapper)
- `apps/web/app/(app)/team/roles/page.tsx` (35 lines in page wrapper)
- `apps/web/app/(auth)/sign-in/page.tsx` (159 lines in page wrapper)
- `apps/web/app/documentation/[slug]/page.tsx` (65 lines in page wrapper)
- `apps/web/app/documentation/page.tsx` (49 lines in page wrapper)
- `apps/web/app/page.tsx` (8 lines in page wrapper)
- `apps/web/app/quotation-preview/[id]/page.tsx` (1 lines in page wrapper)

## Demo screenshot evidence

Screenshots are current-build fictional demo data. They are not customer record evidence. Files under `/tmp` are session artifacts; this report preserves the source findings independently of those files.

- Funnel desktop: /tmp/crm-ui-audit-shots/funnel-1440.png — RM stage total over USD cards.
- Milestone desktop: /tmp/crm-ui-audit-shots/milestone-1440.png — USD source rendered RM in details.
- Opportunity desktop: /tmp/crm-ui-audit-shots/opportunity-1440.png — amount/owner labels and unset budget displayed as zero.
- Account mobile: /tmp/crm-ui-audit-shots/account-320.png — no mobile app navigation trigger.
- Funnel mobile: /tmp/crm-ui-audit-shots/funnel-320.png — clipped toolbar actions.
- Opportunity tablet: /tmp/crm-ui-audit-shots/opportunity-768.png — summary-first vertical density.
- Forecast desktop: /tmp/crm-ui-audit-shots/forecast-1440.png — stage-axis label collisions.
- Full capture manifest: /tmp/crm-ui-audit-shots/manifest.json . 22 route captures plus initial Account desktop screenshot.
