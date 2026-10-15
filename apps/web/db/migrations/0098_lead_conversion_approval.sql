CREATE TABLE lead_conversion_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  requester_member_id text NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  approver_member_id text REFERENCES member(id) ON DELETE SET NULL,
  input_snapshot jsonb NOT NULL,
  lead_snapshot jsonb NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  decision_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by_member_id text REFERENCES member(id) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX lead_conversion_one_pending ON lead_conversion_approval_requests(tenant_id, lead_id) WHERE status = 'pending';
--> statement-breakpoint
ALTER TABLE lead_conversion_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_conversion_approval_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lead_conversion_approval_requests USING (tenant_id = current_setting('app.current_tenant', true)) WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
--> statement-breakpoint
INSERT INTO permissions (id, key, description) VALUES (gen_random_uuid(), 'lead.convert.approve', 'Approve or reject lead conversion requests') ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO role_permissions (tenant_id, role_id, permission_id)
SELECT r.tenant_id, r.id, p.id FROM roles r JOIN permissions p ON p.key = 'lead.convert.approve'
WHERE r.name IN ('Owner', 'Admin', 'Developer', 'Manager') ON CONFLICT (role_id, permission_id) DO NOTHING;
