# Internal Ops database configuration

Verified on `internalops@10.1.10.26` on 2026-08-26. The deployment directory is
`/home/internalops/quandatics-client`.

## Connection details

| Setting | Value |
| --- | --- |
| Database engine | PostgreSQL 17 |
| Database name | `crm` |
| Application username | `crm_app` |
| Administrative username | `postgres` |
| Container hostname | `db` |
| PostgreSQL container port | `5432` |
| Host-published database port | `55433` |
| Public gateway port | `8081` |
| Environment | `production` |
| Release | `v1.2.117` |

The application uses `CRM_APP_PASSWORD`; migrations and administrative tasks use
`POSTGRES_PASSWORD`. Password values are intentionally not recorded here or
returned by diagnostic commands.

Portal editing uses the deployment agent's fixed UID `10001`. On hosts where it
is enabled, the deployment directory has ACL execute access for that UID and the
`.env` file has ACL read/write access while remaining inaccessible to the group
and other users. The deploy script validates this exact ACL shape.

For this host, the prerequisite is already applied:

```sh
setfacl -m u:10001:--x,m::--x /home/internalops/quandatics-client
setfacl -m u:10001:rw-,m::rw- /home/internalops/quandatics-client/.env
```

## Current portal boundary

The Cloudflare control plane can authenticate and queue signed commands for the
deployment agent. The current agent is isolated and has no host `.env` mount,
Docker socket, or SSH capability. Therefore the portal must not claim to edit
`/home/internalops/quandatics-client/.env` until a narrowly scoped host-side
configuration writer is deployed and verified.

Any future editor must:

1. expose only allowlisted non-secret fields and masked secret status;
2. avoid putting password values in the control-plane command queue or audit log;
3. write atomically, preserve mode `0600`, validate the complete environment with
   `deploy.sh`, and restart only the services affected by the change;
4. record the operator, target deployment, changed key names, and validation
   result without recording secret values.
