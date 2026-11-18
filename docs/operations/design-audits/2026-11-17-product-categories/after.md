# Product categories — guide fixes recheck

Post-fix recheck of the same Product categories settings scope and same 69 selected items. Original report.json is the before state. Authorized changes preserve visual identity and backend archive/permission safeguards.

Snapshot: `bfae71e507b1b7c03c12e0756402b60eb80f5d14`. Same 11 checklists / 69 items; no selection changes.

## Implemented and verified

- Inline format/name/duplicate validation, error association, first-invalid focus and expansion, with correction/reset behaviour.
- Semantic required inputs and h2/h3 heading structure.
- Shared accordion focus/hover/chevron styling and reusable field/grid composition.
- Search works during editing; subcategory drafts survive filtering.
- Contextual Archive / Discard changes confirmation copy; singular subcategory count.
- Pending Save lock, successful save, dialog keyboard trapping/Escape/focus return and responsive 1440/375px no-overflow checks.

## Item ledger

| Audit ID | Exact item title | Status | Location/state | Evidence | Reason |
|---|---|---|---|---|---|
| design-system-accessibility:01 | Target conformance level | Unverified | Contribution guidelines | none: none | This screen review does not establish a repository-wide conformance target. |
| design-system-accessibility:02 | Colour contrast standards | Unverified | All themes/states | none: none | No measured contrast matrix was run. |
| design-system-accessibility:03 | Focus indicator design | Present | Accordion summary focus | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-search-keyboard.log | Space opened the row with focus retained and a visible 2px focus ring; shared input/button styles also define focus-visible rings. |
| design-system-accessibility:04 | Keyboard navigation patterns | Present | Full keyboard journey | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-keyboard-recheck.log | Keyboard Space opens Add category with visible focus; Tab cycles within the confirmation, Escape dismisses it and focus returns to Cancel. Native input/form/button semantics retain standard interactions. |
| design-system-accessibility:05 | ARIA pattern library | Present | Required editing fields | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Shared editing inputs now expose required/aria-required, associated labels, aria-invalid and referenced hint/error IDs; initial invalid focus was verified. |
| design-system-accessibility:06 | Screen reader testing | Unverified | Assistive technology | none: none | VoiceOver/Safari and NVDA/Chrome were not run. |
| design-system-accessibility:07 | Accessibility annotations in design | Not applicable | Design files | none: none | No design-file annotation kit is part of this implementation-only screen review. |
| design-system-accessibility:08 | Accessibility in contribution guidelines | Unverified | Contribution process | none: none | Repository-wide accessibility contribution enforcement was not audited. |
| design-system-accordion:01 | Header | Present | Category summaries | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Headers identify each category, code and subcategory count. |
| design-system-accordion:02 | Expand/collapse icon | Present | Category summary chevrons | screenshot: product-categories-edit.png | Collapsed and expanded rows show directional chevrons. |
| design-system-accordion:03 | Content area | Present | Expanded category | browser: docs/operations/design-audits/2026-11-17-product-categories/product-category-browser.log | Associated category fields and subcategories appear within the expanded row. |
| design-system-accordion:04 | States | Present | Summary interaction states | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-keyboard-recheck.log | Both category and Add category summaries reuse the same hover/focus style and chevrons. Keyboard focus ring and expansion were observed. |
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
| design-system-input-field:02 | Label | Present | Required labels | source: apps/web/app/(app)/settings/taxonomy/product-codes/taxonomy-editor-fields.tsx | All category/subcategory fields now use shared associated labels and required input semantics. |
| design-system-input-field:03 | Placeholder text | Not applicable | Editing fields | none: none | Persistent explicit labels identify these short fields; repeating every label as placeholder would add noise. Search has its own purpose placeholder. |
| design-system-input-field:04 | Data format | Present | Code fields | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Existing taxonomy validators run on blur/Add/Save; invalid BAD! is rejected inline before persistence, and the first invalid input is focused. |
| design-system-input-field:05 | Illustration or icon | Not applicable | Text field decoration | none: none | Per-input illustration is unnecessary for this compact taxonomy editor; the existing toolbar/search icons provide hierarchy. |
| design-system-input-field:06 | Hint | Present | Code format help | source: apps/web/app/(app)/settings/taxonomy/product-codes/taxonomy-editor-fields.tsx | Each code input has a concise allowed-format hint referenced by aria-describedby. |
| design-system-searchbar:01 | Input field | Present | Category search | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-search-keyboard.log | Search input accepted Coaching and reduced the list to one matching expanded row. |
| design-system-searchbar:02 | Label or placeholder text | Present | Category search label | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx | Accessible label and placeholder explicitly describe category/subcategory search. |
| design-system-searchbar:03 | Quick links, autocomplete and suggestions | Not applicable | Suggestions | none: none | Immediate local filtering of a small settings list needs no history-based suggestion system. |
| design-system-searchbar:04 | Submit search button | Not applicable | Submit search button | none: none | Search filters locally while typing; a separate submit action would add an unnecessary step. |
| design-system-searchbar:05 | Previous searches | Not applicable | Search history | none: none | This bounded taxonomy list does not require stored prior searches. |
| design-system-searchbar:06 | Appropriate visibility | Present | Editing state search | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Search remains enabled while editing. CHILD_QA / Preserved draft survived filtering to another category and back. |
| design-system-spacing-and-grid:01 | Spacing scale | Present | Card/row spacing | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Uses gap-2/3/4 and p-3/4 from the shared spacing scale. |
| design-system-spacing-and-grid:02 | Semantic spacing tokens | Present | Semantic spacing roles | source: apps/web/app/(app)/settings/taxonomy/product-codes/taxonomy-editor-fields.tsx | Named shared TAXONOMY_GRID and TAXONOMY_SUMMARY styles centralize repeated editor/summary layout; reusable field composition aligns labels and actions. |
| design-system-spacing-and-grid:03 | Column grid | Present | Editor field columns | screenshot: product-categories-edit.png | Code/name/action columns align, with stack layout at narrow widths; a global 12-column grid is unnecessary for this bounded editor. |
| design-system-spacing-and-grid:04 | Breakpoints | Present | Responsive breakpoints | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Shared sm breakpoint switches the three-column field row into a vertical stack. |
| design-system-spacing-and-grid:05 | Component vs layout spacing | Present | Internal vs layout rhythm | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Row separation uses gap-2; expanded sections use gap-4 and p-4; controls use shared compact sizing. |
| design-system-spacing-and-grid:06 | Density variants | Not applicable | Density mode toggle | none: none | The compact editor plus user-controlled expansion is sufficient; an extra density preference is not required. |
| design-system-spacing-and-grid:07 | Baseline grid alignment | Present | Control alignment | screenshot: product-categories-edit.png | Shared control heights and items-end align category/subcategory code/name/actions. |
| design-system-typography:01 | Type scale | Present | Screen text hierarchy | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Shared CardTitle, text-sm and text-xs distinguish title, form labels and metadata. |
| design-system-typography:02 | Semantic text styles | Present | Section heading semantics | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Product categories is now h2; subordinate Subcategories sections remain h3. Browser confirmed the h2 exists. |
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
| flows-showing-input-error:03 | Signal error after loss of focus | Present | Invalid code after blur/save | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Invalid code produces persistent associated inline error text/icon, aria-invalid and focus on the code field; shared controls validate again on blur. |
| flows-showing-input-error:04 | Return to default state upon reattempt | Present | Retry invalid code | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Correction removes the inline error. Programmatic first-invalid focus preserves the new message; subsequent user refocus/correction resets it per the supplied guide. |
| flows-submitting-a-form:01 | Show button to submit | Present | Save/add actions | source: apps/web/app/(app)/settings/taxonomy/product-codes/product-codes-client.tsx; apps/web/app/(app)/settings/taxonomy/product-codes/product-category-row.tsx | Save is in the standard shared header; new-category/subcategory forms place Add after their fields. Header placement is appropriate for this settings editor. |
| flows-submitting-a-form:02 | Show loading state after submission | Present | Pending save state | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | With network latency applied, Saving…, aria-busy and disabled editing controls were observed. |
| flows-submitting-a-form:03 | Show success message when it submits | Present | Successful save | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Successful synthetic taxonomy save showed the success toast and returned to Edit; the test category was archived and saved away afterward. |
| flows-submitting-a-form:04 | If it doesn't, show an error message | Present | Failed save | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-browser.log | Invalid code submission produced the server error toast and preserved unsaved changes. |
| flows-submitting-a-form:05 | An error may occur because of the wrong information | Present | Invalid field feedback | browser: docs/operations/design-audits/2026-11-17-product-categories/category-guide-fixes-browser.log | Local code/name format and duplicate errors now point to the relevant field, expand hidden groups and focus the first invalid control. Server-specific operational errors still use the shared global toast. |

