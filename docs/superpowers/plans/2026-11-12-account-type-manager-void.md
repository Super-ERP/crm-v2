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
