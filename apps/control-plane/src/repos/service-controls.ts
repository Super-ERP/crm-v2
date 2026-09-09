import { canonicalJson, evaluateLease, type EntitlementLease } from "@crm/control-protocol"
import { prepareOperatorAuditStatement } from "../audit"
import { badRequest, notFound, SafeHttpError } from "../http/errors"
import type { MutationActor } from "./clients"
import { getCurrentEntitlementReference, getEntitlement, issueEntitlement } from "./entitlements"

const FRESHNESS_MS = 30 * 60 * 1000

export interface ServiceControlsView {
  deploymentId: string
  clientId: string
  clientName: string
  deploymentName: string
  environment: string
  enabled: boolean | null
  seatLimit: number | null
  revision: number
  adopted: boolean
  canSave: boolean
  blockedReason: string | null
  syncStatus: "applied" | "pending" | "attention"
  activeUsers: number | null
  reservedInvitations: number | null
  lastConnectedAt: string | null
}

interface PolicyRow {
  enabled: number
  seat_limit: number
  revision: number
  base_payload_json: string
}

async function snapshot(database: D1Database, deploymentId: string) {
  const deployment = await database.prepare(
    "SELECT d.id, d.client_id, d.deployment_key, d.environment, d.status, c.display_name, c.status AS client_status, s.contract_id FROM deployments d JOIN clients c ON c.id = d.client_id LEFT JOIN deployment_entitlement_schedules s ON s.deployment_id = d.id WHERE d.id = ?",
  ).bind(deploymentId).first<{
    id: string; client_id: string; deployment_key: string; environment: string
    status: string; display_name: string; client_status: string; contract_id: string | null
  }>()
  if (!deployment) throw notFound()
  const [policy, heartbeat, reference] = await Promise.all([
    database.prepare("SELECT enabled, seat_limit, revision, base_payload_json FROM service_controls WHERE deployment_id = ?").bind(deploymentId).first<PolicyRow>(),
    database.prepare("SELECT id, observed_at, health_status, active_user_count, reserved_invitation_count, entitlement_version, supported_entitlement_schema_version FROM heartbeat_rollups WHERE deployment_id = ? ORDER BY observed_at DESC, id DESC LIMIT 1").bind(deploymentId).first<{
      id: string; observed_at: string; health_status: string; active_user_count: number | null
      reserved_invitation_count: number | null; entitlement_version: string | null
      supported_entitlement_schema_version: number | null
    }>(),
    getCurrentEntitlementReference(database, deploymentId),
  ])
  const latest = reference ? await getEntitlement(database, deploymentId, reference.version) : null
  return { deployment, policy, heartbeat, latest }
}

function fresh(heartbeat: Awaited<ReturnType<typeof snapshot>>["heartbeat"], now: Date): boolean {
  if (!heartbeat) return false
  const age = now.getTime() - Date.parse(heartbeat.observed_at)
  return Number.isFinite(age) && age >= 0 && age <= FRESHNESS_MS
}

export async function getServiceControls(database: D1Database, deploymentId: string, now = new Date()): Promise<ServiceControlsView> {
  const { deployment, policy, heartbeat, latest } = await snapshot(database, deploymentId)
  const recent = fresh(heartbeat, now)
  const payload = latest?.envelope.payload
  const setupReady = deployment.status === "active" && deployment.client_status === "active" &&
    deployment.contract_id !== null && payload !== undefined && payload.schemaVersion !== 1 &&
    (policy !== null || heartbeat?.entitlement_version === String(latest?.version))
  const capable = heartbeat?.supported_entitlement_schema_version === 3 && recent
  const blockedReason = !setupReady ? "service_setup_required" : !policy && !capable ? "service_upgrade_required" : null
  const matches = policy && payload?.schemaVersion === 3 && payload.serviceRevision === policy.revision &&
    payload.serviceEnabled === Boolean(policy.enabled) && payload.maxActiveUsers === policy.seat_limit
  const applied = matches && heartbeat?.entitlement_version === String(latest?.version)
  const accessExpired = policy?.enabled === 1 && payload !== undefined && !evaluateLease(payload, now).writeAllowed
  return {
    deploymentId, clientId: deployment.client_id, clientName: deployment.display_name,
    deploymentName: deployment.deployment_key, environment: deployment.environment,
    enabled: policy ? Boolean(policy.enabled) : payload ? evaluateLease(payload, now).writeAllowed : null,
    seatLimit: policy?.seat_limit ?? payload?.maxActiveUsers ?? null,
    revision: policy?.revision ?? 0, adopted: policy !== null,
    canSave: blockedReason === null, blockedReason,
    syncStatus: blockedReason ? "attention" : !applied ? "pending" : !recent || heartbeat?.health_status !== "healthy" || accessExpired ? "attention" : "applied",
    activeUsers: heartbeat?.active_user_count ?? null,
    reservedInvitations: heartbeat?.reserved_invitation_count ?? null,
    lastConnectedAt: heartbeat?.observed_at ?? null,
  }
}