## Reconciliation

Expected: 69. Reported: 69. Unique IDs: 69. Remaining IDs: none.
Present: 43, Partial: 0, Missing: 0, Not applicable: 14, Unverified: 12.
Coverage complete; verification incomplete.

Unverified IDs: design-system-accessibility:01, design-system-accessibility:02, design-system-accessibility:06, design-system-accessibility:08, design-system-button:05, design-system-color-system:03, design-system-color-system:04, design-system-color-system:05, design-system-color-system:07, design-system-color-system:08, design-system-typography:07, design-system-typography:08

## Review note

A source reviewer suggested keeping field errors on all refocus events. The selected guide explicitly asks for reset on user refocus (flows-showing-input-error:04), so the implementation preserves the first programmatic error focus, resets on later user focus/change, and revalidates on blur/Add/Save. Browser evidence confirms initial error visibility and correction. No other important source-review findings were reported.

## Limitations

- No VoiceOver/Safari or NVDA/Chrome test.
- No measured contrast, colour-vision simulation, actual 200% browser zoom or runtime light-theme pass.
- The first browser probe ran too early for reliable search/keyboard evidence; the later search-keyboard log supersedes those two observations.
- Review covers 11 selected checklists, not all 138 or the whole CRM.
- No conformance claim: unverified screen-reader, contrast, colour-vision, actual browser zoom and full light-theme matrix remain.
