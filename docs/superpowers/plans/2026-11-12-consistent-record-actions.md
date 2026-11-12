# Consistent Record Actions Implementation Plan

> Use native implementation with parallel disjoint module groups and final review. User reviewed screenshots and authorised production release on 12 November 2026.

Goal: implement approved More→Void placement, stable view/edit headers, remove /voids, and deliver a local Tailscale preview.
Architecture: shared DetailCardHeader action slot, RecordHeaderActions, useRecordEditor draft controller and controlled phone field. Existing mutation endpoints retain all ownership/workflow restrictions.
Spec: docs/superpowers/specs/2026-11-12-consistent-record-actions-design.md

- [x] Shared components: add header action slot, one edit/draft/save/cancel controller, More→Void dialog trigger and controlled phone input. Save failures preserve draft; pending text fields flush before save; cancel remounts internal editors.
- [x] CRM master/detail records: Leads, Contacts, Opportunities, Products, Projects use the shared header; remove detached Edit/Void controls; gate existing fields through edit mode, preserving terminal locks and required edit fields.
- [x] Workflow records: Funnels, Milestones, Quotations, SO and Finance use shared action placement. Existing document editors/workflow actions remain state-gated; no relaxation of approval locks. Child panels retain consistent More actions.
- [x] Account: move Edit/Save/Cancel to header; place Void under More there; preserve single-copy details and draft behaviour.
- [x] Delete standalone /voids page/finder/search endpoint; move shared server actions out of route; update imports and remove history/fallback links to removed page.
- [x] Verify related tables/panels still expose required contextual actions without duplicate More controls.
- [x] Test type/lint/render/access/queue regressions and production build; independently review whole change.
- [x] Profile preview server work, provide configured built preview with restricted local database user and deployment settings; benchmark local/Tailscale cold/warm paths without bypassing startup checks.
- [x] Deliver Tailscale link for user review. Keep code local until user approves production (approval subsequently received).

Validation: full clean PostgreSQL17 suite168files/1184tests passed. Subsequent contextual-read DB suite8tests and real dialog-boundary suite2tests passed, with targeted account/master/milestone/editor/queue regressions rerun. Lint/typecheck and final configured production build pass. Independent review findings resolved and rechecked. HTTP checks cover all11 mutable record modules with demo records, Approvals200, removed /voids404, single Account details copy and header More. T3 browser was blocked by host AppArmor; isolated headless Chrome captured actual screenshots across record modules for user review.

Ruling: built-preview timing improved warm Account requests from about1.3s to0.18–0.24s; retain existing data queries rather than undertake an unproven query rewrite in this UI change. Device network path remains unmeasured.

Implementation was kept local through preview review. User has now authorised PR, merge and the normal production release pipeline. Temporary CI PostgreSQL container removed; seeded preview database and standalone server intentionally remain for review.

Final live-demo checks: active signed entitlement confirmed with all modules; restricted role inherits the normal crm_app function grants (no RLS bypass). Real authenticated Account server-action Save succeeded and was reversed to the original sample; contextual linked-contract read returned its sample. The unchanged legacy-code validation bug found by this check was fixed with3regressions; new/changed codes remain strict. Extra checks: contextual DB8tests, dialog target2tests, code/access8tests and final record lifecycle/render reruns passed. One copy of account details; all11modules have sample record coverage. Removed route404, Approvals200, warm Account approximately0.16–0.24s with write access active.

Screenshot review also exposed the Product quotation usage catalogue missing its server timestamp; registered createdAt as an optional hidden field. Both regression tests pass; default columns remain unchanged. Final lint and configured standalone build pass.
