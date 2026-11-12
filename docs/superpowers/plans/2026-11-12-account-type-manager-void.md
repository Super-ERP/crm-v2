# Account editing and Void review implementation checklist

Goal: make account Type directly editable and let Managers review team Void requests while removing the accounts list Void buttons.

Architecture: reuse InlineCombobox, updateAccount and permission-based review; no role-name checks in runtime authorisation. Existing ownership, no-self-review, linked-record and financial reversal checks remain.

- [x] Add Type inline editor to account sidebar and Details tab, preserving other account fields; switching to Client clears obsolete end-user link through existing backend normalization.
- [x] Remove accounts list Void controls; retain View/Edit menu and detail-page Void.
- [x] Grant record.void.approve to Manager template and existing Manager roles via additive migration 0104. Do not grant finance.reverse or global record access.
- [x] Test Manager grants and team scope, reviewer denials and account access; typecheck and lint changed files.
- [x] Update user documentation and verify diff.

Approved scope: user requested this checklist and implementation after approving the inline editor and Manager review behavior. Native execution in the existing isolated worktree.

Validation: 22 focused unit tests and 8 actual PostgreSQL migration/lifecycle tests passed. Typecheck, targeted lint and independent review passed. Production build recorded in /tmp/account-type-void-build.log.

## Approved refinement: explicit edit mode
- [x] Default to read-only fields with working record links; no always-on pencils.
- [x] Edit enables the same field positions in sidebar and Details, sharing one local draft.
- [x] Save submits once; Cancel discards. Retain required field validation, errors, navigation guard and update permissions.
- [x] Cover view/edit render states, document the revised flow and update PR 288.
References: https://www.checklist.design/web-app/single-item-detail and https://github.com/shadcn-ui/lint. Checklist page returned no readable checklist content; apply the user-approved view/edit flow without claiming unverified checklist details. Preserve shared component variants and theme tokens as recommended by shadcn lint.

Refinement validation: 19 focused tests passed, including readonly/edit permissions and phone draft/country regressions. Final production build and lint passed. Independent review findings on phone drafts were fixed and re-reviewed with no remaining substantive findings. Browser visual QA blocked by host AppArmor.
