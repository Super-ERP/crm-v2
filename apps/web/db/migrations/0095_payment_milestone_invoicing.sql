-- Preserve every schedule and invoice snapshot. Eligibility is evaluated at read
-- and invoicing time; premature legacy schedules are hidden until eligible.
ALTER TABLE "payment_milestones" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE "payment_milestone_status" RENAME TO "payment_milestone_status_before_invoicing";
--> statement-breakpoint
CREATE TYPE "payment_milestone_status" AS ENUM ('pending_invoicing', 'invoiced');
--> statement-breakpoint
ALTER TABLE "payment_milestones" ALTER COLUMN "status" TYPE "payment_milestone_status"
  USING (CASE WHEN "status"::text = 'invoiced' THEN 'invoiced' ELSE 'pending_invoicing' END)::"payment_milestone_status";
--> statement-breakpoint
DROP TYPE "payment_milestone_status_before_invoicing";
--> statement-breakpoint
ALTER TABLE "payment_milestones" ALTER COLUMN "status" SET DEFAULT 'pending_invoicing';
