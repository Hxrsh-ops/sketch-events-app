-- ==============================================================================
-- Migration: 00006_production_security_hardening.sql
-- Description: Production security remediation:
--   1. Certificate privacy: Revoke direct public SELECT, add scoped verify_certificate() RPC
--   2. Registration uniqueness: Replace case-sensitive constraint with partial unique index
--   3. Team member uniqueness: Disallow duplicate emails within team submissions
--   4. Attendance authorization: Enforce mandatory actor_id and verify admin permissions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CERTIFICATE PRIVACY REMEDIATION
-- ------------------------------------------------------------------------------

-- Drop permissive public select policy from migration 00001
DROP POLICY IF EXISTS "Public can verify issued certificates" ON public.certificates;

-- Revoke direct table SELECT on public.certificates from unprivileged roles
REVOKE ALL ON public.certificates FROM PUBLIC, anon;

-- Ensure authenticated administrators can view certificates under RLS
DROP POLICY IF EXISTS "Admins can view certificates" ON public.certificates;
CREATE POLICY "Admins can view certificates" ON public.certificates
    FOR SELECT USING (public.is_admin());

-- Create narrowly scoped, read-only public verification function
-- Returns ONLY approved verification metadata: validity, cert number, event title, recipient name, date.
-- NEVER exposes recipient_email, user IDs, or internal record keys.
CREATE OR REPLACE FUNCTION public.verify_certificate(p_certificate_number TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    certificate_number TEXT,
    event_title TEXT,
    recipient_name TEXT,
    issued_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (c.status = 'issued') AS is_valid,
        c.certificate_number,
        e.title AS event_title,
        c.recipient_name,
        c.issued_at,
        c.status
    FROM public.certificates c
    JOIN public.events e ON e.id = c.event_id
    WHERE c.certificate_number = trim(p_certificate_number)
      AND c.status = 'issued'
    LIMIT 1;
END;
$$;

-- Grant public verification execution while keeping direct table access locked
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. REGISTRATION UNIQUENESS & CANCELLATION COMPLIANCE
-- ------------------------------------------------------------------------------

-- Drop case-sensitive unconditional constraint that prevented re-registration after cancellation
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS uq_active_event_attendee_email;

-- Create partial unique index:
-- - Normalizes email via lower(trim(email)) to prevent case/spacing duplicate exploits
-- - Applies strictly to active registrations (WHERE status <> 'cancelled')
-- - Fully permits re-registration after cancellation
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_event_attendee_email
ON public.registrations (event_id, lower(trim(email)))
WHERE status <> 'cancelled';

-- ------------------------------------------------------------------------------
-- 3. HARDEN REGISTRATION RPC (TEAM DUPLICATES & NORMALIZATION)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_for_event(
    p_event_id UUID,
    p_mode registration_mode,
    p_attendee_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_year TEXT DEFAULT NULL,
    p_team_name TEXT DEFAULT NULL,
    p_team_members JSONB DEFAULT '[]'::jsonb,
    p_custom_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event public.events%ROWTYPE;
    v_team_id UUID := NULL;
    v_reg_count_to_add INTEGER := 1;
    v_new_reg_id TEXT;
    v_qr_credential TEXT;
    v_member_record RECORD;
    v_member_reg_id TEXT;
    v_member_qr TEXT;
    v_registration UUID;
    v_normalized_email TEXT;
BEGIN
    v_normalized_email := lower(trim(p_email));

    -- 1. Lock the event row to prevent capacity race conditions
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND', 'message', 'Event does not exist.');
    END IF;

    -- 2. Validate event status & registration eligibility (lifecycle and deadlines)
    IF v_event.lifecycle NOT IN ('published', 'live') THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_ACTIVE', 'message', 'This event is not accepting registrations.');
    END IF;

    IF v_event.registration_state <> 'open' THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_CLOSED', 'message', 'Registration for this event is closed or full.');
    END IF;

    -- Enforce event end date deadline
    IF now() >= v_event.end_date THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_ENDED', 'message', 'Registration has concluded for this event.');
    END IF;

    -- 3. Calculate attendee count to add and validate team size constraints
    IF p_mode = 'team' THEN
        v_reg_count_to_add := 1 + jsonb_array_length(p_team_members);

        IF v_event.has_teams IS NOT TRUE THEN
            RETURN jsonb_build_object('success', false, 'error', 'TEAMS_NOT_ALLOWED', 'message', 'This event does not permit team registrations.');
        END IF;

        IF v_event.min_team_size IS NOT NULL AND v_reg_count_to_add < v_event.min_team_size THEN
            RETURN jsonb_build_object('success', false, 'error', 'TEAM_TOO_SMALL', 'message', 'Team size is below the minimum required (' || v_event.min_team_size || ').');
        END IF;

        IF v_event.max_team_size IS NOT NULL AND v_reg_count_to_add > v_event.max_team_size THEN
            RETURN jsonb_build_object('success', false, 'error', 'TEAM_TOO_LARGE', 'message', 'Team size exceeds the maximum allowed (' || v_event.max_team_size || ').');
        END IF;
    END IF;

    -- 4. Check capacity
    IF (v_event.registered_count + v_reg_count_to_add) > v_event.capacity THEN
        UPDATE public.events SET registration_state = 'full' WHERE id = p_event_id;
        RETURN jsonb_build_object('success', false, 'error', 'CAPACITY_EXCEEDED', 'message', 'Not enough capacity remaining for this registration.');
    END IF;

    -- 5. Check duplicate email for primary attendee against active registrations
    IF EXISTS (
        SELECT 1 FROM public.registrations
        WHERE event_id = p_event_id AND lower(trim(email)) = v_normalized_email AND status <> 'cancelled'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REGISTERED', 'message', 'You are already registered for this event.');
    END IF;

    -- 6. Validate team member emails
    IF p_mode = 'team' AND jsonb_array_length(p_team_members) > 0 THEN
        -- Check for duplicate emails within the incoming team members list
        IF jsonb_array_length(p_team_members) > 1 THEN
            IF EXISTS (
                SELECT lower(trim(email)), count(*)
                FROM jsonb_to_recordset(p_team_members) AS x(name text, email text, phone text, department text)
                GROUP BY lower(trim(email))
                HAVING count(*) > 1
            ) THEN
                RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_TEAM_MEMBER_EMAIL', 'message', 'Duplicate email addresses found within the team member list.');
            END IF;
        END IF;

        -- Check each team member against captain and active registrations
        FOR v_member_record IN SELECT * FROM jsonb_to_recordset(p_team_members) AS x(name text, email text, phone text, department text)
        LOOP
            IF lower(trim(v_member_record.email)) = v_normalized_email THEN
                RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_TEAM_EMAIL', 'message', 'Captain email cannot also be listed as a team member.');
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.registrations
                WHERE event_id = p_event_id AND lower(trim(email)) = lower(trim(v_member_record.email)) AND status <> 'cancelled'
            ) THEN
                RETURN jsonb_build_object('success', false, 'error', 'MEMBER_ALREADY_REGISTERED', 'message', 'Team member ' || v_member_record.name || ' (' || v_member_record.email || ') is already registered for this event.');
            END IF;
        END LOOP;
    END IF;

    -- 7. If team registration, create team entity
    IF p_mode = 'team' THEN
        IF p_team_name IS NULL OR trim(p_team_name) = '' THEN
            RETURN jsonb_build_object('success', false, 'error', 'TEAM_NAME_REQUIRED', 'message', 'Team name is required.');
        END IF;

        INSERT INTO public.teams (
            event_id,
            name,
            captain_name,
            captain_email,
            member_count,
            max_members,
            status,
            custom_answers
        ) VALUES (
            p_event_id,
            trim(p_team_name),
            trim(p_attendee_name),
            v_normalized_email,
            v_reg_count_to_add,
            COALESCE(v_event.max_team_size, v_reg_count_to_add),
            'complete',
            p_custom_answers
        ) RETURNING id INTO v_team_id;
    END IF;

    -- 8. Generate collision-resilient unique registration ID and QR token
    v_new_reg_id := public.generate_unique_registration_id();
    v_qr_credential := 'SKETCH-TKT-' || upper(substr(md5(random()::text), 1, 12));

    -- 9. Insert primary registration
    INSERT INTO public.registrations (
        registration_id,
        event_id,
        team_id,
        mode,
        attendee_name,
        email,
        phone,
        department,
        year,
        status,
        attendance_status,
        qr_credential_id,
        custom_answers
    ) VALUES (
        v_new_reg_id,
        p_event_id,
        v_team_id,
        p_mode,
        trim(p_attendee_name),
        v_normalized_email,
        p_phone,
        p_department,
        p_year,
        'registered',
        'not_checked_in',
        v_qr_credential,
        p_custom_answers
    ) RETURNING id INTO v_registration;

    -- 10. Enqueue outbox ticket email for primary attendee
    INSERT INTO public.communications_outbox (
        event_id,
        recipient_email,
        recipient_name,
        subject,
        template_type,
        payload,
        status
    ) VALUES (
        p_event_id,
        v_normalized_email,
        trim(p_attendee_name),
        'Your Pass for ' || v_event.title,
        'ticket_pass',
        jsonb_build_object(
            'registration_id', v_new_reg_id,
            'qr_credential_id', v_qr_credential,
            'event_title', v_event.title,
            'venue', v_event.venue,
            'start_date', v_event.start_date
        ),
        'queued'
    );

    -- 11. Process additional team members if present
    IF p_mode = 'team' AND jsonb_array_length(p_team_members) > 0 THEN
        FOR v_member_record IN SELECT * FROM jsonb_to_recordset(p_team_members) AS x(name text, email text, phone text, department text)
        LOOP
            v_member_reg_id := public.generate_unique_registration_id();
            v_member_qr := 'SKETCH-TKT-' || upper(substr(md5(random()::text), 1, 12));

            INSERT INTO public.registrations (
                registration_id,
                event_id,
                team_id,
                mode,
                attendee_name,
                email,
                phone,
                department,
                status,
                attendance_status,
                qr_credential_id
            ) VALUES (
                v_member_reg_id,
                p_event_id,
                v_team_id,
                'team',
                trim(v_member_record.name),
                lower(trim(v_member_record.email)),
                v_member_record.phone,
                v_member_record.department,
                'registered',
                'not_checked_in',
                v_member_qr
            );

            INSERT INTO public.communications_outbox (
                event_id,
                recipient_email,
                recipient_name,
                subject,
                template_type,
                payload,
                status
            ) VALUES (
                p_event_id,
                lower(trim(v_member_record.email)),
                trim(v_member_record.name),
                'Your Team Pass for ' || v_event.title,
                'ticket_pass',
                jsonb_build_object(
                    'registration_id', v_member_reg_id,
                    'qr_credential_id', v_member_qr,
                    'team_name', p_team_name,
                    'event_title', v_event.title,
                    'venue', v_event.venue,
                    'start_date', v_event.start_date
                ),
                'queued'
            );
        END LOOP;
    END IF;

    -- 12. Increment event registered count and update state if full
    UPDATE public.events
    SET registered_count = registered_count + v_reg_count_to_add,
        registration_state = CASE
            WHEN (registered_count + v_reg_count_to_add) >= capacity THEN 'full'::registration_state
            ELSE registration_state
        END,
        updated_at = timezone('utc', now())
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_new_reg_id,
        'qr_credential_id', v_qr_credential,
        'event_id', p_event_id,
        'attendee_name', trim(p_attendee_name),
        'email', v_normalized_email
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. HARDEN ATTENDANCE RPC (MANDATORY ACTOR ID & ROLE VALIDATION)
-- ------------------------------------------------------------------------------

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
    -- 1. Validate caller identity: p_actor_id is strictly required
    IF p_actor_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTOR_REQUIRED',
            'message', 'An authenticated administrator actor ID is required to record attendance.'
        );
    END IF;

    -- Verify actor exists in admin_profiles AND holds an attendance-authorized role
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = p_actor_id
          AND role IN ('master_admin', 'event_manager', 'attendance_staff')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED_ACTOR',
            'message', 'The administrative actor does not hold permission to record attendance.'
        );
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

-- Restrict execution strictly to service_role (invoked only via authenticated Server Actions)
REVOKE ALL ON FUNCTION public.toggle_attendance(TEXT, UUID, UUID, check_in_method, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_attendance(TEXT, UUID, UUID, check_in_method, TEXT) TO service_role;
