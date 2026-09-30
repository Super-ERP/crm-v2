ALTER TABLE "tenant_settings"
  ADD COLUMN "company_legal_name" text,
  ADD COLUMN "company_sst_registration_no" text;

INSERT INTO "quotation_templates" (
  "organization_id", "code", "label", "legacy_template_code", "render_mode"
)
SELECT o.id, 'qm', 'Quandatics Malaysia', 'qm', 'builtin'
FROM "organization" o
ON CONFLICT ("organization_id", "code") DO NOTHING;
