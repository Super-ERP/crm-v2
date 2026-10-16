# Q-App GitBook quality review

Reviewed October 1, 2026 against `docs/user-guide`, the published guide at
<https://jienweng.gitbook.io/q-app/>, and GitBook's current documentation.

## Findings and changes

| Finding | Change |
| --- | --- |
| Quick start, FAQ, troubleshooting, and changelog existed but were absent from published navigation. | All 14 guide pages now appear once in `SUMMARY.md`; filenames and site/space keys remain unchanged. |
| The landing page asked users to read chapters in order. | Added a task directory, short glossary, and role checklists. |
| Plain-text drawings and wide flows were difficult to scan. | Replaced text drawings with a control table and native Mermaid; simplified flows to vertical layouts with text explanations. |
| No content images existed; the live landing page only contained site-icon images. | Added two locally stored PNG copies of the main workflow and conversion diagram, each with alt text and captions, in expandable blocks. These are diagrams, not application screenshots. |
| GitHub alerts and new heading links needed GitBook-compatible formatting. | Converted alerts to native hints. Confirmed the live page's `and` anchors and updated jump links accordingly. |
| The guide described Approvals as a quotation inbox with Pending/History tabs. | Corrected it to stage requests with Incoming/My requests; quotation approval happens on the quotation. |
| Revisions were incorrectly shown changing the original quotation back to Draft. | Diagram and prose now distinguish returning an Approved quote to Draft from creating a separate historical revision. |
| Docs claimed every default was immutable at quote creation. | Clarified the tax snapshot at sending and the need to review draft defaults. |
| Milestone guidance invented a row/detail status-change action and invoice-reference fields. | Documented the supported Won-to-Invoiced transition and the current absence of a status control. Removed unsupported click instructions. |
| Release dates and feature assignments lacked matching entries in the repository release log. | Replaced the public changelog with dated guide updates, without implying a product release. |

## Verification

- Checked 14 content pages and 14 unique navigation entries.
- Checked 114 local page links and heading anchors.
- Checked page metadata, one H1 per page, balanced code fences and GitBook blocks.
- Rendered all eight Mermaid diagrams with the Mermaid CLI; simplified diagram widths are at most 360 logical pixels in the local renderer.
- Both static PNG assets decode successfully and include nonempty alt text and captions: workflow 720 × 1536 (82,098 bytes), conversion 336 × 1344 (50,411 bytes).
- Inspected both static image files and a rendered review sheet of all eight diagrams visually.
- `git diff --check` passed.

