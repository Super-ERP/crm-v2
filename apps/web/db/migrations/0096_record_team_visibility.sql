-- Team access is an explicit capability, independent of approval permissions.
INSERT INTO "permissions" ("id", "key", "description")
VALUES (gen_random_uuid(), 'records.view_team', 'View own records and records owned by the reporting team')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
SELECT r."tenant_id", r."id", p."id"
FROM "roles" r JOIN "permissions" p ON p."key" = 'records.view_team'
WHERE r."name" IN ('Owner', 'Admin', 'Developer', 'Manager')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
