# CI/release simplification

Authorized local implementation. Keep PR quality required; keep exact-main quality evidence, immutable signed images, security scans, source-free bundle, smoke test, production health checks and rollback protections.

1. Trigger staging only on successful completed main release-images runs. Retain manual release_run_id retry. Remove the image workflow dispatch and its unnecessary actions-write permission. This eliminates the in-progress/success race.
2. Limit automatic release tagging to successful main push/manual quality runs; never PR/reusable runs.
3. Make build policy explicit: PR quality compiles the app; main quality runs tests/checks and release-images builds the deployable artifact. Manual quality can request a standalone build. No second quality job in release-images.
4. Publish linked summaries for image evidence and staging promotion; retain stage-specific reruns/manual recovery rather than replacing scans with retries that conceal failures.
5. Run workflow policy tests, YAML validation and local actionlint if available. No live workflow dispatch or deployment during validation.

Completed locally. 62 workflow tests, backup evidence tests and actionlint passed. Independent reviewer found no blockers. No push, dispatch or deployment.
