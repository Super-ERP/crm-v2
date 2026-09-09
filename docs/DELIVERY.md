# Delivering changes

Merge a PR after its checks pass. The main commit is checked once as an integration gate. The release builder reuses that exact commit's successful verification rather than running the tests a third time.

- ERP changes build signed images, smoke-test the production bundle locally, then deploy Quandatics.
- Vendor-only changes deploy Cloudflare without building ERP images.
- Shared or unclassified changes release both, with ERP deployed before the vendor update. Protocol changes must remain backward compatible during this interval.
- Documentation and test-only changes run checks without releasing.

GitHub Actions → deploy-production → Run workflow offers **Deploy latest** and **Roll back**. Deploy latest accepts an optional specific release tag. Roll back requires a prior release tag and is blocked if its database migration version is older than the installed version. Database recovery across migrations uses the existing backup/restore procedure.

The local smoke deployment uses a disposable database and the signed production Compose bundle. It checks migration/startup, HTTP health, and the master password policy. It binds only to localhost and removes its own containers and volumes when finished. It does not register an agent or validate production data upgrades; database enforcement tests and the production agent/entitlement checks remain separate gates.

Existing persistent staging data is retained, but new releases no longer start a public quick tunnel or change authentication origins.

Four signed image artifacts remain in each ERP release, using existing build caches. Selective reuse of agent/backup images is deliberately deferred because the manifest currently associates every image with the release source commit.

If GitHub misses a post-merge trigger, run the **quality** workflow manually on `main`. A successful exact-commit check resumes the normal release routing.
