# CRM staging and production

Both deployments use Internal-Ops-DB. Staging has a separate deployment identity, PostgreSQL service, credentials, network and volumes. Reviewers use staging accounts and synthetic data.

| Item | Staging | Production |
| --- | --- | --- |
| Git branch | `staging` | `main` |
| Browser access | Internal HTTPS over office network or company VPN. DNS and gateway route pending. | https://app.quandatics.com |
| Host directory | `/home/internalops/quandatics-staging`, created with mode 0700 | `/home/internalops/quandatics-client` |
| Compose project | `crm-review-staging`, database running | `crm-v2`, verified running |
| Gateway | Proposed loopback port 18093 | Host port 8081 behind the production front door |
| Database | Healthy `crm-review-staging-db-1`, database `crm_staging`, volume `crm-review-staging_pgdata`. Reachable on the staging Docker network. | Production Compose PostgreSQL service and data volume |
| Auth and enrollment | Separate staging auth secrets, accounts and deployment enrollment | Existing production credentials and enrollment |
| Deployment status | CI passed on `bd9a7d2`. Persistent service, URL and deploy automation pending. | Release `v1.2.203`, source `4f865314f1f325a3c111256d62ce651291e7eaed`, migration `0104` at inspection. Public health endpoint returned HTTP 200. |

The six stopped containers of the previous `crm-staging` project were removed. Its configuration and data volume `crm-staging_pgdata` were retained for recovery. The new database runs from `database.compose.yaml` in the staging directory, with credentials in its private `.database.env`. Use the same staging database name, password, project and volume when enabling the full bundle.

## Activation

An authorized operator must provide the internal hostname and configure the HTTPS route, and issue a separate staging enrollment through normal deployment registration. The available SSH user has Docker access but cannot change the root-owned Nginx configuration. Store credentials in the protected staging environment, not in Git or this document.

After enrollment and routing are in place, deploy the isolated staging project with a persistent database and synthetic seed. Verify login, database isolation and production health. Wire deployment to successful staging CI, record the URL and deployed digest in Actions, and verify the first end-to-end run before requiring the staging deployment for production promotion.

See [permanent staging rollout](permanent-staging-rollout.md) for the sequence and acceptance checks.
