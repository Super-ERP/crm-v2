# CI/CD flow and recovery

Implemented locally on 18 November 2026; not pushed or deployed.

## Normal flow

1. PR quality runs affected lint/type checks, database-backed tests, workflow checks and an explicit standalone ERP build. The required check remains named quality.
2. Successful main push/manual quality can create a release; PR quality cannot create release tags. Main checks are repeated against the exact merged commit; that is intentional verification, not removed duplication.
3. Release-images reuses successful quality evidence for that exact main commit, builds the four deployable images, scans/signs/verifies them and uploads one immutable manifest and signed client bundle.
4. After release-images completes successfully on main, deploy-staging starts from that exact workflow run ID. It verifies the signed bundle and smoke-tests the production Compose bundle. It no longer depends on a dispatch from an unfinished image run.
5. Successful smoke testing dispatches production with that release tag, the exact image run ID and the tested bundle checksum. Production verifies the bundle, deploys signed digests and checks health/entitlement. Vendor deployment and rollback restrictions retain their original behavior.

## Build policy

PRs explicitly compile the ERP app. Main quality does not add another standalone app compilation; release-images builds the deployable artifact. Manual quality defaults to an additional standalone build for diagnosis; reusable quality retains its run_build input. Images are not rebuilt separately for staging or production. Workflow boundaries remain separate to preserve runner and permission isolation.

## Recovery

- Fix failing checks or vulnerable packages rather than disabling gates. Historical failed runs inspected included backup image build failures and backup/agent vulnerability scans; logs were unavailable in this session, so no specific vulnerability root cause is claimed.
- For an image failure, inspect the failed matrix job and its first failing step. Existing GitHub rerun controls remain available. No new promise of artifact reuse across reruns is introduced.
- For a staging failure, rerun staging or manually run deploy-staging with the successful release-images run ID. No image rebuild is required for that recovery.
- For production failure, inspect its summary and rerun with the same release tag after resolving the cause. Rollback remains the explicit production operation and retains migration guards.
- Image and staging summaries identify source/release, outcome and recovery reference; failed staging never reports successful production promotion.

## Validation

62 workflow tests passed; signed backup-evidence tests passed. Actionlint 1.7.7 passed all four modified workflow files (shellcheck integration disabled because unavailable). Independent read-only review found no blockers. No hosted workflow, security scan, deployment or live smoke test was dispatched. Automatic completion triggers take effect only once the workflow changes are on the default branch.

Official trigger reference: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
