# Shared location catalogue implementation plan

**Goal:** Consistent database-backed address selectors and server validation throughout CRM.
**Spec:** ../specs/2026-11-17-location-catalogue-design.md
**Constraints:** Existing address snapshots and unmatched legacy tuples preserved; no push; source attribution; no paid/runtime external API.

- [ ] Add reference-table migration and reproducible GeoNames download/import with source metadata.
- [ ] Add authenticated cascading lookup and address validation service; regression tests for invalid hierarchy and unchanged legacy data.
- [ ] Add shared accessible LocationFields; integrate Account form/detail and Lead conversion, removing free-text fallbacks.
- [ ] Enforce validation in Account and conversion server mutations; replace old country taxonomy/default-country input.
- [ ] Seed local catalogue, verify Malaysia/Singapore, run focused tests/types/lint/build and demonstrate locally.
