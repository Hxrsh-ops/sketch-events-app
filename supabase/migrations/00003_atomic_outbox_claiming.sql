-- ==============================================================================
-- Migration: 00003_atomic_outbox_claiming.sql
-- Description: Add atomic outbox batch claiming procedure with FOR UPDATE SKIP LOCKED
--
-- Fixes:
-- 1. Eliminates read-then-update race conditions where concurrent workers could claim
--    or duplicate processing of the same communication job.
-- 2. Uses PostgreSQL CTE with FOR UPDATE SKIP LOCKED to guarantee safe, atomic claiming.
-- 3. Security: Restricted to service-role / administrative execution context.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.claim_outbox_batch(
    p_batch_size INTEGER DEFAULT 10,
    p_max_attempts INTEGER DEFAULT 5
)
RETURNS SETOF public.communications_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH eligible AS (
        SELECT id
        FROM public.communications_outbox
        WHERE status IN ('queued', 'failed')
          AND attempts < p_max_attempts
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    )
    UPDATE public.communications_outbox o
    SET status = 'processing',
        scheduled_at = now()
    FROM eligible
    WHERE o.id = eligible.id
    RETURNING o.*;
END;
$$;

-- Restrict execution: Revoke public execution to prevent sequence/job hijacking
REVOKE ALL ON FUNCTION public.claim_outbox_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
