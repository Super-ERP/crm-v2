# Permanent CRM staging rollout

The staging branch is live. Its first quality run with the new configuration passed, including the ERP build. The current Tailscale development preview is useful for ad hoc review. A permanent staging site needs a deployment driven by the branch and a persistent data store.

## Hosting decision

Use Internal-Ops-DB, the existing production host, with a separate Docker Compose project and staging deployment identity. SSH inspection confirmed an older stopped `crm-staging` project in `/home/internalops/crm-v2-staging`. Preserve its database volume. Configure a new, separate deployment directory and volumes for the current release flow. Use an internal HTTPS hostname served by the company gateway and reachable on the office network or existing company VPN. Reviewers use their normal browser and a staging CRM account. This requires an internal DNS record and a gateway route to the separate staging backend. The available SSH user cannot write the host Nginx configuration. Configure APP_URL and BETTER_AUTH_URL to the final HTTPS origin.

The host showed 6.9 GiB available memory and 109 GiB free disk at inspection, with most of its 512 MiB swap in use. Build images on GitHub-hosted runners and set explicit runtime memory limits. Ports 18093 and 15440 were unused at inspection and are candidates for the loopback gateway and database. Recheck before starting services. Provision a separate staging deployment enrollment before starting the signed bundle. Verify production health before and after first staging startup.

## Setup order

1. Provision a staging-only directory on Internal-Ops-DB, a persistent Compose project and a separate database and upload volume. Start with synthetic data. Verify the application and migrator both connect to the staging PostgreSQL service on the staging Compose network. Use independent PostgreSQL, application-role and auth secrets. Do not mount production volumes, point staging at the production database, or import a production backup. Create staging credentials and an entitlement through the normal deployment enrollment. Keep email and third-party integrations on test credentials or disabled.
2. Protect the staging branch and require quality checks and PR approvals before trusting its commits for deployment. Keep PR jobs on GitHub-hosted runners. Keep staging host credentials in a protected staging deployment environment. If using a self-hosted runner, isolate it from production and restrict its deployment job to verified staging commits.
3. Build immutable images for the exact staging commit after quality passes. Deploy to the isolated host, run migrations and verify health and sign-in. Record the source commit, deployed digest and clickable staging URL in the Actions summary. Treat a failing health or login check as a failed staging deployment.
4. Require a successful staging deployment before promotion to main. Verify that the release represents the reviewed source and uses the reviewed image digests. If the proposed merge creates a different source tree, exercise that tree in staging before promoting it. Change the production promotion gate once staging has passed its first end-to-end release.
5. Test one feature PR, persistence across redeployment, a failed staging deploy, and a production promotion using the same staged artifacts. Confirm the production workflow keeps its signed-bundle and rollback checks.

Production handoff improvements currently in the local worktree need their own review. The existing deploy-staging workflow is a release smoke test and should remain distinct from the persistent preview deployment during rollout.
