# Universal CRM table fields

## Intent and approved approach

Extend the existing shared DataTable and field catalogue across every registered main list and related-record panel. Users can select supported columns, apply datatype-aware filters, sort, save views and export matching records without requesting new code. Build on the current framework rather than introduce a separate report designer. The user explicitly authorised planning and implementation in this session.

## Behaviour

- A field has a stable ID, business label, explicit type, options, display format and supported operations. No guessing from column labels or sample values.
- Root datasets expose approved related fields through one server definition used for filtering, sorting and projection. Correlated, tenant-bound scalar lookups preserve one row per source record.
- Existing visible columns, column order, widths and formatting remain unchanged; users discover additional choices only inside Filters/Columns. Existing panel-specific cells remain intact. Newly available columns are hidden initially and selectable through Columns. Nested AND/OR filters can use hidden fields too.
- Dynamic funnel stages come from the current entity's configuration; status choices retain their own dataset semantics. Complete client lists may derive choices only from their complete authorised rows. Never derive complete options from one server page.
- Payment milestones expose funnel stage/status and quotation status separately from milestone status; invoiced-history visibility and lifecycle rules remain unchanged.
- Every shared table offers CSV export using visible business columns in their chosen order. Server lists fetch every matching page through the existing authorised loader, preserving filters and sorting. Capped lists must not claim a complete export. CSV protects spreadsheet formula cells and retains date/currency meaning.
- Existing saved filters/layouts keep their IDs and load normally. New columns start hidden. Shared views never expand record access.
- Permissions, tenancy, module entitlements and ownership continue to be enforced by each existing loader, before projection or export. No arbitrary SQL, unapproved joins or record creation.

## Boundaries

Action/document UI cells are not data filters or export columns. A table only exposes fields that its adapter actually supports. New data capture, integrations, workflows, arbitrary calculated reports and an administrator schema designer remain separate work. A milestone dataset does not invent rows for funnels lacking schedules.

## Validation

Catalogue coverage of all DataTable panels; regression tests for typed choices and optional fields, saved-layout compatibility, CSV safety and paging, unknown-field rejection, related-field SQL/projection parity and the milestone 4a/Closed Won example. Run typecheck, focused tests and lint. Database integration checks require the existing disposable test database configuration and must be reported if unavailable.
