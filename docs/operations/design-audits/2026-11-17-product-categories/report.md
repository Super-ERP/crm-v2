# Product categories — design guide review

Product categories settings: administrator reads, finds, creates, edits and archives categories/subcategories. Source, screenshots and desktop Chrome browser evidence; review only after user supplied guide. No product-code changes made by this audit.

Snapshot: `bfae71e507b1b7c03c12e0756402b60eb80f5d14`. Selected **11 checklists / 69 items**, frozen before findings. All descriptions and tips read from the supplied complete guide; checklist text and licence retained beside this report.

## Verified findings

### Medium: validation
Items: design-system-input-field:04, design-system-input-field:06, flows-showing-input-error:03, flows-showing-input-error:04, flows-submitting-a-form:05.
Impact: Users must infer which code is invalid and may miss an ephemeral toast.
Fix: Add code-format guidance and associated inline errors with aria-invalid/aria-describedby; validate after blur/submit, expand and focus the first invalid field, and clear errors on correction.
Verify: Enter BAD! in category and subcategory codes, blur and submit; check local error, focus, retained draft and successful correction.

### Medium: required
Items: design-system-accessibility:05, design-system-input-field:02.
Impact: Required status is visible as a red star but unavailable as an input semantic to assistive technology.
Fix: Set required or aria-required on every required category/subcategory input while retaining associated labels.
Verify: Inspect the accessibility tree and confirm required state is announced by a screen reader.

### Medium: heading
Items: design-system-typography:02.
Impact: Heading navigation skips the visible Product categories section title.
Fix: Render Product categories as h2, preserving CardTitle styling and subordinate h3 sections.
Verify: Inspect visible heading structure and navigate headings with NVDA/VoiceOver.

### Low: summary
Items: design-system-accordion:04.
Impact: Add category does not share the category rows’ explicit focus treatment; hover gives no additional affordance.
Fix: Reuse one summary style with focus-visible ring and subtle hover background for all expandable groups.
Verify: Tab through both summary types and compare focus/hover in light and dark themes.

### Low: search
Items: design-system-searchbar:06.
Impact: Long lists cannot be searched while making edits.
Fix: Keep drafts in parent state keyed by stable row IDs so search can stay enabled without discarding hidden edits.
Verify: Type an unadded subcategory, filter away/back, and verify draft persistence and safe Save behaviour.

### Low: spacing
Items: design-system-spacing-and-grid:02.
Impact: Future spacing changes require editing repeated row/section utility classes.
Fix: If this taxonomy editor pattern is reused, extract shared row/section spacing tokens rather than introducing a separate visual scale.
Verify: Compare all taxonomy editor spacing after changing the shared token.

Spacing-token extraction is a maintainability recommendation; its Low priority is distinct from the observed field-validation/accessibility defects.

## Item ledger

