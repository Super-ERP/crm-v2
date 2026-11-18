# Product category settings interface

The screen now opens as compact category rows with stable codes and subcategory counts. Native keyboard-accessible details disclose category/subcategory content. Search matches category or subcategory names/codes and expands matching groups. Edit switches the same rows to labelled controls; Save/Cancel stay in the header. New-category and subcategory forms use the standard inputs and buttons. Archive and discard require confirmation. Pending writes disable editing; Save is disabled without changes or while an unadded draft exists. Successful writes update the local baseline immediately. Stable UI keys preserve input focus while codes are edited.

Existing product taxonomy normalization, tenant permissions and in-use archive safeguards remain server-authoritative. No production write or push.

Verification: browser checked compact/read and edit states, stable code-input focus, discard confirmation and no overflow at 1440/768/375 px; no browser exceptions. Render and taxonomy unit tests passed, as did TypeScript and focused ESLint. Screenshot artifacts in /tmp/product-categories-{read,edit,768,375}.png (ephemeral).

## Design-guide fixes

Applied the verified findings from the pinned 69-item audit:
- Shared TaxonomyEntryFields labels required Inputs and connects format hints and inline error text via aria-describedby/aria-invalid. Existing taxonomy validators run on blur, Add and Save, with per-scope duplicate checking.
- Failed local validation clears the filter, expands the affected group and focuses the first invalid field. Initial programmatic focus preserves its new error; later user focus/correction resets the field, with blur/submit revalidation.
- Product categories now uses h2 above subordinate h3 sections. Shared summary/grid styles keep focus, hover, chevrons and control alignment consistent.
- Search stays enabled during editing; draft contents live in parent state keyed by stable row identity, so filtering does not discard them. The focused row stays visible while its identity is edited.
- Archive / Discard changes dialog copy is explicit; subcategory counts use singular/plural correctly.

Verification: 16 focused tests passed (6 additional environment-gated tests skipped), TypeScript, focused ESLint and production build passed. Live browser verified invalid-code feedback/focus/required state, correction, draft survival across filtering, delayed Save locking, successful save and cleanup, keyboard summary activation, dialog Tab trap/Escape/focus return and no overflow at 1440/375px. Before/after audit retains all 69 IDs: 43 Present, 14 Not applicable, 12 Unverified, no Partial/Missing and no unreported IDs. Contrast, screen-reader and real browser zoom work remains explicitly unverified; no accessibility-conformance claim.

Full evidence: docs/operations/design-audits/2026-11-17-product-categories/after.md and after.json. Nothing pushed.
