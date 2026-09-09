# Lean Delivery Implementation Plan

**Goal:** Route releases to the affected service, reuse exact-commit verification, and test the production bundle locally before deployment.

**Architecture:** Preserve signed immutable release artifacts and production recovery checks. Classify changes centrally; validate reusable quality evidence against repository, workflow, event, commit, and conclusion. Keep PR checks and main integration checks, remove the third release test run.

**Spec:** User-approved single-server delivery design in this conversation.

## Tasks
- [ ] Add executable routing tests for documentation, tests, vendor-only, ERP, shared and unknown paths; unknown paths trigger both.
- [ ] Wire release routing and exact-commit quality verification; manual builds fail closed without successful main quality evidence.
- [ ] Replace public-tunnel staging with local production-bundle checks and retain promotion only after success.
- [ ] Simplify Cloudflare verification and pin source commits.
- [ ] Add deploy-latest and rollback entry points with health/version summaries and migration safeguards.
- [ ] Run workflow and deployment tests, inspect changes, merge and observe the release.

Selective image reuse is a later optimization: retain four signed images and BuildKit caches in this change to avoid introducing mixed-source manifest semantics.
