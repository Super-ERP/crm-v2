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
