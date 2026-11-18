# Sales controls and billing integration implementation plan

Goal: integrate the user's account review, 4a project code and invoice schedule requirements in the existing CRM, with a local demo.
Spec: ../specs/2026-11-17-sales-controls-billing-design.md
Stack: Next16.4.5, Drizzle/Postgres, existing RBAC and approval queue.

- [x] Account/Lead: dedicated code capability, manual required unique code, SSM duplicate review, Sales Admin pool, editable reviewed code and required Project Nature. Server-first checks, UI, migrations, regression coverage.
- [x] Billing: expected month/year per schedule row, quotation line provenance, split individual rows preserving totals/history, quotation schedule tab and reverse links. Server checks, migration, tests.
- [x] Stage/code: explicit new/existing selection, scoped search/edit, many-Funnel reuse; required nature and complete schedules before 4a/Won including approval paths. Race-safe server checks and tests.
- [x] Integrate migrations and permission seed, verify tests/lint/build, review access and approval races, seed synthetic scenario and refresh built logged-in Tailscale demo.
- [ ] Reconcile workbook when available (SharePoint inaccessible; attachment requested). Limitation documented; no production push.
