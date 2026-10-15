-- Source Salesforce deal identifiers are independent of the internal container code.
ALTER TABLE funnels ADD COLUMN project_code text;
--> statement-breakpoint
ALTER TABLE funnels ADD COLUMN cross_deal_project_code text;
