ALTER TABLE "quotations" ADD COLUMN "bill_to_account_id" uuid CONSTRAINT "quotations_bill_to_account_id_accounts_id_fk" REFERENCES "accounts"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "billing_snapshot" jsonb;
--> statement-breakpoint
CREATE INDEX "quotations_bill_to_account_idx" ON "quotations" ("tenant_id", "bill_to_account_id");
