INSERT INTO permissions(id,key,description)
VALUES(gen_random_uuid(),'quotation.record_acceptance','Record customer acceptance (skips approval and validity; backfill)'),
      (gen_random_uuid(),'quotation.acceptance_undo','Undo a recorded quotation acceptance')
ON CONFLICT(key) DO UPDATE SET description=excluded.description;
--> statement-breakpoint
INSERT INTO role_permissions(tenant_id,role_id,permission_id)
SELECT r.tenant_id,r.id,p.id FROM roles r JOIN permissions p ON p.key IN ('quotation.record_acceptance','quotation.acceptance_undo','quotation.view')
WHERE r.name IN ('Owner','Admin')
ON CONFLICT(role_id,permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO role_permissions(tenant_id,role_id,permission_id)
SELECT r.tenant_id,r.id,p.id FROM roles r JOIN permissions p ON p.key IN ('quotation.record_acceptance','quotation.view')
WHERE r.name = 'Sales Admin'
ON CONFLICT(role_id,permission_id) DO NOTHING;
