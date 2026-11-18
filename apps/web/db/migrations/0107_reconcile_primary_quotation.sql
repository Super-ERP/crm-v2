-- Acceptance previously updated the unique Primary flag without its Funnel
-- pointer. Reconcile to the visible, uniquely flagged primary quotation.
-- Do not alter estimate, stage, billing rows or historical documents.
UPDATE funnels f
SET primary_quotation_id = q.id,
    amount = CASE WHEN q.status NOT IN ('rejected', 'expired', 'void')
      THEN q.subtotal - q.discount_total ELSE NULL END,
    updated_at = now()
FROM quotations q
WHERE q.tenant_id = f.tenant_id AND q.funnel_id = f.id
  AND q.is_primary = true AND q.deleted_at IS NULL AND f.deleted_at IS NULL
  AND f.primary_quotation_id IS DISTINCT FROM q.id;
