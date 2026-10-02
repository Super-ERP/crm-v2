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
