# Simple vendor service controls implementation plan

**Goal:** Let the vendor control Quandatics with an access switch and seat limit, preserving the client ERP configuration.

**Architecture:** A deployment-scoped service policy becomes authoritative after explicit adoption. Existing signed delivery, revision guards, agent identity, and seat accounting remain. Schema v3 distinguishes service access from legacy billing-driven leases. Deployment remains a later step.

**Specification:** User-approved conversation: access on/off, seats allowed, automatic secure synchronization, honest applied/pending status; preserve client modules/settings, existing records and operational connectivity.

## Constraints and decisions

- No production mutations, deployment, or credential changes.
- Work on feat/simple-service-controls; existing checkout was clean and already has dependencies.
- Use additive migrations, compatibility with legacy v2, and explicit first-save adoption only after ERP advertises v3 support.
- Preserve last signed module configuration. Technical offline lease/grace stays; billing dates cease to drive adopted service access.
- Reject seat reductions below current users plus invitation reservations; never automatically delete or disable a person.
- Legacy edits must not override adopted policies. Operational repair remains accessible.

## Tasks

- [x] Protocol and ERP: add v3/serviceEnabled with backward compatibility; test off enforcement for active sessions, pages/actions/APIs, signature validation, and operational exemptions.
- [x] Synchronization: test then implement authenticated latest-version polling and immediate server acknowledgement, including retries/replay and compatibility.
- [x] Control-plane persistence: add service policy and concurrency guard migration. Test save, adoption, module preservation, both seat directions, stale usage, idempotent renewal, contract independence, and invalid signatures/settings.
- [x] Vendor UI: make client/deployment everyday pages access/seat controls, keep maintenance advanced, retire legacy edits for adopted deployments. Test role/origin/input gates and readable states.
- [x] Integration: run protocol, agent, control-plane and web affected suites/typechecks/builds; review complete diff; document compatible staged rollout and rollback limits.

## Shared interfaces

`ServiceControlsView`: deploymentId, clientId, clientName, deploymentName, environment; enabled:boolean|null; seatLimit:number|null; revision:number; adopted:boolean; canSave:boolean; blockedReason:string|null; syncStatus:applied|pending|attention; activeUsers:number|null; reservedInvitations:number|null; lastConnectedAt:string|null.

`saveServiceControls(env,{deploymentId,enabled,seatLimit,expectedRevision,actor,now?})` validates and saves the policy, then automatically issues its signed version. Failed signing preserves pending desired state for automatic retry; it must never report Applied.

## Progress / review ledger

Initial scan: protocol v3 is produced for ERP and CP; status capability flows ERP -> agent -> heartbeat storage -> adoption gate. UI consumes the service view and save signatures above. Main owns CP migration and policy repository; agents have distinct protocol/web, sync and UI ownership. Compatibility fields remain during this release to avoid destructive storage migration. Removing those historical fields is explicitly not required to make the service policy authoritative.

Review findings resolved: adoption and seat reductions recheck database state atomically; legacy mutations have database guards in addition to route checks; retry cron runs every minute with short adopted-policy backoff; polling uses live ERP state, persists pending acknowledgements, and serializes heartbeat/poll cycles. Capability 3 requires verified applied migration 0089 or newer. Protocol/web/sync final review found no additional critical defects.

Verification completed: control-plane 264 tests plus 2 migration tests; protocol 59; agent 41; PostgreSQL 35; deployment workflow 12; all component type checks; worker dry-run and production web build. Web final full suite: 645 passed, 61 environment-dependent tests skipped; 35 PostgreSQL tests were separately run against a disposable local database. Lint has 0 errors and 2 pre-existing unused-variable warnings in unchanged billing/sales-order pages. Browser smoke test and production rollout intentionally remain later; no connected browser was available in this session.
