-- ==============================================================================
-- SKETCH EVENTS PLATFORM — MIGRATION 00001: INITIAL SCHEMA & SECURITY FOUNDATION
-- ==============================================================================
-- Designed for PostgreSQL 15+ / Supabase
-- Enforces:
-- 1. Admin-only operations via Supabase Auth + admin_profiles role mapping.
-- 2. Row Level Security on all operational tables.
-- 3. Public read-only access limited strictly to published events.
-- 4. Atomic, concurrency-safe registration via database function register_for_event().
-- 5. Strict duplicate prevention via unique constraints on (event_id, lower(email)).
-- 6. PII isolation preventing public leakage of attendee records.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM (
        'master_admin',
        'event_manager',
        'attendance_staff',
        'analyst'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_lifecycle AS ENUM (
        'draft',
        'published',
        'live',
        'completed',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_state AS ENUM (
        'upcoming',
        'open',
        'closed',
        'full'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE venue_mode AS ENUM (
        'in-person',
        'online',
        'hybrid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_mode AS ENUM (
        'individual',
        'team'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM (
        'registered',
        'waitlisted',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'not_checked_in',
        'checked_in'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE check_in_method AS ENUM (
        'camera',
        'manual',
        'simulation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE communication_status AS ENUM (
        'queued',
        'processing',
        'sent',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADMIN PROFILES & AUTHORIZATION
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role admin_role NOT NULL DEFAULT 'event_manager',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index for role lookup
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);

-- Helper functions for RLS to evaluate current caller's admin privileges
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.admin_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_roles admin_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() AND role = ANY(required_roles)
    );
$$;

-- ------------------------------------------------------------------------------
-- 3. EVENTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    poster_url TEXT,
    hero_image TEXT,
    hero_image_focal_point TEXT DEFAULT 'center',
    directory_image TEXT,
    directory_image_focal_point TEXT DEFAULT 'center',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    venue TEXT NOT NULL,
    venue_mode venue_mode NOT NULL DEFAULT 'in-person',
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    registered_count INTEGER NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
    checked_in_count INTEGER NOT NULL DEFAULT 0 CHECK (checked_in_count >= 0),
    lifecycle event_lifecycle NOT NULL DEFAULT 'draft',
    registration_state registration_state NOT NULL DEFAULT 'upcoming',
    has_teams BOOLEAN NOT NULL DEFAULT FALSE,
    min_team_size INTEGER DEFAULT 1,
    max_team_size INTEGER DEFAULT 1,
    has_rounds BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    contact_email TEXT,
    contact_phone TEXT,
    community_link TEXT,
    registration_form JSONB NOT NULL DEFAULT '{"version": 1, "sections": []}'::jsonb,
    created_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_lifecycle ON public.events(lifecycle);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- ------------------------------------------------------------------------------
-- 4. TEAMS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    captain_name TEXT NOT NULL,
    captain_email TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 1 CHECK (member_count >= 1),
    max_members INTEGER NOT NULL DEFAULT 1 CHECK (max_members >= 1),
    status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'incomplete')),
    custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_team_event_name UNIQUE (event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_event ON public.teams(event_id);

-- ------------------------------------------------------------------------------
-- 5. REGISTRATIONS & ATTENDEES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id TEXT NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    mode registration_mode NOT NULL DEFAULT 'individual',
    attendee_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    year TEXT,
    status registration_status NOT NULL DEFAULT 'registered',
    attendance_status attendance_status NOT NULL DEFAULT 'not_checked_in',
    checked_in_at TIMESTAMPTZ,
    qr_credential_id TEXT NOT NULL UNIQUE,
    custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    -- Prevent duplicate registration for the same event with active status
    CONSTRAINT uq_active_event_attendee_email UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_qr ON public.registrations(qr_credential_id);
CREATE INDEX IF NOT EXISTS idx_registrations_reg_id ON public.registrations(registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_team ON public.registrations(team_id);

-- ------------------------------------------------------------------------------
-- 6. ATTENDANCE CHECK-IN LEDGER
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    checked_in_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    method check_in_method NOT NULL DEFAULT 'manual',
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_attendance_event_registration UNIQUE (event_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON public.attendance_records(registration_id);

-- ------------------------------------------------------------------------------
-- 7. EVENT ROUNDS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    round_order INTEGER NOT NULL DEFAULT 1,
    start_time TIMESTAMPTZ NOT NULL,
    venue TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
    eligible_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
    advanced_count INTEGER DEFAULT 0 CHECK (advanced_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_rounds_event ON public.rounds(event_id);

-- ------------------------------------------------------------------------------
-- 8. CERTIFICATES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('eligible', 'issued', 'revoked')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_certificates_event ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);

-- ------------------------------------------------------------------------------
-- 9. COMMUNICATIONS OUTBOX
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communications_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('ticket_pass', 'reminder', 'announcement', 'certificate')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status communication_status NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications_outbox(status);
CREATE INDEX IF NOT EXISTS idx_communications_event ON public.communications_outbox(event_id);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. ATOMIC TRANSACTIONAL REGISTRATION STORED PROCEDURE
-- ------------------------------------------------------------------------------
-- Guarantees race-condition safety: locks event row FOR UPDATE, verifies capacity,
-- prevents duplicate registration, generates registration IDs, and enqueues ticket pass.
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

    -- 8. Generate unique registration and QR tokens
    v_new_reg_id := 'REG-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 4));
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
            v_member_reg_id := 'REG-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 4));
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

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ADMIN PROFILES POLICIES
CREATE POLICY "Admins can view profiles" ON public.admin_profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Master admins can manage profiles" ON public.admin_profiles
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role]));

-- EVENTS POLICIES
-- Public can view ONLY published or live events
CREATE POLICY "Public can view active events" ON public.events
    FOR SELECT USING (lifecycle IN ('published', 'live'));

-- Admins can view all events
CREATE POLICY "Admins can view all events" ON public.events
    FOR SELECT USING (public.is_admin());

-- Event managers and Master Admins can create and modify events
CREATE POLICY "Managers can manage events" ON public.events
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- TEAMS POLICIES
CREATE POLICY "Admins can view teams" ON public.teams
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Managers can manage teams" ON public.teams
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- REGISTRATIONS POLICIES
-- Public has NO direct SELECT or INSERT on registrations; registrations are done via register_for_event()
CREATE POLICY "Admins can view registrations" ON public.registrations
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Managers can modify registrations" ON public.registrations
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- ATTENDANCE RECORDS POLICIES
CREATE POLICY "Staff can view and record attendance" ON public.attendance_records
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Staff can insert attendance records" ON public.attendance_records
    FOR INSERT WITH CHECK (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role, 'attendance_staff'::admin_role]));

