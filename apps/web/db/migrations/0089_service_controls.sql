-- Preserve the existing seat lock/count/claim machinery; only change its
-- signed access authority. v3 commercial fields are compatibility metadata.
CREATE OR REPLACE FUNCTION deployment_seat_access(p_now timestamp with time zone)
RETURNS TABLE(access_mode text, write_allowed boolean, seat_limit integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT evaluated.access_mode,
    evaluated.access_mode IN ('active', 'grace'),
    evaluated.seat_limit
  FROM (
    SELECT
      CASE
        WHEN state.current_revision = 0 THEN 'unknown'
        WHEN state.canonical_payload::jsonb ->> 'schemaVersion' = '3'
          AND (state.canonical_payload::jsonb ->> 'serviceEnabled') IS DISTINCT FROM 'true'
          THEN 'service_disabled'
        WHEN COALESCE(state.canonical_payload::jsonb ->> 'schemaVersion', '2') <> '3'
          AND (
            state.subscription_status NOT IN ('active', 'past_due')
            OR GREATEST(p_now, state.greatest_trusted_at) < state.contract_starts_at
            OR GREATEST(p_now, state.greatest_trusted_at) >= state.contract_ends_at
          ) THEN 'read_only'
        WHEN GREATEST(p_now, state.greatest_trusted_at) > state.grace_until THEN 'read_only'
        WHEN GREATEST(p_now, state.greatest_trusted_at) <= state.lease_expires_at THEN 'active'
        ELSE 'grace'
      END AS access_mode,
      COALESCE(state.seat_limit, 0) AS seat_limit
    FROM public.deployment_control_state state
    WHERE state.singleton = 1
  ) evaluated;
$$;