The guide also incorporates manager-only routing and paginated approval queues from main commit `f537568` (#241).

Sources checked for behavior include the application sidebar, stage-gate policy,
quotation transitions and revision policy, quotation send/accept actions,
approvals page/client/actions, payment milestone lifecycle and detail/shared
panel, and the lead conversion form.

## Remaining visual checks

No connected browser was available in this session. The public HTML and LLM
index were fetched successfully, but live desktop/mobile interactions and dark
mode were not verified. Local rendering checks do not guarantee identical
GitBook rendering. After syncing, check navigation, role tabs, hints, expandable
image copies, diagrams, and jump links on desktop and mobile in both themes.

There are no verified application walkthrough screenshots in this guide yet.
Capture them from an authorized demo workspace, with sample records, when a
browser session is available. Useful first captures: workspace/list controls,
lead conversion, quotation approval/revision, and stage-request review. Keep
labels readable, crop to the relevant action, and add separate alt text and a
caption explaining the action.

The current milestone status-control gap is an application limitation, not a
GitBook formatting issue. This documentation change does not add an app control.
GitBook visual checks remain pending after syncing.

## GitBook references

- [Content configuration](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration)
- [Native Mermaid blocks](https://gitbook.com/docs/create-content/blocks/mermaid-blocks)
- [Images, alt text, captions, and theme variants](https://gitbook.com/docs/create-content/blocks/insert-images)

## Maintaining the static diagrams

The Mermaid fences in `README.md` and `02-leads-management.md` are the source for
the corresponding PNG copies. When either flow changes, render its fence to PNG
again with the Mermaid CLI (neutral theme, Arial, white background, scale 2),
replace the corresponding asset, and update its alt text and caption if needed.
Keep user-visible instructions in text as well as diagrams. Local assets remain
inside the mapped GitBook space so sync can resolve them.

## Full documentation and reference follow-up

Added a dedicated Documentation overview with nested module guides, a Reference
section covering terminology, stages/statuses, and permissions/approval routing,
and a Changelog section separating product changes from guide updates. The
landing page now uses GitBook cards and a first-time stepper. All procedures and
role checklists use native step blocks; definitions remain reference lists/tables.
Product-change dates come from merged PRs #238–#241 and do not claim deployments.
Legacy grouped URLs are mapped through redirects in both GitBook configurations.

GitBook format references: [Stepper](https://gitbook.com/docs/create-content/blocks/stepper)
and [Cards](https://gitbook.com/docs/create-content/blocks/cards).

Follow-up validation: 19 pages and 19 unique navigation entries; 168 Markdown
links/anchors plus four landing-card targets; 27 balanced steppers containing 103
titled steps; 11 existing redirect targets in each GitBook configuration. No
plain numbered procedures remain. Existing Mermaid source and PNG assets are
unchanged. `git diff --check` passed.

## Separate site tabs and yearly changelog

Replaced the single-space site with four native site sections: Getting Started,
Documentation, Reference, and Changelog. Each section maps to a self-contained
content directory and its own sidebar. The existing `user-guide` space key is
preserved. Cross-section links use published Q-App URLs; each referenced image
remains inside its owning space. Old per-space redirects whose target pages moved
to another space were removed, because GitBook space redirects cannot resolve
sibling content directories. Site-level redirects for old bookmarks would need
to be configured in GitBook; they were not added in this session.

The changelog now has a yearly archive, with 31 verified releases for 2026,
version/date headings, and concise bullet entries. Dates come from published
release metadata, replacing the earlier merge-date notes and inaccurate dates in
the original draft. There are no source, pull-request, author, or repository links
in the published content. Guide updates have their own compact dated list.

Validation: official GitBook configuration schema passes; four section defaults
and unique keys are valid; 21 pages/navigation entries, 103 local links and 68
cross-section links, 27 steppers/103 titled steps, eight unchanged Mermaid
diagrams, and two local images checked. Scanning all four mapped directories found
no GitHub links. Native site sections require GitBook's Ultimate site plan; preview
sync must confirm availability before claiming the tabs are live.

## Active rollout scope correction

The user confirmed that only Base modules and Advanced Roles are enabled.
Removed the Projects/Sales Orders guide, delivery role checklist, inactive
Forecast/Audit viewer instructions, finance cost-panel claims, delivery glossary
entries, and cross-links. The landing Mermaid now ends at payment milestones;
removed its outdated static image. Kept the core lead-conversion image. Added
source-verified Advanced Roles permission steps and scoped release notes to
customer-facing changes in the active rollout. Administration now has its own
sidebar group and updated canonical links.

Validation: 20 pages/navigation entries; 95 local and 63 cross-section links;
25 steppers with 95 steps; seven Mermaid diagrams; one captioned image. All
links, anchors, Liquid blocks, and navigation entries pass. No inactive-module
instructions or GitHub links remain in the published content.

## Approval and document clarity review — October 2

Checked the last locally available merged main (975ade7) against quotation
transitions, revision policy, approval routing, action handlers, permission labels,
and stage decision validation. Network DNS is unavailable, so newer origin
commits and live rendering could not be verified this session.

Added a document/action reference, permission and routing matrix, routing examples,
version-specific approval rules, a review stepper, and quotation status/action
table. Clarified Send versus email, PDF versus approval, primary selection,
delete versus rejection, validity/open-funnel guards, and the single live
Accepted quotation limit. Kept the active Base/Advanced Roles scope.

Remaining product questions, not solved by documentation:
- Accepted-quote replacement: a revision can be created, but accepting it is
  blocked while another live quotation is Accepted. There is no documented
  supersession action. Define and implement that flow before promising it.
- Approved totals: sending recomputes tax and totals from current tax settings.
  Decide whether changes should invalidate approval or approval should freeze
  the reviewed financial snapshot. Current docs tell readers to inspect the
  final PDF; this does not enforce approval of changed totals.
- Milestone status: the supported Won-to-Invoiced action lacks a visible
  status-editing control in the inspected UI. Keep this limitation explicit.
- Quotation routing changes: quotation decisions recheck the current manager,
  while stage decisions additionally require the stored assignment. UI context
  should clearly show who can act now after reporting-line/permission changes.
- Templates/export: examples showing quotation identity, version, status, and
  template choice would improve confidence; no current browser is connected
  for accurate screenshots.

Validation: all 21 mapped pages/navigation entries and local/cross-space links
pass, Liquid steppers are balanced, diagrams remain in active scope, and no
GitHub links appear in published content. git diff --check passes.

## Default roles and RBAC comparison — October 2

Added a dedicated Roles and RBAC guide with all seven ROLE_TEMPLATES and four
native GitBook comparison tabs. Verified grants against permissions.ts,
record scope against access-scope.ts, and configuration steps against the team
and roles UI/actions. Corrected earlier incomplete role lists, Viewer scope,
System-role mutability, and Manage users versus Manage roles requirements.
Explained additive grants, reporting managers, legacy tiers, custom-role setup,
assignment limits, and approval eligibility. Only the active Base and Advanced
Roles capabilities are compared. No tenant permissions were changed.

All seven default role names appear in every comparison tab. Navigation, links,
anchors, balanced blocks, and git diff --check pass. Work was isolated from
unrelated application edits in a documentation worktree.

## Approval workflow audit — October 15, v1.2.177

Compared the guide and reference pages with deployed source commit
`1a43e697c1e6756413c13cd005b530e063579d16` (#261): lead conversion
submission/decision service and form, shared manager routing, quotation actions,
stage request/decision service, all three inbox queries/cards, permission templates,
and the payment-milestone lifecycle.

Corrected the stale claim that lead conversion has no approval, the quick-start's
separate quotation-review instruction, default Rep/Senior Rep reporting scope,
old Planned/Won milestone states, and KIV's former queued-reopen limitation.
Added the lead approval permission matrix, exact Submit conversion action,
atomic conversion/failure behavior, current-requester permission checks, and the
three-section inbox. Clarified that stage inbox assignment and record-scoped
quotation/lead inboxes have different read rules, and that stage reassignment
requires cancellation/resubmission while quotation/lead routing is dynamic.
The quotation flow diagram now includes eligible top managers' direct approval.
Removed the old static conversion diagram, which omitted approval.

This entry supersedes earlier audit statements that described the stage-only
inbox, unconditional stage-approver bypass, or the pre-approval conversion flow.
The audit updates repository GitBook content; publication is a separate Git sync
step after merge. No navigation configuration or application behavior changed.

## Full user-documentation source audit — October 15, v1.2.177

This expands the approval-only pass above. Read every Markdown content page in
`gitbook-documentation`, `gitbook-reference` and `user-guide`, and the legacy
`USER_GUIDE.md`; read the three SUMMARY files as navigation inventories without
editing them. Compared material workflow claims with the checked-out deployed
implementation baseline `1a43e697c1e6756413c13cd005b530e063579d16` and retained the
prior approval corrections. The table records source coverage, not a claim that
every deployed tenant configuration or rendered screen has been exercised.
Paths below are relative to `apps/web/` unless prefixed `docs/`.

| Content page | Implementation evidence and result |
| --- | --- |
| `docs/user-guide/README.md` | `server/services/conversion.ts`, `server/services/stage.ts`, `server/services/milestone-status.ts`: overview distinguishes conversion approval, customer acceptance, Won and explicit schedule setup. |
| `docs/user-guide/quick-start.md` | `app/(app)/leads/[id]/convert/convert-form.tsx`, `app/(app)/approvals/`, quotation actions and team/roles pages: retained current role checklists; corrected Pending Approval quote recall guidance. |
| `docs/user-guide/01-workspace-and-views.md` | `components/data-table.tsx`, `components/saved-view-menu.tsx`, `app/(app)/_shared/saved-view-actions.ts`, `lib/saved-views.ts`, `app/(app)/dashboard/actions.ts`, dashboard currency control, `lib/access-scope.ts`: corrected search scope and exact save/default-view actions. Dashboard aggregation is currency-separated and due follow-ups are limited to ten with a full count. |
| `docs/gitbook-documentation/README.md` | Module destinations and linked guides inspected; Base-module overview does not prescribe optional delivery/finance workflows. |
| `docs/gitbook-documentation/02-leads-management.md` | Lead form/actions/detail actions, conversion form, `server/services/conversion.ts`, lead-conversion approval actions and routing service: email requirement, creator ownership, typed disqualification reason, locked Converted/Disqualified state, conversion-created records and atomic approval checked. No dedicated restore action. |
| `docs/gitbook-documentation/03-accounts-and-contacts.md` | Account/contact forms and actions, account detail body, `lib/access-scope.ts`, `server/services/owner-cascade.ts`, quotation billing actions: corrected code format/automatic generation, create labels, optional manual-contact email, account relation-count description and currency-default wording. Shared reseller reading does not broaden transaction scope. |
| `docs/gitbook-documentation/04-opportunities-and-funnel.md` | `server/services/stage.ts`, `lib/stage-gate.ts`, `lib/funnel-stages.ts`, stage-change UI, funnel filters/views and seed configuration: retained earlier-stage gate matrix, Won and board exceptions, KIV policy and terminal behavior. Corrected a remaining unconditional approver bypass sentence. |
| `docs/gitbook-documentation/05-quotations-and-revisions.md` | Quotation form/actions, `lib/quotation-revision-policy.ts`, `lib/quotation-transitions.ts`, `server/services/numbering.ts`, `server/services/quotation-math.ts`, `lib/quotation-pdf-template.ts`, preview PrintButton and PDF route: checked statuses, copy/revision/deletion, primary quotation, running/version numbers, billing and tax snapshots. Corrected amount discounts, product-filled fields, currency defaults, configured templates and Download PDF/Print controls. |
| `docs/gitbook-documentation/06-payment-milestones.md` | Milestone actions, `server/services/milestone-status.ts`, `server/services/milestone-access.ts`, `components/milestones-panel.tsx`, milestone detail body: explicit acceptance/stage eligibility, schedule split and forward-only invoicing checked. Removed stale claim that Mark invoiced is absent. |
| `docs/gitbook-documentation/08-approvals-inbox.md` | Approvals page, three workflow card/query/action paths, `server/services/approval-routing.ts`, stage service and quotation actions: retained three sections, pagination, dynamic quotation/lead routing, assigned stage reviewers and requester tracking. |
| `docs/gitbook-documentation/09-admin-and-settings.md` | `app/(app)/settings/_nav.ts`, General/Documents clients, taxonomy pages, billing tax/numbering pages, `settings/constants.ts`, stage settings, team/role actions: replaced invented Lead Sources/Lost Reasons editors with actual taxonomy destinations; clarified separate tax configuration/permissions. |
| `docs/gitbook-documentation/roles-and-rbac.md` | `lib/permissions.ts` ROLE_TEMPLATES, `lib/access-scope.ts`, team/roles UI/actions and approval routing: seven defaults and additive grants retained. Corrected obsolete milestone-interface limitation. |
| `docs/gitbook-documentation/help-center/faqs.md` | Same conversion, access, stage, quotation and milestone implementations as corresponding task guides: corrected leftover Won→Invoiced and missing-action statements. |
| `docs/gitbook-documentation/help-center/troubleshooting.md` | Stage service/gates, quotation actions and preview controls, account form, milestone actions/detail/shared panel, conversion approval service: corrected milestone action instructions and Pending invoicing terminology. |
| `docs/gitbook-reference/README.md` | Reference links and scope checked against the four reference content pages. |
| `docs/gitbook-reference/terminology.md` | Conversion service, account/contact schema and forms, opportunity/funnel model, quotation actions, milestone eligibility and access scope: definitions retained; changed account currency from a universal downstream rule to a default. |
| `docs/gitbook-reference/stages-and-statuses.md` | Stage service/gates, quotation transitions/actions and milestone status/access services: separate record states, terminal stages, acceptance and explicit schedule setup retained. |
| `docs/gitbook-reference/permissions-and-approvals.md` | Permissions/access-scope, approval-routing, owner-cascade and the three workflow action paths: current grants, reviewer eligibility, scope and ownership-change behavior retained. |
| `docs/gitbook-reference/documents-and-actions.md` | Quotation actions/revision policy, lead conversion and approval routing, stage service and milestone status: record-specific approval, independent revisions, accepted-quote restriction and PDF/action distinctions retained. |
| `docs/USER_GUIDE.md` | Cross-checked against the implementation groups above. Replaced the stale duplicate manual with a concise workflow and links to maintained task guides. Removed obsolete four-role tiers, unrestricted rollback, automatic Won milestones, immutable-at-creation defaults, percentage discounts, revision suffix examples and unsupported optional Projects/Sales Orders instructions. |

### Limits and follow-up

This was a repository source and documentation audit. It did not sign in as each
role, create live commercial records, download representative PDFs, or verify
live tenant-specific stage gates, branding, numbering and enabled modules.
Browser rendering, actual PDF pagination and live reporting-profile permissions
still require deployment QA. Public GitBook publication/sync was not performed
by this audit; repository edits do not prove the published pages have updated.

This audit snapshot predates the project-code feature. At audit time, only the
internal Opportunity code was generated at 4A and the importer omitted Salesforce
source codes. PR #263 subsequently added source-code import and core CRM display;
the maintained sales guides describe that behavior and its later directory and
stage-visibility refinements. This historical inventory is not a live release
status report. Optional delivery, procurement and finance workflows need their
own deployment-specific guides if they become part of this Base documentation.

Historical review entries above describe earlier snapshots. Where they conflict
with this inventory, the current content and this entry supersede them.


## Published-site and user-understanding follow-up — October 16

Compared the public site with source `994d65b` and current quotation billing, access-scope, approval routing/queue, stage detail and header-filter code. Public pages still displayed October 1–2 guidance, including automatic Planned/Won milestones, stage-only approvals and Rep/Senior Rep team scope. Source changes alone have not established publication.

Corrected remaining source references to Incoming/separate approval sections, outdated filter toolbar actions, ambiguous sales scope and the navigation label. Added practical reseller/end-user quotation steps, billing-account contact/address snapshots, missing-Won and missing-address troubleshooting, unavailable-reviewer guidance, cross-entity import limitations, free-text Contract versus hidden Contract tracker, and expanded team Q&A. Consolidated the Funnel guide's appended duplicate queue/filter instructions and corrected related-page navigation.

The dated [October 16 audit](operations/gitbook-audits/2026-10-16-live-vs-implementation.md) tracks source corrections separately from publication and operational data follow-up. GitBook administration requires sign-in in the available browser; public publication remains pending verification. No current customer address or ownership was changed by this documentation follow-up.
