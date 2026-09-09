-- Explicit adoption only: installing this migration does not change any client's access.
ALTER TABLE heartbeat_rollups ADD COLUMN supported_entitlement_schema_version INTEGER;

CREATE TABLE service_controls (
  deployment_id TEXT PRIMARY KEY REFERENCES deployments(id),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  seat_limit INTEGER NOT NULL CHECK (seat_limit BETWEEN 1 AND 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  base_payload_json TEXT NOT NULL CHECK (json_valid(base_payload_json)),
  updated_at TEXT NOT NULL
);

-- The operation and policy update run in one D1 batch. A stale browser tab or
-- concurrent first adoption must not silently overwrite a more recent decision.
CREATE TABLE service_control_operations (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES deployments(id),
  expected_revision INTEGER NOT NULL CHECK (expected_revision >= 0),
  expected_entitlement_version INTEGER NOT NULL,
  expected_heartbeat_id TEXT,
  requested_seat_limit INTEGER NOT NULL CHECK (requested_seat_limit BETWEEN 1 AND 100000),
  created_at TEXT NOT NULL
);
CREATE TRIGGER service_control_operation_guard
BEFORE INSERT ON service_control_operations
WHEN COALESCE((SELECT revision FROM service_controls WHERE deployment_id = NEW.deployment_id), 0) <> NEW.expected_revision
  OR (NEW.expected_revision = 0 AND (
    (SELECT MAX(version) FROM entitlement_versions WHERE deployment_id = NEW.deployment_id) IS NOT NEW.expected_entitlement_version
    OR NOT EXISTS (
      SELECT 1 FROM heartbeat_rollups h
      JOIN deployments d ON d.id = h.deployment_id
      JOIN clients c ON c.id = d.client_id
      JOIN deployment_entitlement_schedules s ON s.deployment_id = d.id
      JOIN entitlement_versions e ON e.deployment_id = d.id AND e.version = NEW.expected_entitlement_version
      WHERE h.id = NEW.expected_heartbeat_id AND h.deployment_id = NEW.deployment_id
        AND h.id = (SELECT latest.id FROM heartbeat_rollups latest WHERE latest.deployment_id = NEW.deployment_id ORDER BY latest.observed_at DESC, latest.id DESC LIMIT 1)
        AND h.supported_entitlement_schema_version = 3
        AND h.entitlement_version = CAST(NEW.expected_entitlement_version AS TEXT)
        AND julianday(NEW.created_at) - julianday(h.observed_at) BETWEEN 0 AND (30.0 / 1440)
        AND d.status = 'active' AND c.status = 'active'
        AND s.contract_id = e.contract_id
    )
  ))
  OR (NEW.requested_seat_limit < COALESCE(
    (SELECT seat_limit FROM service_controls WHERE deployment_id = NEW.deployment_id),
    (SELECT json_extract(payload_json, '$.maxActiveUsers') FROM entitlement_versions WHERE deployment_id = NEW.deployment_id AND version = NEW.expected_entitlement_version)
  ) AND NOT EXISTS (
    SELECT 1 FROM heartbeat_rollups h
    WHERE h.deployment_id = NEW.deployment_id
      AND h.id = (SELECT latest.id FROM heartbeat_rollups latest WHERE latest.deployment_id = NEW.deployment_id ORDER BY latest.observed_at DESC, latest.id DESC LIMIT 1)
      AND h.health_status = 'healthy'
      AND h.active_user_count + h.reserved_invitation_count <= NEW.requested_seat_limit
      AND julianday(NEW.created_at) - julianday(h.observed_at) BETWEEN 0 AND (30.0 / 1440)
  ))
BEGIN
  SELECT RAISE(ABORT, 'service controls changed');
END;

CREATE TRIGGER service_controls_insert_schedule
AFTER INSERT ON service_controls
BEGIN
  UPDATE deployment_entitlement_schedules SET state_revision = state_revision + 1,
    next_check_at = NEW.updated_at, updated_at = NEW.updated_at
  WHERE deployment_id = NEW.deployment_id;
END;
CREATE TRIGGER service_controls_update_schedule
AFTER UPDATE ON service_controls
BEGIN
  UPDATE deployment_entitlement_schedules SET state_revision = state_revision + 1,
    next_check_at = NEW.updated_at, updated_at = NEW.updated_at
  WHERE deployment_id = NEW.deployment_id;
END;

-- Route checks provide friendly messages; database guards also cover a request
-- that passed a legacy precheck immediately before adoption committed.
CREATE TRIGGER service_contract_controls_retired
BEFORE UPDATE OF plan_id, status, starts_at, ends_at, seat_limit, renewal_policy,
  suspension_at, scheduled_seat_limit, seat_limit_effective_at ON contracts
WHEN EXISTS (SELECT 1 FROM service_controls p JOIN deployment_entitlement_schedules s ON s.deployment_id = p.deployment_id WHERE s.contract_id = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'service legacy controls retired');
END;
CREATE TRIGGER service_schedule_controls_retired
BEFORE UPDATE OF contract_id, configuration_version, release_channel, minimum_supported_app_version, approved_image_digest ON deployment_entitlement_schedules
WHEN EXISTS (SELECT 1 FROM service_controls WHERE deployment_id = OLD.deployment_id)
BEGIN
  SELECT RAISE(ABORT, 'service legacy controls retired');
END;
CREATE TRIGGER service_deployment_status_retired
BEFORE UPDATE OF status ON deployments
WHEN NEW.status <> OLD.status AND EXISTS (SELECT 1 FROM service_controls WHERE deployment_id = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'service legacy controls retired');
END;
CREATE TRIGGER service_client_status_retired
BEFORE UPDATE OF status ON clients
WHEN NEW.status <> OLD.status AND EXISTS (SELECT 1 FROM service_controls p JOIN deployments d ON d.id = p.deployment_id WHERE d.client_id = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'service legacy controls retired');
END;
CREATE TRIGGER service_signed_policy_guard
BEFORE INSERT ON entitlement_versions
WHEN EXISTS (SELECT 1 FROM service_controls WHERE deployment_id = NEW.deployment_id)
  AND NOT EXISTS (
    SELECT 1 FROM service_controls p WHERE p.deployment_id = NEW.deployment_id
      AND json_extract(NEW.payload_json, '$.schemaVersion') = 3
      AND json_extract(NEW.payload_json, '$.serviceRevision') = p.revision
      AND json_extract(NEW.payload_json, '$.serviceEnabled') = p.enabled
      AND json_extract(NEW.payload_json, '$.maxActiveUsers') = p.seat_limit
  )
BEGIN
  SELECT RAISE(ABORT, 'entitlement state changed');
END;
