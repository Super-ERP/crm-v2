ALTER TABLE saved_views ADD COLUMN table_state jsonb;
--> statement-breakpoint
CREATE TABLE table_preferences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
 member_id text NOT NULL REFERENCES member(id) ON DELETE CASCADE,
 list_key text NOT NULL,
 layout jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT table_preferences_owner_list_uq UNIQUE (organization_id, member_id, list_key)
);
--> statement-breakpoint
ALTER TABLE table_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON table_preferences
 USING (organization_id = current_setting('app.current_tenant', true))
 WITH CHECK (organization_id = current_setting('app.current_tenant', true));
