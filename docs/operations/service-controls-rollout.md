# Simple service controls

The vendor's everyday client page has two editable settings: ERP access and seats allowed. Saving records the desired state and automatically signs an update. The page says Applied only after a recent server report acknowledges the matching signed policy; saving alone does not prove delivery.

## Behavior

- On preserves the client's existing modules, release configuration, permissions and ERP settings.
- Off blocks customer requests, including existing sessions and API requests. Management endpoints remain reachable for recovery and re-enabling; records are not deleted.
- Seats count distinct enabled users plus reserved invitations using existing deployment-wide accounting. Increases and decreases share one save operation. A decrease requires recent usage and is rejected if that usage exceeds the limit. Users added after the usage report can produce a temporary overage: existing users are retained and new seat claims are denied until usage is below the limit. Never automatically evict a customer user.
- Contract dates, prices and billing statuses do not determine access after adoption. Historical data and v2 clients remain supported. Compatibility fields remain inside the signed payload for existing storage readers; v3 enforcement and SQL seat checks use the new service policy.
- Technical connectivity rules remain: an enabled policy has a 24-hour lease with seven further days of offline grace. After that allowance, customer writes become read-only until an update arrives. Explicit Off stays Off even when disconnected. No remote system can deliver a new Off decision to an unreachable server; show Waiting until acknowledgement.
- Updates use the existing authenticated outbound connection. Lightweight version checks run around once per minute (with jitter), and a successful apply sends a fresh acknowledgement. This is not a guaranteed delivery deadline.

## Ordered rollout (not yet performed)

1. Record deployed application, agent and migration versions; compare them with the reviewed build. Back up Cloudflare D1 and the customer's database. Preserve the current signed policy and service settings.
2. Test the complete flow on an isolated staging deployment, including actual browser sign-in and existing-session Off/On, API access, seat claims, disconnected agent, and signing failure/retry.
3. Apply additive Cloudflare migration `0012_service_controls.sql` and deploy the compatible control-plane Worker. No adoption occurs merely by installing it.
4. Publish and deploy verified application/migrator/agent images through the existing release process. Apply ERP migration `0089_service_controls.sql` so database seat enforcement also understands v3. Do not change the customer's Cloudflare Access/sign-in configuration as part of this rollout.
5. Verify the server's authenticated status reports schema support 3 and the agent passes that capability to Cloudflare. Verify its acknowledged version matches the latest legacy signed version. Until then, the new save operation is gated.
6. Open the client service page, review the displayed current access and seats, and save the intended settings once. This explicitly adopts that deployment and snapshots the existing modules/configuration.
7. Verify Applied, usage, login, existing-session behavior, and normal client workflows. Verify that expired historical billing dates do not change adopted access. Exercise Off only during an agreed maintenance window.

## Rollback boundary

Before first adoption, legacy v2 policies continue to work and the additive tables can remain in place.

After a v3 policy has been applied, retain a v3-capable ERP and SQL seat function. Rolling back to an older v2-only application is not a supported recovery: it may reject the current policy or lose Off enforcement. Roll back the UI to a compatible build or forward-fix the control service while preserving the latest policy and revision. Never delete the service policy, reset revision counters, or replay an older enabled policy to recover.

## Local verification

The implementation includes tests for automatic issuance, explicit compatibility-gated adoption, current module preservation, stale/concurrent edits, acknowledged vs pending state, both seat directions, stale usage, billing independence, and renewal retry. Protocol and ERP tests cover signatures, replay, Off/On, request boundaries and SQL seat decisions. Deployment is intentionally a separate step.
