-- Account owner is the source of truth for owned records in that account.
-- Reconcile historical rows that predate the complete cascade. Null-owner
-- legacy accounts remain untouched until an owner is assigned.
UPDATE "persons" AS child
SET "owner_member_id" = account."owner_member_id", "updated_at" = now()
FROM "accounts" AS account
WHERE child."tenant_id" = account."tenant_id"
  AND child."account_id" = account."id"
  AND child."deleted_at" IS NULL
  AND account."deleted_at" IS NULL
  AND account."owner_member_id" IS NOT NULL
  AND child."owner_member_id" IS DISTINCT FROM account."owner_member_id";

UPDATE "opportunities" AS child
SET "owner_member_id" = account."owner_member_id", "updated_at" = now()
FROM "accounts" AS account
WHERE child."tenant_id" = account."tenant_id"
  AND child."account_id" = account."id"
  AND child."deleted_at" IS NULL
  AND account."deleted_at" IS NULL
  AND account."owner_member_id" IS NOT NULL
  AND child."owner_member_id" IS DISTINCT FROM account."owner_member_id";

UPDATE "funnels" AS child
SET "owner_member_id" = account."owner_member_id", "updated_at" = now()
FROM "accounts" AS account
WHERE child."tenant_id" = account."tenant_id"
  AND child."account_id" = account."id"
  AND child."deleted_at" IS NULL
  AND account."deleted_at" IS NULL
  AND account."owner_member_id" IS NOT NULL
  AND child."owner_member_id" IS DISTINCT FROM account."owner_member_id";

UPDATE "projects" AS child
SET "owner_member_id" = account."owner_member_id", "updated_at" = now()
FROM "accounts" AS account
WHERE child."tenant_id" = account."tenant_id"
  AND child."account_id" = account."id"
  AND child."deleted_at" IS NULL
  AND account."deleted_at" IS NULL
  AND account."owner_member_id" IS NOT NULL
  AND child."owner_member_id" IS DISTINCT FROM account."owner_member_id";

UPDATE "contracts" AS child
SET "owner_member_id" = account."owner_member_id", "updated_at" = now()
FROM "accounts" AS account
WHERE child."tenant_id" = account."tenant_id"
  AND child."account_id" = account."id"
  AND child."deleted_at" IS NULL
  AND account."deleted_at" IS NULL
  AND account."owner_member_id" IS NOT NULL
  AND child."owner_member_id" IS DISTINCT FROM account."owner_member_id";
