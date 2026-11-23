INSERT INTO permissions(id,key,description)
VALUES(gen_random_uuid(),'project_code.enter','Enter Funnel Project Codes manually (Sales Admin)')
ON CONFLICT(key) DO UPDATE SET description=excluded.description;
--> statement-breakpoint
INSERT INTO role_permissions(tenant_id,role_id,permission_id)
SELECT r.tenant_id,r.id,p.id FROM roles r JOIN permissions p ON p.key='project_code.enter'
WHERE r.name IN ('Owner','Admin','Sales Admin')
ON CONFLICT(role_id,permission_id) DO NOTHING;