| Audit ID | Exact item title | Status | Location/state | Evidence | Reason |
|---|---|---|---|---|---|
| design-system-accessibility:01 | Target conformance level | Unverified | Contribution guidelines | none: none | This screen review does not establish a repository-wide conformance target. |
| design-system-accessibility:02 | Colour contrast standards | Unverified | All themes/states | none: none | No measured contrast matrix was run. |
| design-system-accessibility:03 | Focus indicator design | Present | Accordion summary focus | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-search-keyboard.log | Space opened the row with focus retained and a visible 2px focus ring; shared input/button styles also define focus-visible rings. |
| design-system-accessibility:04 | Keyboard navigation patterns | Unverified | Full keyboard journey | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-search-keyboard.log | Space toggling and focus retention passed; complete Tab order and dialog Escape/focus-return were not tested. |
| design-system-accessibility:05 | ARIA pattern library | Partial | Required editing fields | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx; apps/web/components/ui/label.tsx | Fields have associated labels, but required stars are aria-hidden and the Inputs omit required/aria-required. |
| design-system-accessibility:06 | Screen reader testing | Unverified | Assistive technology | none: none | VoiceOver/Safari and NVDA/Chrome were not run. |
| design-system-accessibility:07 | Accessibility annotations in design | Not applicable | Design files | none: none | No design-file annotation kit is part of this implementation-only screen review. |
| design-system-accessibility:08 | Accessibility in contribution guidelines | Unverified | Contribution process | none: none | Repository-wide accessibility contribution enforcement was not audited. |
| design-system-accordion:01 | Header | Present | Category summaries | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Headers identify each category, code and subcategory count. |
| design-system-accordion:02 | Expand/collapse icon | Present | Category summary chevrons | screenshot: product-categories-edit.png | Collapsed and expanded rows show directional chevrons. |
| design-system-accordion:03 | Content area | Present | Expanded category | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Associated category fields and subcategories appear within the expanded row. |
| design-system-accordion:04 | States | Partial | Summary interaction states | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Category summaries have a focus ring; Add category summary omits equivalent focus styling and neither summary defines an explicit hover treatment. |
| design-system-accordion:05 | Expanding logic | Present | Multiple category rows | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Independent native details allow multiple expanded categories; search expands matching rows. |
| design-system-button:01 | Base style | Present | Toolbar and row buttons | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Uses shared Button defaults with primary Save, outline secondary actions and ghost archive controls. |
| design-system-button:02 | Shape | Present | All buttons | source: apps/web/components/ui/button.tsx | Shared size, padding, border and radius variants are reused. |
| design-system-button:03 | Variants | Present | Save/Edit/archive hierarchy | screenshot: product-categories-edit.png | Primary Save is visually distinct from secondary Cancel and row actions. |
| design-system-button:04 | Copy | Present | Action copy | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Edit, Save changes, Add category and Archive category identify actions; Confirm is contextualized by the dialog title. |
| design-system-button:05 | States | Unverified | Hover/focus/disabled combinations | source: apps/web/components/ui/button.tsx | Shared states are defined and disabled Save was observed, but all hover/focus/pressed combinations were not exercised. |
| design-system-color-system:01 | Primitive palette | Not applicable | Global palette architecture | none: none | Redesigning the primitive ramp system is outside this screen review; existing identity is preserved. |
| design-system-color-system:02 | Semantic color tokens | Present | Surface/text/feedback tokens | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx; apps/web/app/globals.css | Uses bg-card, text-muted-foreground, border and shared primary tokens rather than raw brand hex values. |
| design-system-color-system:03 | Interactive state colors | Unverified | Full interactive colour matrix | none: none | Default dark appearance is observed; no comprehensive state-colour measurement. |
| design-system-color-system:04 | Feedback colors | Unverified | Feedback theme combinations | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | An error toast was observed; success and both-theme feedback colours were not measured. |
| design-system-color-system:05 | Contrast ratios (accessibility) | Unverified | Contrast matrix | none: none | No contrast measurements were performed. |
| design-system-color-system:06 | Dark and light mode definition | Present | Theme definitions | source: apps/web/app/globals.css | Both root/light and dark semantic token sets exist; this is source verification only, not runtime light-theme certification. |
| design-system-color-system:07 | Brand color integration | Unverified | Brand accessibility mapping | source: apps/web/app/globals.css | Brand blue is mapped to primary; its contrast across all surfaces was not measured. |
| design-system-color-system:08 | Color blindness considerations | Unverified | Colour-vision simulation | none: none | Text and icons identify actions, but common colour-vision simulations were not run. |
| design-system-input-field:01 | Input field | Present | Category/subcategory fields | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Text inputs accept edits and retain focus when a code changes. |
| design-system-input-field:02 | Label | Partial | Required labels | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx; apps/web/components/ui/label.tsx | Visible labels are associated, but required semantics are absent on their Inputs. |
| design-system-input-field:03 | Placeholder text | Not applicable | Editing fields | none: none | Persistent explicit labels identify these short fields; repeating every label as placeholder would add noise. Search has its own purpose placeholder. |
| design-system-input-field:04 | Data format | Partial | Code fields | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | Uppercase/max length are applied, but BAD! can be added and format restrictions are only reported by a toast after Save. |
| design-system-input-field:05 | Illustration or icon | Not applicable | Text field decoration | none: none | Per-input illustration is unnecessary for this compact taxonomy editor; the existing toolbar/search icons provide hierarchy. |
| design-system-input-field:06 | Hint | Partial | Code format help | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Stable-code help exists, but allowed letters/digits/hyphen/underscore are not described next to code fields. |
| design-system-searchbar:01 | Input field | Present | Category search | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-search-keyboard.log | Search input accepted Coaching and reduced the list to one matching expanded row. |
| design-system-searchbar:02 | Label or placeholder text | Present | Category search label | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx | Accessible label and placeholder explicitly describe category/subcategory search. |
| design-system-searchbar:03 | Quick links, autocomplete and suggestions | Not applicable | Suggestions | none: none | Immediate local filtering of a small settings list needs no history-based suggestion system. |
| design-system-searchbar:04 | Submit search button | Not applicable | Submit search button | none: none | Search filters locally while typing; a separate submit action would add an unnecessary step. |
| design-system-searchbar:05 | Previous searches | Not applicable | Search history | none: none | This bounded taxonomy list does not require stored prior searches. |
| design-system-searchbar:06 | Appropriate visibility | Partial | Editing state search | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx:51 | Search is scoped correctly in read mode but disabled throughout Edit, preventing locating another category while editing. |
| design-system-spacing-and-grid:01 | Spacing scale | Present | Card/row spacing | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Uses gap-2/3/4 and p-3/4 from the shared spacing scale. |
| design-system-spacing-and-grid:02 | Semantic spacing tokens | Partial | Semantic spacing roles | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Card uses shared spacing variables, but row/section gaps use numeric utilities rather than named component/layout roles. |
| design-system-spacing-and-grid:03 | Column grid | Present | Editor field columns | screenshot: product-categories-edit.png | Code/name/action columns align, with stack layout at narrow widths; a global 12-column grid is unnecessary for this bounded editor. |
| design-system-spacing-and-grid:04 | Breakpoints | Present | Responsive breakpoints | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Shared sm breakpoint switches the three-column field row into a vertical stack. |
| design-system-spacing-and-grid:05 | Component vs layout spacing | Present | Internal vs layout rhythm | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Row separation uses gap-2; expanded sections use gap-4 and p-4; controls use shared compact sizing. |
| design-system-spacing-and-grid:06 | Density variants | Not applicable | Density mode toggle | none: none | The compact editor plus user-controlled expansion is sufficient; an extra density preference is not required. |
| design-system-spacing-and-grid:07 | Baseline grid alignment | Present | Control alignment | screenshot: product-categories-edit.png | Shared control heights and items-end align category/subcategory code/name/actions. |
| design-system-typography:01 | Type scale | Present | Screen text hierarchy | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Shared CardTitle, text-sm and text-xs distinguish title, form labels and metadata. |
| design-system-typography:02 | Semantic text styles | Partial | Section heading semantics | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx:47; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx:30; apps/web/components/ui/card.tsx | Product categories is a styled div, while Subcategories uses h3 without a corresponding screen-section h2. |
| design-system-typography:03 | Typeface selection and loading | Present | Font selection/loading | source: apps/web/app/layout.tsx | Inter/Geist font variables are loaded with next/font and shared heading/body/mono styles are reused. |
| design-system-typography:04 | Line height per style | Present | Line-height styles | source: apps/web/components/ui/card.tsx; apps/web/components/ui/input.tsx; apps/web/components/ui/label.tsx | Shared component and Tailwind text styles provide title/body/control line heights. |
| design-system-typography:05 | Letter spacing per style | Not applicable | Custom tracking | none: none | No special tracking is needed for these normal form labels; existing type defaults are retained. |
| design-system-typography:06 | Responsive type behaviour | Present | Responsive text layout | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | The screen fits 1440/768/375px widths through layout stacking and wrapping, without requiring fluid type scaling. |
| design-system-typography:07 | Minimum readable size | Unverified | Minimum-size readability | screenshot: product-categories-375.png | 12px metadata is visible in the screenshot; real-device readability was not tested. |
| design-system-typography:08 | Accessibility responsiveness | Unverified | 200% browser zoom | none: none | Responsive viewport resizing is not a substitute for actual browser zoom testing. |
| web-app-settings:01 | Structure | Present | Settings / Taxonomy navigation | screenshot: product-categories-read.png | The Product categories screen sits in the Taxonomy group with clear category/subcategory organization. |
| web-app-settings:02 | Account details | Not applicable | Profile fields | none: none | Account profile editing is another settings screen, not this taxonomy task. |
| web-app-settings:03 | Security details | Not applicable | Security fields | none: none | Password/2FA settings are outside this taxonomy editor. |
| web-app-settings:04 | Notification preferences | Not applicable | Notifications | none: none | Notification preferences are unrelated to product taxonomy. |
| web-app-settings:05 | Billing | Not applicable | Billing preferences | none: none | No payment or plan changes occur in this screen. |
| web-app-settings:06 | Additional preferences (if applicable) | Not applicable | Appearance/language preferences | none: none | These preferences belong to separate settings; this screen inherits the current theme. |
| web-app-settings:07 | Danger zone | Present | Archive action | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx:33; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx:27 | Archive controls are separate from identity inputs and open a confirmation explaining that saving applies the change and in-use codes are blocked. |
| flows-showing-input-error:01 | Keep the input in default state | Present | Initial empty/edit fields | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Inputs begin without premature error styling; unchanged Save remains disabled. |
| flows-showing-input-error:02 | Allow user to enter information | Present | Code entry | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Code entry retains focus and accepts user typing without validation interruption. |
| flows-showing-input-error:03 | Signal error after loss of focus | Missing | Invalid code after blur/save | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | BAD! reached Save and produced only a toast; zero aria-invalid fields and no local corrective message were present. |
| flows-showing-input-error:04 | Return to default state upon reattempt | Missing | Retry invalid code | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | There is no field-level error state to clear/revalidate during correction; errors remain detached in toasts. |
| flows-submitting-a-form:01 | Show button to submit | Present | Save/add actions | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Save is in the standard shared header; new-category/subcategory forms place Add after their fields. Header placement is appropriate for this settings editor. |
| flows-submitting-a-form:02 | Show loading state after submission | Unverified | Pending save state | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx:41-48 | Saving… and disabled controls are implemented; a delayed successful request was not exercised. |
| flows-submitting-a-form:03 | Show success message when it submits | Unverified | Successful save | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx:44 | Success toast and baseline reset are implemented; this audit did not persist a successful settings mutation. |
| flows-submitting-a-form:04 | If it doesn't, show an error message | Present | Failed save | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | Invalid code submission produced the server error toast and preserved unsaved changes. |
| flows-submitting-a-form:05 | An error may occur because of the wrong information | Partial | Invalid field feedback | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | The error text identifies the format restriction, but is not attached to the affected field and focus is not moved to it. |

