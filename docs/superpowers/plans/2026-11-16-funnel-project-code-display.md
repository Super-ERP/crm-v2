# Funnel project-code display correction

Goal: show the same code on Funnel cards/tables/exports as in the detail page. User narrowed scope to display; numbering and stored identifiers remain unchanged.

Design: use the existing active-stage SQL gate. Prefer the Funnel's own legacy code; fall back to the active parent Opportunity code only when that parent is visible under the existing ownership scope. Keep tenant/deleted-parent checks. Use one SQL expression for selection, filtering and sorting in funnelsList (shared by board and export). Cross-deal references remain separate. No data backfill or production mutation.

- [x] Add regression coverage for active parent fallback, legacy precedence, parent access, early stage suppression, filter/sort consistency.
- [x] Add scoped SQL helper and wire shared Funnel list query.
- [x] Run PostgreSQL regressions, reader tests, lint and typecheck; update user guide.

Live database verification remains unavailable until company VPN is connected. No assumption that the two named records lack legacy codes is made.

Validation: regression tests failed on the missing helper and original list projection before the fix; 41 tests across PostgreSQL project-code, API readers, visibility and presentation pass. Numbering remains unchanged.
