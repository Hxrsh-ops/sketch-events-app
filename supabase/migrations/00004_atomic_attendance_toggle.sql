-- ==============================================================================
-- Migration: 00004_atomic_attendance_toggle.sql
-- Description: Add atomic, race-safe attendance check-in and revocation procedure
--
-- Fixes & Invariants:
-- 1. Eliminates race conditions by locking the target registration row FOR UPDATE.
-- 2. Strictly verifies registration_id and event_id consistency before any mutation.
-- 3. Atomically upserts public.attendance_records ledger entry without deleting history.
-- 4. Atomically synchronizes registration.attendance_status and events.checked_in_count.
-- 5. Safe under high concurrency: idempotent check-ins and reversals.
-- 6. Restricted execution: SECURITY DEFINER with explicit search_path and admin authorization.
-- ==============================================================================

-- 1. Extend attendance_records with audit and revocation tracking columns
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- 2. Create atomic attendance toggle procedure
CREATE OR REPLACE FUNCTION public.toggle_attendance(
    p_registration_identifier TEXT,
    p_event_id UUID,
    p_actor_id UUID,
    p_method check_in_method DEFAULT 'manual',
    p_target_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_registration RECORD;
    v_event RECORD;
    v_is_currently_checked BOOLEAN;
    v_next_status TEXT;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
    -- 1. Validate caller identity: actor must exist in admin_profiles
    IF p_actor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.admin_profiles WHERE id = p_actor_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'UNAUTHORIZED_ACTOR',
                'message', 'The administrative actor is not recognized.'
            );
        END IF;
    END IF;

    -- 2. Lock event row to guarantee serialization on checked_in_count
    SELECT id, title, checked_in_count
    INTO v_event
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'The specified event was not found.'
        );
    END IF;

    -- 3. Lock registration row FOR UPDATE and verify event scoping
    SELECT id, registration_id, event_id, attendee_name, email, attendance_status, checked_in_at
    INTO v_registration
    FROM public.registrations
    WHERE (registration_id = p_registration_identifier OR id::text = p_registration_identifier)
      AND event_id = p_event_id
    FOR UPDATE;

    IF v_registration.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'REGISTRATION_NOT_FOUND',
            'message', 'No registration matching the identifier was found for this event.'
        );
    END IF;

    -- 4. Calculate desired state transition
    v_is_currently_checked := (v_registration.attendance_status = 'checked_in');

    IF p_target_status IS NOT NULL THEN
        IF p_target_status NOT IN ('checked_in', 'not_checked_in') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'INVALID_TARGET_STATUS',
                'message', 'Target status must be checked_in or not_checked_in.'
            );
        END IF;
        v_next_status := p_target_status;
    ELSE
        IF v_is_currently_checked THEN
            v_next_status := 'not_checked_in';
        ELSE
            v_next_status := 'checked_in';
        END IF;
    END IF;

    -- 5. Idempotent early-return if state already matches
    IF v_is_currently_checked = (v_next_status = 'checked_in') THEN
        RETURN jsonb_build_object(
            'success', true,
            'registration_id', v_registration.registration_id,
            'attendance_status', v_next_status,
            'checked_in_at', v_registration.checked_in_at,
            'message', CASE
                WHEN v_next_status = 'checked_in' THEN 'Participant is already checked in.'
                ELSE 'Participant attendance is already marked pending.'
            END
        );
    END IF;

    -- 6. Apply state transition
    IF v_next_status = 'checked_in' THEN
        -- Insert or reactivate attendance ledger record
        INSERT INTO public.attendance_records (
            registration_id,
            event_id,
            checked_in_by,
            method,
            checked_in_at,
            status,
            revoked_at,
            revoked_by,
            updated_at
        ) VALUES (
            v_registration.id,
            v_registration.event_id,
            p_actor_id,
            p_method,
            v_now,
            'active',
            NULL,
            NULL,
            v_now
        )
        ON CONFLICT (event_id, registration_id)
        DO UPDATE SET
            status = 'active',
            checked_in_by = p_actor_id,
            method = p_method,
            checked_in_at = v_now,
            revoked_at = NULL,
            revoked_by = NULL,
            updated_at = v_now;

        -- Update registration row
        UPDATE public.registrations
        SET attendance_status = 'checked_in',
            checked_in_at = v_now,
            updated_at = v_now
        WHERE id = v_registration.id;

        -- Increment event checked-in count
        UPDATE public.events
        SET checked_in_count = checked_in_count + 1,
            updated_at = v_now
        WHERE id = v_event.id;

        -- Write audit log entry
        INSERT INTO public.audit_logs (
            actor_id,
            actor_name,
            actor_email,
            action,
            target,
            details
        )
        SELECT
            p_actor_id,
            COALESCE(u.full_name, 'Admin'),
            COALESCE(u.email, 'admin@sketch.org'),
            'ATTENDANCE_CHECK_IN',
            v_registration.registration_id,
            jsonb_build_object(
                'event_id', p_event_id,
                'method', p_method,
                'attendee_name', v_registration.attendee_name,
                'timestamp', v_now
            )
        FROM public.admin_profiles u
        WHERE u.id = p_actor_id;

        RETURN jsonb_build_object(
            'success', true,
            'registration_id', v_registration.registration_id,
            'attendance_status', 'checked_in',
            'checked_in_at', v_now,
            'message', 'Check-in verified successfully.'
        );

    ELSE
        -- Soft-revoke attendance record (preserve audit trail)
        UPDATE public.attendance_records
        SET status = 'revoked',
            revoked_at = v_now,
            revoked_by = p_actor_id,
            updated_at = v_now
        WHERE event_id = v_registration.event_id
          AND registration_id = v_registration.id;

        -- Update registration row
        UPDATE public.registrations
        SET attendance_status = 'not_checked_in',
            checked_in_at = NULL,
            updated_at = v_now
        WHERE id = v_registration.id;

        -- Decrement event checked-in count (floored at 0)
        UPDATE public.events
        SET checked_in_count = GREATEST(0, checked_in_count - 1),
            updated_at = v_now
        WHERE id = v_event.id;

        -- Write audit log entry
        INSERT INTO public.audit_logs (
            actor_id,
            actor_name,
            actor_email,
            action,
            target,
            details
        )
        SELECT
            p_actor_id,
            COALESCE(u.full_name, 'Admin'),
            COALESCE(u.email, 'admin@sketch.org'),
            'ATTENDANCE_REVOKED',
            v_registration.registration_id,
            jsonb_build_object(
                'event_id', p_event_id,
                'attendee_name', v_registration.attendee_name,
                'timestamp', v_now
            )
        FROM public.admin_profiles u
        WHERE u.id = p_actor_id;

        RETURN jsonb_build_object(
            'success', true,
            'registration_id', v_registration.registration_id,
            'attendance_status', 'not_checked_in',
            'checked_in_at', NULL,
            'message', 'Check-in revoked successfully.'
        );
    END IF;
END;
$$;

-- 3. Security: Restrict execution strictly to service_role (invoked via trusted Server Actions)
REVOKE ALL ON FUNCTION public.toggle_attendance(TEXT, UUID, UUID, check_in_method, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_attendance(TEXT, UUID, UUID, check_in_method, TEXT) TO service_role;
