# Milestone remarks and navigation

User authorized direct editable remarks and consistent navigation between Quotation, Milestone and Funnel. Preserve ownership, allocation reconciliation, stable IDs and finance-history locks. Local demo only; no push.

- Extend billing row inputs and allowlisted saves with optional Remarks/Due Date. Omitted fields preserve old values; explicit blank clears them; finance history still permits only forecast period corrections.
- Make expanded rows use shared Textarea/Input controls; remove repeated source-arrow text. Keep existing read/edit geometry and add scoped source-record links.
- Reuse the editor for single milestone editing; remove duplicate metadata editors. Improve detail page direct editing and backlinks without exposing inaccessible quotes.
- Invalidate linked quotation/Funnel/project/milestone views after writes; protect unsaved plan navigation.
- Verify backend round trips, clearing/preservation/locking, UI direct editing and cross-page save/read on fictional data. Run focused tests/types/lint/build.

## Completed verification

All steps completed locally. Focused tests: 49 passed across 11 files; TypeScript, scoped ESLint and production build passed. Browser save/read verified in quotation, milestone detail and Funnel; original demo metadata restored. No push or deployment.
