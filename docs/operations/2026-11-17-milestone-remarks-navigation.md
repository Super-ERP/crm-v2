# Milestone remarks and linked navigation

Implemented locally; not pushed or deployed.

- Expanded payment milestone rows now edit Remarks and Payment due date using shared controls. Quotation, commit setup and single-row editors preserve the same stored metadata.
- Existing row IDs remain stable. Omitted metadata preserves existing values; explicit blank clears it. Allocation totals and quotation item reconciliation remain enforced.
- Persisted milestone names and Open milestone links navigate to the detail page. Open quotation links return to the source payment plan. Related Funnel/Quotation links use readable names.
- Saving invalidates milestone, quotation, Funnel and project layouts. Values update on navigation or refresh; this does not add live synchronization between already-open browser windows.
- Existing pending planning rows can edit metadata before stage 4a. Marking invoiced still requires the original quotation/stage readiness checks.
- Financial history prevents Remarks, due date and value rewrites. Expected invoice month/year corrections remain allowed through the single-row forecast editor.
- Unsaved quotation plan navigation uses the existing discard confirmation.

## Verification

- Ten focused test files: 46 tests passed. Additional action regression file: 3 tests passed for pre-4a Remarks editing, invoicing readiness and locked forecast-only corrections.
- TypeScript and scoped ESLint completed successfully.
- Browser round trip: save Remarks/due date in quotation, read on milestone detail, edit on detail, read on Funnel and quotation. Restored the original demo Remarks/due date afterward; retained the user's four-row split plan.
- Production build passed (exit 0).

## Row action consistency

Funnel and Project milestone lists now use the shared record More menu for Edit milestone (standalone plans), Move up/down, Mark invoiced, Split and reviewed Void, as permitted. Details keep their separate chevron. Quotation-backed plans expose Edit payment plan above the table. Menu items retain existing callbacks and permission gates. No multi-quotation billing behavior changed. Verified with 16 focused tests, TypeScript and scoped ESLint.

## Shared DataTable

Replaced the bespoke milestone read table with the existing shared DataTable for Funnel and Project panels. Search, saved views, typed filters, columns, sorting, CSV export and pagination now use that component. Added optional detail-row rendering to DataTable so expanded Remarks/due dates and inline editing remain attached to the correct original record after sorting/filtering. Action columns remain excluded from export. Registered complete-client table catalogues and matching permission rules; all supplied authorized rows participate in export regardless of page size. Local browser confirmed all four demo rows and source quotation links. No multi-quotation billing policy changed.
