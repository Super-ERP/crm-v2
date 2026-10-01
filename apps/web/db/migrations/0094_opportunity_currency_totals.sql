-- Preserve each Opportunity's estimated Funnel totals in their own currency.
-- The historical scalar becomes NULL when currencies are mixed; no FX is
-- inferred or applied during the backfill.
ALTER TABLE "opportunities"
  ADD COLUMN IF NOT EXISTS "estimated_totals_by_currency" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
WITH per_currency AS (
  SELECT f."opportunity_id", f."currency",
    coalesce(sum(f."estimated_amount"), 0)::numeric(14,2) AS total
  FROM "funnels" f
  WHERE f."deleted_at" IS NULL
  GROUP BY f."opportunity_id", f."currency"
), totals AS (
  SELECT p."opportunity_id",
    jsonb_agg(jsonb_build_object('currency', p."currency", 'total', p.total::text)
      ORDER BY p."currency") AS breakdown,
    count(*) AS currency_count,
    max(p.total) AS single_total
  FROM per_currency p
  GROUP BY p."opportunity_id"
)
UPDATE "opportunities" o SET
  "estimated_totals_by_currency" = t.breakdown,
  "total_estimated_funnel_amount" = CASE WHEN t.currency_count > 1 THEN NULL ELSE t.single_total END
FROM totals t
WHERE o."id" = t."opportunity_id"
  AND (o."estimated_totals_by_currency" IS DISTINCT FROM t.breakdown
    OR o."total_estimated_funnel_amount" IS DISTINCT FROM
      CASE WHEN t.currency_count > 1 THEN NULL ELSE t.single_total END);
--> statement-breakpoint
UPDATE "opportunities" o SET
  "estimated_totals_by_currency" = '[]'::jsonb,
  "total_estimated_funnel_amount" = 0
WHERE NOT EXISTS (
  SELECT 1 FROM "funnels" f
  WHERE f."opportunity_id" = o."id" AND f."deleted_at" IS NULL
)
AND (o."estimated_totals_by_currency" <> '[]'::jsonb
  OR o."total_estimated_funnel_amount" IS DISTINCT FROM 0);
--> statement-breakpoint
-- Supports the dashboard's tenant/member/date range and due-date ordering.
CREATE INDEX IF NOT EXISTS "activities_due_member_idx"
  ON "activities" ("tenant_id", "member_id", "due_at")
  WHERE "due_at" IS NOT NULL;