## Coverage

Expected: **69**. Reported: **69**. Unique IDs: **69**. Remaining IDs: **none**.
Present: 29, Partial: 9, Missing: 2, Not applicable: 14, Unverified: 15.
Coverage complete; verification incomplete. No WCAG conformance claim.

## Unverified IDs

design-system-accessibility:01, design-system-accessibility:02, design-system-accessibility:04, design-system-accessibility:06, design-system-accessibility:08, design-system-button:05, design-system-color-system:03, design-system-color-system:04, design-system-color-system:05, design-system-color-system:07, design-system-color-system:08, design-system-typography:07, design-system-typography:08, flows-submitting-a-form:02, flows-submitting-a-form:03

## Exclusions

- design-system-table: Uses expandable category rows, not a sortable/paged table.
- web-app-data-table: No table selection/pagination/reporting task.
- web-app-multi-step-form: Single-screen settings editor.
- mobile-settings: Responsive web screen, not native mobile settings.

## Limitations

- No VoiceOver/Safari or NVDA/Chrome test.
- No measured contrast, colour-vision simulation, actual 200% browser zoom or runtime light-theme pass.
- No delayed save or successful persisted save in this audit; invalid server submission was exercised and cancelled.
- The first browser probe ran too early for reliable search/keyboard evidence; the later search-keyboard log supersedes those two observations.
- Review covers 11 selected checklists, not all 138 or the whole CRM.

## Subjective suggestions

Optional: use singular “1 subcategory”, and replace generic Confirm with Archive/Discard in the contextual dialog. These are copy refinements, not blockers.

No implementation changes made by this review.
