# CRM deployment bundle

Use `deploy.sh` with the protected deployment `.env` and a verified signed release.
The bundle pulls immutable images; it does not build application source on the host.
Keep `.env` private and do not paste it into logs or support messages.

## Agent connection and offline grace

Use the configured operator origin (production: https://jienweng.dpdns.org),
not the raw workers.dev service address, to sign in through Cloudflare Access.

1. Confirm client and deployment are active and ERP access is on.
2. Review the signed configuration and heartbeat time.
3. An agent built with the October 2026 recovery fix probes rejected identities
   again after a five-minute cooldown. It preserves the existing identity and
   continues to enforce signed leases; it never registers itself again.
4. On older agents, after correcting access, restart only the agent:
   `docker compose restart agent`. Check for `deployment_heartbeat_succeeded`.
5. Continued `identity_rejected` requires checking deployment status and the
   registered key. Do not delete the agent volume, bypass authentication or
   edit lease dates. Do not use `docker compose down -v` for recovery.

## Microsoft login

Configure the shared directory's Tenant ID, Client ID and valid Client Secret.
Register the exact Web redirect:
`https://app.quandatics.com/api/auth/oauth2/callback/microsoft-entra-id`.
For other deployments use their own BETTER_AUTH_URL with the same callback path.

`MICROSOFT_ALLOWED_DOMAINS` is an optional comma-separated allowlist for new
Microsoft-login users. It must include every intended QAR/CC domain when set.
An empty list still leaves directory restrictions and CRM membership checks in place.
The deploy script carries this setting through deployment, rollback and its record.

Confirm QAR/CC membership, role and reporting manager; test one real user per entity.
Daltos requires separate directory confirmation. Microsoft configuration does not
itself grant access to a CRM entity.

## Platform-master password recovery

This procedure requires a release containing `reset-master.mjs`; older images do
not contain it. It does not run migrations or seed and does not change the email.
Pause deployment/configuration changes while recovering; SQL and a host file are
separate resources and cannot provide a single atomic commit across both.

On the deployment host, from the protected bundle directory:

```sh
RECOVERY_DIR="$HOME/.local/state/crm-recovery"
mkdir -p "$RECOVERY_DIR"
chmod 0700 "$RECOVERY_DIR"
MIGRATOR_IMAGE=$(sed -n 's/^MIGRATOR_IMAGE=//p' .env)
COMPOSE_PROJECT_NAME=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' .env)

docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" \
  --network "${COMPOSE_PROJECT_NAME}_backend" \
  --mount "type=bind,src=$PWD/.env,dst=/recovery/deployment.env" \
  --mount "type=bind,src=$RECOVERY_DIR,dst=/recovery/output" \
  "$MIGRATOR_IMAGE" node /app/reset-master.mjs \
  --env-file /recovery/deployment.env \
  --output-file /recovery/output/new-master-password.json

cat "$RECOVERY_DIR/new-master-password.json"
```

The command derives the administrative database connection from POSTGRES_PASSWORD
and DB_NAME in the protected file, using `db` on the Compose backend network.
Source-based development can instead set DATABASE_ADMIN_URL explicitly and run
`pnpm --filter web db:reset-master --env-file /private/.env --output-file /private/new-password.json`.

Recovery checks the configured email and superadmin, updates only the `credential`
account, revokes that user's sessions and synchronizes PLATFORM_MASTER_PASSWORD.
The private output file is created with mode 0600 and must not already exist.
Choose a new output filename for another recovery. Store the password in your
password manager; delete the temporary file after confirming login.

If recovery fails, do not assume the new password was applied. A private output
file may remain for reconciliation. Known transaction failures restore the old
environment; a host crash or ambiguous network failure during commit requires
checking which password is active and aligning the protected environment before
resuming deployments. Never paste either password into diagnostics.
