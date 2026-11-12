# Consistent record actions — proposed design

Status: approved by user: Void under More (⋯). User explicitly requires planning together before implementation and prohibits push/deployment. All work stays local until reviewed through Tailscale.

## Agreed intent

- Remove the standalone `/voids` page completely, not merely its sidebar link.
- Account information appears once on the left; keep related records/activity/documents on the right.
- Edit belongs in the record header, not a detached row in card content. Use consistent action placement across modules.
- Keep backend ownership, workflow locks, approval permissions, linked-record checks and financial reversal restrictions.

## Approved interaction

Use one shared left-card record header: object identity/title, Edit, More (⋯). Void is under More with the existing reason/impact/approval dialog. Alternative: visible Void beside Edit, more discoverable but makes a destructive action permanently prominent. The recommended menu is consistent and gives normal editing priority.

Edit switches the same header to Save/Cancel and enables editable fields in place. No repeated Details panel or replacement edit form. Store one draft and save once. Cancel restores the original snapshot; validation failure retains draft, shows error and permits correction. Navigation guards protect drafts. On narrow screens the action group wraps without overlapping the record title. Read-only users do not see unavailable mutations.

Workflow actions (Send, Accept, approval, project/SO state transitions) retain their business meaning and locks. Give them a shared workflow-action area rather than mixing them with basic record editing. Approved/sent/posted records remain locked according to current rules; standardising layout must not make them freely editable.

## Coverage checklist

- [ ] Shared detail-header/action component and view/edit state contract.
- [ ] Apply to Leads, Accounts, Contacts, Opportunities, Funnels, Products, Projects and Payment Milestones.
- [ ] Apply matching action placement to Quotations, Sales Orders and Finance documents; retain specialised builders, line-item editors and lifecycle actions.
- [ ] Give embedded contract/year/cost panels a consistent panel-action position using the same Void dialog. Do not invent standalone pages.
- [ ] Project Codes remain source-driven/read-only; no artificial Edit/Void actions.
- [ ] Remove scattered page-top Void controls and redundant Actions cards after their controls are migrated.
- [ ] Delete `/voids/page.tsx`, the finder component and its unused search action; move shared Void server actions/types to a non-page module and update all imports.
- [ ] Remove every UI/navigation fallback to `/voids`, including the approved-request “Void another record” link. Approved/archived history remains visible in Approvals; no link to an inaccessible deleted record. The removed route returns not-found.
- [ ] Preserve all record-level request/review permissions; no changes to business eligibility or financial corrections.
- [ ] Render/access regressions for each module class, draft Save/Cancel/error behavior and removal of duplicate headers/buttons. Verify route removal and approval history links.
- [ ] Run typecheck/lint/tests/build appropriate to the changes; provide a local Tailscale preview for user review. Do not push, merge or deploy.

## Spacing and grid

Reuse shared Card spacing, PageBody gutters and safe wrapping. Record header actions share one alignment and wrap as a group. Long titles/URLs must not enlarge grid tracks. Use available panel width for narrow editor layouts. Preserve document/PDF dimensions and task-specific information density.

## Preview performance investigation

12 November, host-side authenticated warm Account requests:
- Local: 1454, 1306, 1357ms.
- Tailscale hostname through local preview proxy: 1242, 1357, 1271ms.
- All samples returned HTTP200. Application logs attribute roughly1.2–1.3s to application work on warm requests.

This is not a measurement of the user's device-to-host link; no claim about their direct/relay status is justified. The existing preview uses Next development mode, so first navigation also pays on-demand compilation. The temporary production-mode probe failed its secure-startup checks and is not used as a performance result; it was stopped and the existing development preview restored. Product security checks were not disabled.

Next steps: profile account server reads, eliminate repeated independent lookup work where proven, and prepare a correctly configured built preview with a restricted local database role and required deployment settings. Keep it separate from the development server, avoid serving HTML through an unnecessarily buffering proxy, and compare cold/warm navigation plus static assets. Measure a device/peer path if further delay persists. No new infrastructure purchase or production change is needed for this investigation.

## Visual evidence limit

An interactive proposal was shared inline; T3 html_preview reported host AppArmor blocking its browser. No screenshot verification is claimed. Current user screenshots and source inspection show the detached Edit row and inconsistent Void placements. Implementation is local and undergoing verification; no push or production deployment.

## Contextual cleanup after finder removal

The standalone finder had been the sole path to imported contracts and feature-hidden contract years/costs. Account/Funnel More now offers a lazy, paginated Related records dialog anchored to that record. It has no global search/type picker or route. Parent read access is checked independently of child request rights; Account reads include shared resellers. Child permissions/ownership and financial reviewer requirements remain unchanged. Strict child target payloads are normalized before preview/submission. This preserves cleanup access without retaining the unwanted page.

## Built preview measurement

Successful authenticated warm Account requests from this host: local235/210/187ms; Tailscale200/199/179ms, versus development local1454/1306/1357ms and Tailscale1242/1357/1271ms. First demo login plus redirect1594ms includes password authentication. This is a host-side comparison, not a measurement of the user's device network path. Built preview uses restricted local DB credentials, startup checks and a signed synthetic entitlement. Production is unchanged.
