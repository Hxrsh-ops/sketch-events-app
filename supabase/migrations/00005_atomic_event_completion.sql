-- ==============================================================================
-- Migration: 00005_atomic_event_completion.sql
-- Description: Enforce atomic completion of in-progress rounds upon event completion
--
-- Security & Invariants:
-- 1. Atomically transitions all active/in-progress rounds to 'completed' within
--    the same transaction when an event's lifecycle transitions to 'completed'.
-- 2. Eliminates cross-table race conditions where an event is marked completed
--    while rounds remain in 'in_progress'.
-- 3. Runs as SECURITY DEFINER with locked search_path = public.
-- 4. Automatically executes on any lifecycle transition to 'completed' without
--    requiring multi-roundtrip network calls.
-- ==============================================================================

-- 1. Create trigger function to cascade event completion to in-progress rounds
CREATE OR REPLACE FUNCTION public.sync_completed_event_rounds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.lifecycle = 'completed' AND (OLD.lifecycle IS DISTINCT FROM 'completed') THEN
        UPDATE public.rounds
        SET status = 'completed',
            updated_at = timezone('utc', now())
        WHERE event_id = NEW.id
          AND status = 'in_progress';
    END IF;
    RETURN NEW;
END;
$$;

-- Revoke public execution and grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.sync_completed_event_rounds() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_completed_event_rounds() TO authenticated, service_role;

-- 2. Attach trigger to public.events
DROP TRIGGER IF EXISTS trg_sync_completed_event_rounds ON public.events;
CREATE TRIGGER trg_sync_completed_event_rounds
    AFTER UPDATE OF lifecycle ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_completed_event_rounds();

COMMENT ON FUNCTION public.sync_completed_event_rounds() IS
    'Atomically sets all in-progress rounds for an event to completed when the event lifecycle becomes completed.';