export async function getClientServiceControls(database: D1Database, clientId: string, now = new Date()): Promise<ServiceControlsView[]> {
  const exists = await database.prepare("SELECT 1 FROM clients WHERE id = ?").bind(clientId).first()
  if (!exists) throw notFound()
  const deployments = await database.prepare("SELECT id FROM deployments WHERE client_id = ? ORDER BY environment, deployment_key, id").bind(clientId).all<{ id: string }>()
  return Promise.all(deployments.results.map(({ id }) => getServiceControls(database, id, now)))
}

export async function saveServiceControls(environment: CloudflareBindings, input: {
  deploymentId: string; enabled: boolean; seatLimit: number; expectedRevision: number; actor: MutationActor; now?: Date
}): Promise<void> {
  if (typeof input.enabled !== "boolean" || !Number.isSafeInteger(input.seatLimit) || input.seatLimit < 1 || input.seatLimit > 100000 ||
    !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw badRequest()
  const now = input.now ?? new Date()
  const database = environment.CONTROL_DB
  const { deployment, policy, heartbeat, latest } = await snapshot(database, input.deploymentId)
  if ((policy?.revision ?? 0) !== input.expectedRevision) throw new SafeHttpError(409, "service_controls_changed")
  const base = latest?.envelope.payload
  if (deployment.status !== "active" || deployment.client_status !== "active" || deployment.contract_id === null || !base || base.schemaVersion === 1 ||
    (!policy && heartbeat?.entitlement_version !== String(latest?.version))) {
    throw new SafeHttpError(409, "service_setup_required")
  }
  if (!policy && (!fresh(heartbeat, now) || heartbeat?.supported_entitlement_schema_version !== 3)) {
    throw new SafeHttpError(409, "service_upgrade_required")
  }
  if (input.seatLimit < (policy?.seat_limit ?? base.maxActiveUsers)) {
    if (!fresh(heartbeat, now) || heartbeat?.health_status !== "healthy" || heartbeat.active_user_count === null || heartbeat.reserved_invitation_count === null) {
      throw new SafeHttpError(409, "service_seat_usage_stale")
    }
    if (heartbeat.active_user_count + heartbeat.reserved_invitation_count > input.seatLimit) {
      throw new SafeHttpError(409, "service_seat_limit_in_use")
    }
  }
  const changed = !policy || Boolean(policy.enabled) !== input.enabled || policy.seat_limit !== input.seatLimit
  const revision = (policy?.revision ?? 0) + (changed ? 1 : 0)
  if (changed) {
    const at = now.toISOString()
    const audit = await prepareOperatorAuditStatement(database, {
      operatorId: input.actor.operatorId, requestId: input.actor.requestId,
      action: "service.controls.update", targetType: "deployment", targetId: input.deploymentId,
      outcome: "success", metadata: { enabled: input.enabled, seatLimit: input.seatLimit, revision }, createdAt: at,
    })
    try {
      await database.batch([
        database.prepare("INSERT INTO service_control_operations (id, deployment_id, expected_revision, expected_entitlement_version, expected_heartbeat_id, requested_seat_limit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), input.deploymentId, input.expectedRevision, latest!.version, heartbeat?.id ?? null, input.seatLimit, at),
        database.prepare("INSERT INTO service_controls (deployment_id, enabled, seat_limit, revision, base_payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(deployment_id) DO UPDATE SET enabled = excluded.enabled, seat_limit = excluded.seat_limit, revision = excluded.revision, updated_at = excluded.updated_at")
          .bind(input.deploymentId, input.enabled ? 1 : 0, input.seatLimit, revision, policy?.base_payload_json ?? canonicalJson(base as EntitlementLease), at),
        audit.statement,
      ])
    } catch (error) {
      if (error instanceof Error && error.message.includes("service controls changed")) throw new SafeHttpError(409, "service_controls_changed")
      throw error
    }
  }
  // The durable desired policy is already committed. Automatic renewal retries
  // a failed signature/delivery; the UI must say pending, never falsely applied.
  try {
    await issueEntitlement(environment, {
      deploymentId: input.deploymentId, issuanceKey: `service:${revision}`,
      actor: { ...input.actor, source: "operator" }, now,
    })
  } catch {
    throw new SafeHttpError(503, "service_update_pending")
  }
}

export async function assertLegacyContractWritable(database: D1Database, contractId: string): Promise<void> {
  const adopted = await database.prepare("SELECT 1 FROM service_controls p JOIN deployment_entitlement_schedules s ON s.deployment_id = p.deployment_id WHERE s.contract_id = ? LIMIT 1").bind(contractId).first()
  if (adopted) throw new SafeHttpError(409, "service_legacy_controls_retired")
}

export async function assertLegacyDeploymentWritable(database: D1Database, deploymentId: string): Promise<void> {
  const adopted = await database.prepare("SELECT 1 FROM service_controls WHERE deployment_id = ?").bind(deploymentId).first()
  if (adopted) throw new SafeHttpError(409, "service_legacy_controls_retired")
}
