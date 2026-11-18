-- Account code allocation belongs to the Sales Admin review pool.
INSERT INTO permissions (id, key, description)
VALUES (gen_random_uuid(), 'account.code.manage', 'Assign and edit account codes (Sales Admin)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO role_permissions (tenant_id, role_id, permission_id)
SELECT r.tenant_id, r.id, p.id FROM roles r
JOIN permissions p ON p.key IN ('account.code.manage', 'lead.convert.approve')
WHERE r.name IN ('Owner', 'Admin', 'Sales Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
-- Sales Admin reviews span sales owners; grant the explicit review scope and
-- record reads without tenant settings or other administration capabilities.
INSERT INTO role_permissions (tenant_id, role_id, permission_id)
SELECT r.tenant_id, r.id, p.id FROM roles r
JOIN permissions p ON p.key IN ('lead.view', 'lead.create', 'lead.update', 'lead.convert', 'account.view', 'account.create', 'account.update', 'person.view', 'person.create', 'person.update', 'opportunity.view', 'records.view_all')
WHERE r.name = 'Sales Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
-- Fail on conflicting legacy codes so an operator can resolve them explicitly;
-- never rewrite historical customer identifiers automatically.
CREATE UNIQUE INDEX accounts_active_code_unique
ON accounts (tenant_id, upper(btrim(code)))
WHERE deleted_at IS NULL AND nullif(btrim(code), '') IS NOT NULL;
