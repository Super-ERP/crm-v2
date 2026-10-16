# Approved Microsoft directories implementation plan

Goal: allow QAR/CC users from approved external Microsoft directories to use their existing work identities while retaining CRM membership and entity boundaries.

Design: retain the original provider ID and credentials for existing users. Add tenant-specific providers using the same organisational multi-tenant app registration, configured by directory GUID and exclusive email-domain mappings. Select the route by work email; validate signed ID tokens against each directory's issuer, audience, keys and tenant ID, then bind Microsoft userinfo to the verified subject. External domains cannot authenticate through the original provider. Never derive CRM membership from a directory ID.

No default external directory is enabled. Q-Armour's actual directory ID, app consent and pilot invitations are deployment prerequisites. No common/organizations authority, personal accounts, database migration or automatic ownership transfer.

- [x] Add strict configuration/routing and tests for malformed/duplicate mappings and original-provider compatibility.
- [x] Add tenant-specific OAuth providers and signed-token/userinfo/domain validation; test wrong issuer, tenant, audience, expired tokens and domain/subject mismatch.
- [x] Add runtime-configured work-email routing to the existing sign-in form and preserve the original single-directory flow.
- [x] Carry external-directory and domain configuration through Compose and client deployment/rollback.
- [x] Document administrator setup, exact callback URLs, invitations, licence capacity, pilot UAT and rollback.
- [x] Run relevant tests, type checking and lint; review the complete diff and update SUP-63 with delivered work and activation blockers.

Acceptance: existing provider/account IDs remain stable; only configured directories and their mapped domains pass the external providers; existing membership/invitation/seat controls remain authoritative; no secrets reach the browser. Real Entra login is a separate deployment UAT gate.

## Verification and activation boundary

- Full web suite: 926 passed, 86 skipped (environment-dependent suites).
- Focused directory/OAuth and deployment configuration tests: 21 passed, including the real environment parser/record/rollback round trip.
- Web typecheck, targeted lint and production build passed. Local multi-directory sign-in returns HTTP 200; automated preview screenshots were unavailable.
- Client bundle suite has 32 pre-existing failures reproduced on origin/main, including a missing client README and unrelated deployment boundary assertions; no new failure categories were introduced.
- Independent security/correctness review found no concrete regression in the changed scope.
- Production activation remains pending actual directory IDs, Microsoft app registration/consent, runtime configuration, exact-email invitations and real returning/new-user UAT. No production config was changed.
