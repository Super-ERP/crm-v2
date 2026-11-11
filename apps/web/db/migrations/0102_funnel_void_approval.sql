CREATE TABLE funnel_void_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 funnel_id uuid NOT NULL REFERENCES funnels(id),
 retained_funnel_id uuid NOT NULL REFERENCES funnels(id),
 requester_member_id text NOT NULL REFERENCES member(id),
 owner_member_id text NOT NULL,
 reason text NOT NULL,
 status approval_status NOT NULL DEFAULT 'pending',
 decision_note text,
 decided_by_member_id text REFERENCES member(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 CONSTRAINT funnel_void_distinct CHECK (funnel_id <> retained_funnel_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX funnel_void_one_pending ON funnel_void_requests(tenant_id, funnel_id) WHERE status = 'pending';
--> statement-breakpoint
ALTER TABLE funnel_void_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_void_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON funnel_void_requests USING (tenant_id = current_setting('app.current_tenant', true)) WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
--> statement-breakpoint
INSERT INTO permissions(id,key,description) VALUES(gen_random_uuid(),'funnel.void.approve','Approve or reject funnel void requests (Sales Admin)') ON CONFLICT(key) DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions(tenant_id,role_id,permission_id)
 SELECT r.tenant_id,r.id,p.id FROM roles r JOIN permissions p ON p.key='funnel.void.approve'
 WHERE lower(r.name) IN ('owner','admin','sales admin','sales administrator') ON CONFLICT(role_id,permission_id) DO NOTHING;
