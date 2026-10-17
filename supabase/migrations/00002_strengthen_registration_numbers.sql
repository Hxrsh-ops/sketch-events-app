-- ==============================================================================
-- Migration: 00002_strengthen_registration_numbers.sql
-- Description: Strengthen registration-number uniqueness and collision resilience
--
-- Fixes:
-- 1. Replaces short 4-character random suffix with a high-entropy generator combining:
--    - Atomic PostgreSQL sequence (nextval) guaranteeing monotonic partition separation
--    - Random hex entropy suffix preventing sequential guessing
--    - Bounded collision verification loop (up to 5 attempts) against existing records
-- 2. Retains existing PRIMARY KEY and UNIQUE constraints on public.registrations.
-- 3. Updates public.register_for_event() to use the new generator for both primary
--    registrations and team member registrations.
-- ==============================================================================

-- 1. Create atomic sequence for registration number partitioning
CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq START WITH 10001;

-- 2. Helper function: generate collision-resilient unique registration number
CREATE OR REPLACE FUNCTION public.generate_unique_registration_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate TEXT;
    v_attempt INTEGER := 0;
BEGIN
    LOOP
        v_attempt := v_attempt + 1;

        -- Format: REG-YYYY-XXXXX-XXXXXX (e.g., REG-2026-10001-A1B2C3)
        -- The sequence guarantees partition uniqueness across concurrent requests without table locking.
        -- The random suffix prevents sequential enumeration and ticket guessing.
        v_candidate := 'REG-' || to_char(now(), 'YYYY') || '-' ||
                       lpad(nextval('public.registration_number_seq')::text, 5, '0') || '-' ||
                       upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

        -- Bounded uniqueness check against existing registrations
        IF NOT EXISTS (SELECT 1 FROM public.registrations WHERE registration_id = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        IF v_attempt >= 5 THEN
            RAISE EXCEPTION 'REGISTRATION_ID_COLLISION: Failed to generate unique registration ID after % attempts', v_attempt;
        END IF;
    END LOOP;
END;
$$;

-- Helper function is internal: Revoke public execution.
-- SECURITY DEFINER in public.register_for_event() grants sufficient authority to execute it,
-- preventing unauthenticated clients from advancing the sequence over PostgREST.
REVOKE ALL ON FUNCTION public.generate_unique_registration_id() FROM PUBLIC, anon, authenticated;

-- 3. Update public.register_for_event to invoke the hardened registration ID generator
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

    -- 5. Check duplicate email for primary attendee
    IF EXISTS (
        SELECT 1 FROM public.registrations
        WHERE event_id = p_event_id AND lower(email) = v_normalized_email AND status <> 'cancelled'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REGISTERED', 'message', 'You are already registered for this event.');
    END IF;

    -- 6. Check duplicate emails within team members or against existing registrants
    IF p_mode = 'team' AND jsonb_array_length(p_team_members) > 0 THEN
        FOR v_member_record IN SELECT * FROM jsonb_to_recordset(p_team_members) AS x(name text, email text, phone text, department text)
        LOOP
            IF lower(trim(v_member_record.email)) = v_normalized_email THEN
                RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_TEAM_EMAIL', 'message', 'Captain email cannot also be listed as a team member.');
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.registrations
                WHERE event_id = p_event_id AND lower(email) = lower(trim(v_member_record.email)) AND status <> 'cancelled'
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
            p_attendee_name,
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
        p_attendee_name,
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
        p_attendee_name,
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
                v_member_record.name,
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
                v_member_record.name,
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
        'attendee_name', p_attendee_name,
        'email', v_normalized_email
    );
END;
$$;
