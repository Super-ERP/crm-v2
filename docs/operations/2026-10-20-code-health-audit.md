# CRM audit and remediation — 20 October 2026

Baseline: `origin/main` at `f44f633`. Work is isolated on `chore/audit-dead-code-cleanup`.
No changes from this branch have been merged or deployed. Earlier live password
recovery and the agent restart were separate operational actions.

## Resolved in this branch

- [x] Remove eight orphan UI/action files, five unused direct dependencies, five React imports, the unused command-kind schema and the related-project-code adapter.
- [x] Remove the obsolete milestone-template editor and its unused update action. Preserve existing stored templates and database schema.
- [x] Trace and remove nine additional unreferenced action/helper implementations: listPermissionAdmins, getRolePermissions, updateIntercompanyPartners, listTenantMembers, isFinanceEnabled, the misleading funnel deleteOpportunity wrapper, upsertTemplateCodeOnAccount, listActiveQuotationTemplateOptions and purgeResolvedAlerts. Keep live queries, actual deletion paths and alert handling intact.
- [x] Remove unused auth-client aliases; all live callers use authClient.
- [x] Replace the agent's permanent rejection latch with a five-minute recovery cooldown. Retain the same registered identity, pause polling while rejected, retry the authenticated heartbeat, and resume normal operation only after success. Continued rejections restart the cooldown. Do not extend leases or re-register automatically.
- [x] Add regression coverage for both 401 and 403, continued denial, eventual recovery and the actual scheduled retry.
- [x] Harden privileged password recovery: exact configured superadmin and credential provider; transactionally update password and delete only that user's sessions; generate a private 0600 recovery file; synchronize the protected deployment password; validate duplicate dotenv assignments; restore the environment on known database transaction failure. No raw errors or secrets are logged.
- [x] Disable session-cookie caching so revoked sessions are checked against the database. Reproduce the old cached-cookie behavior using Better Auth itself, then verify revocation under the production policy. This adds a database session lookup to authenticated requests.
- [x] Package reset-master.mjs in the source-free migrator; update artifact allowlists and smoke checks; verify the documented command in an isolated source-free container against PostgreSQL, including the shipped DERIVED_BY_DEPLOY placeholder.
- [x] Wire MICROSOFT_ALLOWED_DOMAINS through the deploy parser, Compose, export, recorded state and rollback. An empty value retains tenant restrictions and explicit CRM membership checks.
- [x] Default missing legacy GITHUB_ISSUES_TOKEN during rollback instead of failing under shell nounset.
- [x] Use exact tag/main workflow identities for image verification instead of the unanchored identity regexp; test tagged verification, exact-main fallback and signature failure.
- [x] Reconcile deployment tests with the current agent environment and restricted mounts. Preserve its read-only backup mount, no Docker socket and network isolation checks.
- [x] Resolve control-plane test configuration paths relative to the config file so workspace audit/config loading works from the repository root.
- [x] Update misleading password-policy comments and README text; restore bundle README with recovery and Microsoft setup instructions; ignore generated root dist artifacts.

## Dead-code scan interpretation

A full-workspace Knip 6.42.0 scan now runs without the original migration-directory
configuration error. It reports zero unresolved imports and zero unused production
dependencies. It still reports candidate unused exports/types and special entry
points; these are not a deletion list.

The 13 remaining whole-file candidates are manual ingestion/workbook/backfill/seed
scripts, the end-to-end licensing fixture, the provision-deployment-runtime workflow
script, URL-loaded prefs-init.js, the Vitest server-only stub, the Python-launched
quotation fixture and the finance placeholder read by a lifecycle regression test.
They were retained rather than deleted as runtime orphans. The lone dev-dependency
candidate is esbuild, used by the root migrator build script. Cloudflare built-in
module imports appear as unlisted dependencies; they are not missing npm packages.

Unused export/type reports include compatibility barrels, library primitives,
public contracts, test seams and symbols still called within their own modules.
These do not establish that the underlying implementation is dead. Removing
public API or types requires consumer-level evidence. No database column or
migration was removed based on an import scan.

Reproduce the scanner with `pnpm dlx knip@6.42.0 --no-progress` from the repo root.
A nonzero scan exit still reflects these retained candidates; the repository is
not claimed to have zero unused exports.

## Verification

- Strict TypeScript unused-local/parameter checking, ESLint, app build, agent build,
  agent typecheck and control-plane typecheck are included in final verification.
- Real PostgreSQL recovery tests cover credential isolation, session revocation,
  non-superadmin rejection, duplicate credentials, duplicate dotenv assignments,
  existing output-file protection and deferred-commit rollback.
- A real Better Auth regression test covers old-cookie rejection after database
  session revocation. A template-based test covers recovery URL derivation.
- Source-free CLI container smoke verified hash correctness, environment sync,
  session deletion and 0600 output permissions with fixture-only credentials.
- Deployment bundle, runtime artifact checks and independent review are included.
- Final test counts, build outcomes and merge-base/conflict check are recorded in
  the delivery response. Skipped database suites are not claimed as validated.

## Conflict and review checks

- The branch is based on current main at f44f633; a non-mutating merge-tree check
  found no conflict with main or the active address-recovery branch (PR #271).
- The older PR #273 assumed QAR used a separate Microsoft directory and overlapped
  auth/deployment configuration. It was closed as superseded after the shared-tenant
  confirmation. Its source branch was retained; none of its code was merged here.
- Independent review found three concrete recovery problems (cached sessions,
  ambiguous environment assignments and the derived database URL placeholder).
  Each was fixed and regression-tested. Final review found no actionable defects.
- Web suite: 909 passed, 94 skipped. Eight PostgreSQL recovery tests were separately
  executed successfully. Agent: 44 passed. Control plane: 266 passed. Shared protocol:
  59 passed. Source-free container recovery and deployment-bundle tests passed.
- Whole-workspace scan: zero unresolved imports, zero unused production
  dependencies; 13 retained special-entrypoint candidates, 124 export candidates
  and 71 type candidates. Those retained reports are not claimed as zero dead code.

## Remaining external checks

- [ ] Din registers the existing app's exact **Web** callback:
  https://app.quandatics.com/api/auth/oauth2/callback/microsoft-entra-id
- [ ] Confirm QAR/CC domains and pilot-user emails; ensure the optional allowlist
  includes their actual domains and each CRM entity has the intended memberships,
  roles and reporting managers. Sharing a Microsoft tenant does not grant access.
- [ ] Test one real QAR and one CC login, entity access, approvals and own-record
  visibility. This requires their accounts and Microsoft registration access.
- [ ] Confirm Daltos' directory separately; do not assume it shares this tenant.
- [ ] Control-plane audit access is needed to establish the original 17 October
  rejection trigger. A disabled deployment can cause it, but that trigger was not
  verified for this incident. Local Wrangler is not authenticated to read that audit.
  The stuck-recovery behavior was reproduced and fixed.

## Rollout notes

Keep this branch unmerged until review. After approval, use the signed release
pipeline, verify a fresh heartbeat/lease, and rehearse disable/re-enable recovery
in staging. Password recovery and deployment-file writes cannot form a single
atomic commit across database and host storage: pause concurrent deployment or
configuration changes and reconcile the retained private output file after a
host crash or ambiguous commit failure. See deploy/client/README.md.
