-- ==============================================================================
-- Migration: 00010_communications_outbox_management.sql
-- Description: Communications & Outbox lifecycle management:
--   1. Add 'cancelled' status to communication_status enum.
--   2. Add archival and cancellation audit columns (archived_at, archived_by, cancelled_at, cancelled_by).
--   3. Harden claim_outbox_batch() to exclude archived records.
--   4. Revoke direct write privileges on communications_outbox and enforce DB-level deletion protection.
--   5. Add atomic delete_outbox_jobs_with_audit() transactional RPC for deletion + audit logging.
-- ==============================================================================

-- 1. Extend communication_status enum with 'cancelled'
ALTER TYPE public.communication_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Add archival and cancellation metadata columns (preserving existing history)
ALTER TABLE public.communications_outbox
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_communications_archived_at
    ON public.communications_outbox(archived_at)
    WHERE archived_at IS NOT NULL;

-- 3. Update claim_outbox_batch() to exclude archived records while preserving FOR UPDATE SKIP LOCKED
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
          AND archived_at IS NULL
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

REVOKE ALL ON FUNCTION public.claim_outbox_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_batch(INTEGER, INTEGER) TO service_role;

-- 4. Database security hardening: revoke direct write privileges from client roles and remove broad write policies
-- All outbox mutations execute exclusively via authenticated Next.js Server Actions using service_role.
REVOKE INSERT, UPDATE, DELETE ON public.communications_outbox FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Admins can update communications" ON public.communications_outbox;
DROP POLICY IF EXISTS "Admins can delete eligible communications" ON public.communications_outbox;

-- Defense-in-depth trigger: permanently block deletion of sent, processing, cancelled, or other non-deletable rows
CREATE OR REPLACE FUNCTION public.prevent_protected_outbox_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.status NOT IN ('queued', 'failed') THEN
        RAISE EXCEPTION 'Cannot permanently delete outbox record % with protected status "%"', OLD.id, OLD.status
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_protected_outbox_delete ON public.communications_outbox;
CREATE TRIGGER trg_prevent_protected_outbox_delete
    BEFORE DELETE ON public.communications_outbox
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_protected_outbox_delete();

-- 5. Atomic permanent deletion + full forensic audit logging in a single database transaction
CREATE OR REPLACE FUNCTION public.delete_outbox_jobs_with_audit(
    p_job_ids UUID[],
    p_actor_id UUID DEFAULT NULL,
    p_actor_name TEXT DEFAULT 'Administrator',
    p_actor_email TEXT DEFAULT 'admin@sketch.org'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_deleted_records JSONB := '[]'::jsonb;
    v_processed_ids UUID[] := ARRAY[]::UUID[];
    v_deleted_count INTEGER := 0;
BEGIN
    IF p_job_ids IS NULL OR cardinality(p_job_ids) = 0 THEN
        RETURN jsonb_build_object(
            'processed_ids', '[]'::jsonb,
            'deleted_records', '[]'::jsonb,
            'deleted_count', 0
        );
    END IF;

    WITH deleted AS (
        DELETE FROM public.communications_outbox
        WHERE id = ANY(p_job_ids)
          AND status IN ('queued', 'failed')
        RETURNING
            id,
            event_id,
            recipient_email,
            recipient_name,
            subject,
            template_type,
            status,
            attempts,
            last_error
    )
    SELECT
        COALESCE(array_agg(d.id), ARRAY[]::UUID[]),
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', d.id,
                    'eventId', d.event_id,
                    'recipientEmail', d.recipient_email,
                    'recipientName', d.recipient_name,
                    'subject', d.subject,
                    'templateType', d.template_type,
                    'status', d.status,
                    'attempts', d.attempts,
                    'lastError', d.last_error
                )
            ),
            '[]'::jsonb
        )
    INTO v_processed_ids, v_deleted_records
    FROM deleted d;

    v_deleted_count := COALESCE(cardinality(v_processed_ids), 0);

    IF v_deleted_count > 0 THEN
        -- Runs inside the same transaction: if audit insertion fails, the DELETE rolls back
        INSERT INTO public.audit_logs (
            actor_id,
            actor_name,
            actor_email,
            action,
            target,
            details
        )
        VALUES (
            p_actor_id,
            COALESCE(NULLIF(trim(p_actor_name), ''), 'Administrator'),
            COALESCE(NULLIF(trim(p_actor_email), ''), 'admin@sketch.org'),
            'Deleted Outbox Dispatch',
            CASE
                WHEN v_deleted_count = 1 THEN v_processed_ids[1]::TEXT
                ELSE v_deleted_count::TEXT || ' dispatches'
            END,
            jsonb_build_object(
                'processedIds', to_jsonb(v_processed_ids),
                'deletedRecords', v_deleted_records,
                'deletedCount', v_deleted_count,
                'timestamp', v_now
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'processed_ids', to_jsonb(v_processed_ids),
        'deleted_records', v_deleted_records,
        'deleted_count', v_deleted_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_outbox_jobs_with_audit(UUID[], UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_outbox_jobs_with_audit(UUID[], UUID, TEXT, TEXT) TO service_role;
