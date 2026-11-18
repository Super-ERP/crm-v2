-- Shared reference data: public geography, no customer/tenant records.
CREATE TABLE location_catalogue (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('country','state','city')),
  country_code text NOT NULL,
  state_code text NOT NULL DEFAULT '',
  name text NOT NULL,
  ascii_name text NOT NULL DEFAULT '',
  aliases text NOT NULL DEFAULT '',
  population bigint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'GeoNames',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_catalogue_scope ON location_catalogue(kind,country_code,state_code);
CREATE TABLE location_catalogue_imports (
  source text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT now(),
  manifest jsonb NOT NULL
);
CREATE TABLE location_localities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES organization(id),
  country_code text NOT NULL,
  state_code text NOT NULL DEFAULT '',
  name text NOT NULL,
  verified_source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX location_localities_name_unique ON location_localities(tenant_id,country_code,state_code,lower(btrim(name)));
ALTER TABLE location_localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_localities FORCE ROW LEVEL SECURITY;
CREATE POLICY location_localities_tenant ON location_localities USING (tenant_id=current_setting('app.current_tenant',true)) WITH CHECK (tenant_id=current_setting('app.current_tenant',true));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='crm_app') THEN
    GRANT SELECT ON location_catalogue,location_catalogue_imports TO crm_app;
    GRANT SELECT,INSERT ON location_localities TO crm_app;
  END IF;
END $$;