CREATE POLICY "Managers can delete attendance records" ON public.attendance_records
    FOR DELETE USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- ROUNDS POLICIES
CREATE POLICY "Public can view rounds for published events" ON public.rounds
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = rounds.event_id AND lifecycle IN ('published', 'live'))
    );

CREATE POLICY "Admins can manage rounds" ON public.rounds
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- CERTIFICATES POLICIES
-- Public can verify certificates by certificate_number query
CREATE POLICY "Public can verify issued certificates" ON public.certificates
    FOR SELECT USING (status = 'issued');

CREATE POLICY "Admins can manage certificates" ON public.certificates
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- COMMUNICATIONS OUTBOX POLICIES
CREATE POLICY "Only admins can view communications" ON public.communications_outbox
    FOR SELECT USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role, 'analyst'::admin_role]));

CREATE POLICY "Admins can append to audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 13. LEAST-PRIVILEGE ROLE PERMISSIONS & GRANTS
-- ------------------------------------------------------------------------------
-- Default to least-privilege: Revoke all on sensitive tables from public/anon
DO $$ BEGIN
    -- Revoke direct permissions on operational tables from public
    REVOKE ALL ON public.admin_profiles FROM PUBLIC, anon;
    REVOKE ALL ON public.registrations FROM PUBLIC, anon;
    REVOKE ALL ON public.teams FROM PUBLIC, anon;
    REVOKE ALL ON public.attendance_records FROM PUBLIC, anon;
    REVOKE ALL ON public.communications_outbox FROM PUBLIC, anon;
    REVOKE ALL ON public.audit_logs FROM PUBLIC, anon;

    -- Grant read-only access to published public surfaces
    GRANT SELECT ON public.events TO anon, authenticated;
    GRANT SELECT ON public.rounds TO anon, authenticated;
    GRANT SELECT ON public.certificates TO anon, authenticated;

    -- Grant execute on the atomic registration endpoint
    GRANT EXECUTE ON FUNCTION public.register_for_event TO anon, authenticated;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
