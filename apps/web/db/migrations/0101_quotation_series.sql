-- Canonical references share their prefix. Nonstandard legacy references
-- start independent families rather than guessing which suffix is a revision.
ALTER TABLE quotations ADD COLUMN series_key text DEFAULT '';
--> statement-breakpoint
UPDATE quotations SET series_key = CASE
  WHEN quote_number ~ '^Q([0-9]{2}-[0-9]+|1[0-9]+)-[0-9]+$'
  THEN regexp_replace(quote_number, '-[^-]+$', '') ELSE quote_number END;
--> statement-breakpoint
ALTER TABLE quotations ALTER COLUMN series_key SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS quotations_funnel_version_uq;
--> statement-breakpoint
CREATE UNIQUE INDEX quotations_series_version_uq ON quotations (tenant_id, series_key, version);
--> statement-breakpoint
-- Support importers and older application containers during rolling upgrades.
CREATE FUNCTION set_quotation_series_key() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.series_key IS NULL OR NEW.series_key = '' THEN
    NEW.series_key := CASE WHEN NEW.quote_number ~ '^Q([0-9]{2}-[0-9]+|1[0-9]+)-[0-9]+$'
      THEN regexp_replace(NEW.quote_number, '-[^-]+$', '') ELSE NEW.quote_number END;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER quotation_series_key_before_insert BEFORE INSERT ON quotations
FOR EACH ROW EXECUTE FUNCTION set_quotation_series_key();
