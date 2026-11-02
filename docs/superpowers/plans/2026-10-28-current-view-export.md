# Current view export

The user approved Excel (.xlsx) and CSV exports of all matching rows and selected columns. Preserve current table defaults and keep export entry points inside Views, Columns and filter controls. The filter entry applies and validates its draft before opening a shared format chooser. Both formats reuse the same authorized complete-result loader, visible column sequence and typed values. XLSX keeps amounts numeric, currency separate, freezes a header and enables worksheet filtering; strings never become formulas.

1. Add meaningful workbook round-trip coverage for labels, column order, numeric money, literal formulas and empty results; retain CSV regressions.
2. Share export data formatting, lazy-load the workbook writer only for XLSX, and wire the format chooser into existing controls.
3. Run export/table regression tests, typecheck and changed-file lint. Document formats and scope. Commit locally without deploying.


## Verification and delivery

- Workbook round-trip tests watched fail before implementation, then passed for column order, numeric amounts/currency, literal formula-looking strings, empty results and high-precision numbers.
- Fresh read-only review found no important defects. Its zero-column workbook robustness edge was reproduced and fixed with a null-safe column loop; regression RED → GREEN. No deferred findings.
- Focused table/data-table/API-reader regressions: 17 files / 72 tests passed, 3 database-dependent files / tests skipped. Final workbook/CSV/catalogue/filter/layout run: 5 files / 22 tests passed. Typecheck and changed-file ESLint passed; whitespace check passed.
- Browser using disposable PostgreSQL: Views export downloaded 35 data rows from a 25-row page. Filter Apply & export opened the chooser with the new filter; downloaded XLSX inspected as 30 records, all New, with worksheet autofilter A1:J31. Columns nested chooser also downloaded CSV successfully.
- The user's follow-up confirmed exports must include the complete matching dataset, regardless of rendering/page size. Chooser copy now states this explicitly; clearing filters/search exports all authorized records. The existing explicit 100,000-row ceiling remains.
- Both formats reuse the existing authorized full-result loader; no permissions or SQL predicates changed. No deployment performed.

## Revised export placement

User requested one Export button in the shared table toolbar beside Columns and filters. Remove export actions from Columns, Views and filter dialogs. The button opens the existing Excel/CSV chooser and uses the applied filters, sorting and selected column order across all matching pages. Draft filter changes must be applied first. Export loaders and access rules are unchanged.

## CSV-only simplification

Export now downloads CSV directly from the table toolbar. Removed the format dialog, Excel writer and its dependency. Applied filters, sorting, visible columns, complete matching pages and access checks remain unchanged.
