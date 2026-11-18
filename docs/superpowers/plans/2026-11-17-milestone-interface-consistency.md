# Milestone interface consistency implementation plan

Goal: integrate the existing milestone flow and reduce repeated UI without changing business rules.
Spec: docs/operations/2026-11-17-milestone-interface-consistency-audit.md

- [x] Extract shared read table, allocation summary and optional planning guidance. Use in quotation and shared Funnel/Project panels, preserving workflow actions and access.
- [x] Collapse per-row secondary details and schedule editor rows; add expand/collapse all with accessible state and original currency.
- [x] Collapse repeated Funnel stage requirements and show milestone-driven invoice summary; remove duplicate milestone name and group optional source metadata.
- [x] Tests, lint/typecheck/build; built browser check at320/768/1024/1440, save/cancel/expand/collapse and links. Refresh same Tailscale preview without pushing.

## Follow-up: consistent read/edit accounting table (authorized 17 Nov)

- [x] Use one fixed column schema in read/edit, with period controls in one cell and status retained.
- [x] Reuse shared Select/Input/Button components with matching control heights and spacing.
- [x] Keep the identity column sticky and optional source/remarks/due details consistent.
- [x] Put Edit and Save/Cancel in the same header action area; track dirty state.
- [x] Add row-specific error associations, correction clearing, edit/error focus and draft-removal Undo.
- [x] Verify local built demo, shared control keyboard behavior and responsive table geometry; keep unpushed.
