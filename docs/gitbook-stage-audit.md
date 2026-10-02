# GitBook workflow audit — 2026-10-02

Scope: Base modules and Advanced Roles, against main 845193f. Public guide changes are documentation only; implementation findings below remain open.

## Corrected public guidance

- Added stage-by-stage qualification and operational field matrix; gate checks earlier stages, not the target's own list.
- Distinguished Power Sponsor narrative from contact selection/positive budget, customer Owner Contact from internal ownership, and opportunity estimated close date from funnel expected close date.
- Explained direct-Won preset exceptions, required Owner Contact, board shortcut, and approval revalidation.
- Added KIV branch, reason, reopen policy and current queued-review limitation consistently across overview/reference/FAQ/approval/troubleshooting.
- Added stage configuration instructions and new-organization gate verification.
- Corrected milestone schedule inputs: amount, description, due date; described inline creation and default Full Payment auto-seed.

## Confirmed implementation inconsistencies (not fixed by this docs change)

| Finding | Evidence | Impact / next engineering check |
| --- | --- | --- |
| KIV queued reopen is never applied | `lib/stage-gate.ts` requires approval on PARKED→OPEN; `server/services/stage.ts:decideApproval` considers `isRollbackTransition` stale unconditionally. | Ordinary users can queue a reopen that reviewers resolve obsolete. Direct permitted reopen works. Review explicit KIV reopen policy in approval handler. |
| New-tenant field lists empty | `server/services/tenant-seed.ts` seeds CANONICAL_STAGES without requiredFields; `db/seed.ts` separately defines STAGE_REQUIRED_FIELDS. | Provisioned organizations have approval flags without standard completeness gates. Centralize defaults, preserving tenant overrides. |
| Won outcome fields not enforced on entry | `stagesRequiredBefore` only includes stages earlier than target; seed puts awardDate/purchaseOrderNumber/contract on Won itself. | These fields appear as outcome fields but are never gates on a subsequent move because Won is immutable. Product decision needed before altering closure requirements. |
| Board and detail have different completeness policy | `app/(app)/funnel/funnels-board.tsx` passes skipPpvvc; approval revalidation in `server/services/stage.ts` does not persist that shortcut. | Board request may queue then become obsolete for qualification requirements. Resolve intended consistent policy. |
| Inline sponsor narrative may imply gate completion incorrectly | `lib/stage-gate.ts:applyPpvvcToStageGate` sets sponsor contact/budget flags from non-empty power narrative; authoritative `stageGateState` checks contact ID and positive budget. | UI can show completeness that server rejects; retain separate narrative and structured flags. |
| Target-entry comments conflict with actual earlier-stage algorithm | stage-gate/service comments describe entering stage, but request and dialog both call stagesRequiredBefore. | Table follows current executable behavior; align language and product semantics in future code change. |

## Remaining documentation coverage to expand

- Base product/catalog administration has no dedicated mapped walkthrough; current guide references catalog selection only.
- Supporting attachments are explained in the document/action reference but need a practical upload/download/removal walkthrough verified against live controls.
- Native Q-App Documentations navigation was shipped in PR251 and should receive a short Getting Started discovery note in a future interface pass.
- Full live application QA was not performed; the audit checks repository behavior and GitBook rendering. No assertion that every deployed organization's configuration matches seeded values.

Inactive Projects, Sales Orders, Forecast, finance panels, and Audit viewer remain outside the published guide per rollout scope. References to Project / License Year and Contract here are actual Base funnel field labels, not instructions for an inactive module.

Validation: mapped navigation, all local/cross-space links, Liquid stepper structure, Mermaid fences, image paths, and absence of public GitHub links checked by /tmp/validate-qapp-spaces.py.
