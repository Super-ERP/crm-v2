ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "is_break_glass" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "two_factor" (
  "id" text PRIMARY KEY,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "verified" boolean NOT NULL DEFAULT true,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "last_request" bigint NOT NULL
);

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
UPDATE "api_keys"
SET "expires_at" = now() + interval '30 days'
WHERE "expires_at" IS NULL;
ALTER TABLE "api_keys" ALTER COLUMN "expires_at" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "api_keys_expires_at_idx" ON "api_keys" ("expires_at");

CREATE OR REPLACE FUNCTION verify_api_key(p_hash text)
RETURNS TABLE(organization_id text, member_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.api_keys
     SET last_used_at = pg_catalog.now()
   WHERE key_hash = p_hash
     AND revoked_at IS NULL
     AND expires_at > pg_catalog.now()
  RETURNING organization_id, member_id;
$$;
REVOKE ALL ON FUNCTION verify_api_key(text) FROM PUBLIC;

ALTER TABLE "audit_log"
  ADD COLUMN IF NOT EXISTS "outcome" text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'application',
  ADD COLUMN IF NOT EXISTS "metadata" jsonb,
  ADD COLUMN IF NOT EXISTS "request_id_hash" text;
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_outcome_check";
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_outcome_check"
  CHECK ("outcome" IN ('success', 'denied', 'error'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm_app') THEN
    GRANT SELECT, INSERT, UPDATE ON "two_factor", "rate_limit" TO crm_app;
    GRANT EXECUTE ON FUNCTION verify_api_key(text) TO crm_app;
  END IF;
END
$$;
