-- Replace the enum atomically: Drizzle runs migrations in a transaction,
-- so a newly added enum value cannot be used by ALTER TYPE ADD VALUE here.
ALTER TABLE "payment_milestones" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE "payment_milestone_status" RENAME TO "payment_milestone_status_before_planning";
--> statement-breakpoint
CREATE TYPE "payment_milestone_status" AS ENUM ('planned', 'won', 'invoiced');
--> statement-breakpoint
ALTER TABLE "payment_milestones" ALTER COLUMN "status" TYPE "payment_milestone_status"
  USING "status"::text::"payment_milestone_status";
--> statement-breakpoint
DROP TYPE "payment_milestone_status_before_planning";
--> statement-breakpoint
ALTER TABLE "payment_milestones" ALTER COLUMN "status" SET DEFAULT 'planned';
--> statement-breakpoint
-- Correct the old default without rewriting confirmed or invoiced history.
-- Project-owned plans use their project's funnel without changing ownership.
UPDATE "payment_milestones" m SET "status" = 'planned', "updated_at" = now()
FROM "funnels" f WHERE m."tenant_id" = f."tenant_id" AND f."status" <> 'won'
  AND m."status" = 'won'
  AND (
    m."funnel_id" = f."id"
    OR (m."funnel_id" IS NULL AND EXISTS (
      SELECT 1 FROM "projects" p WHERE p."id" = m."project_id"
        AND p."tenant_id" = m."tenant_id" AND p."funnel_id" = f."id"
    ))
  );
