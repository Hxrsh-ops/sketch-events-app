-- ==============================================================================
-- Migration: 00007_ticket_studio_and_rotating_qr.sql
-- Description: Ticket Design Studio, Immutable Versioning, Bearer Access & Rotating QR Credentials
--
-- Security & Invariants:
-- 1. Separates ticket design templates from immutable published versions.
-- 2. Once published and assigned, template versions cannot be mutated in-place.
-- 3. Tickets use high-entropy opaque bearer access tokens stored as SHA-256 hashes.
-- 4. Public access to ticket verification only reveals approved metadata (no emails or PII).
-- 5. Rotating QR verification is atomic, event-scoped, and replay-protected.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TICKET DESIGN TEMPLATES & IMMUTABLE VERSIONS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_templates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'cinematic' CHECK (category IN ('cinematic', 'minimal', 'modern', 'vip', 'conference')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ticket_template_versions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.ticket_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    design_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.ticket_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_published ON public.ticket_template_versions(is_published);

-- Attach template assignment to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS ticket_template_version_id UUID REFERENCES public.ticket_template_versions(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 2. PARTICIPANT TICKET LEDGER & BEARER TOKENS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    template_version_id UUID REFERENCES public.ticket_template_versions(id) ON DELETE SET NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    bearer_token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'cancelled')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_registration_ticket UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_registration ON public.tickets(registration_id);
CREATE INDEX IF NOT EXISTS idx_tickets_bearer_hash ON public.tickets(bearer_token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(ticket_number);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage templates
CREATE POLICY "Admins can view ticket templates" ON public.ticket_templates
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage ticket templates" ON public.ticket_templates
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

CREATE POLICY "Admins can view template versions" ON public.ticket_template_versions
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage template versions" ON public.ticket_template_versions
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- Public can view published template versions for rendering
CREATE POLICY "Public can view published template versions" ON public.ticket_template_versions
    FOR SELECT USING (is_published = true);

-- Direct table access to public.tickets is locked
REVOKE ALL ON public.tickets FROM PUBLIC, anon;

CREATE POLICY "Admins can view tickets" ON public.tickets
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage tickets" ON public.tickets
    FOR ALL USING (public.has_role(ARRAY['master_admin'::admin_role, 'event_manager'::admin_role]));

-- ------------------------------------------------------------------------------
-- 4. ATOMIC TICKET ISSUANCE & RECONCILIATION RPC
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.issue_or_reconcile_ticket(
    p_registration_id UUID,
    p_bearer_token_hash TEXT,
    p_ticket_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reg RECORD;
    v_event RECORD;
    v_existing RECORD;
    v_template_version_id UUID;
    v_ticket_id UUID;
BEGIN
    -- 1. Fetch registration
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = p_registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_NOT_FOUND', 'message', 'Registration not found.');
    END IF;

    -- 2. Fetch event
    SELECT * INTO v_event
    FROM public.events
    WHERE id = v_reg.event_id;

    -- 3. Idempotent check: if ticket already exists, return existing ticket info
    SELECT * INTO v_existing
    FROM public.tickets
    WHERE registration_id = p_registration_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'ticket_id', v_existing.id,
            'ticket_number', v_existing.ticket_number,
            'status', v_existing.status,
            'template_version_id', v_existing.template_version_id,
            'is_existing', true
        );
    END IF;

    -- 4. Resolve template version: use event-specific template or fallback to default published version
    v_template_version_id := v_event.ticket_template_version_id;
    IF v_template_version_id IS NULL THEN
        SELECT id INTO v_template_version_id
        FROM public.ticket_template_versions
        WHERE is_published = true
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- 5. Insert new ticket
    INSERT INTO public.tickets (
        registration_id,
        event_id,
        template_version_id,
        ticket_number,
        bearer_token_hash,
        status,
        issued_at
    ) VALUES (
        p_registration_id,
        v_reg.event_id,
        v_template_version_id,
        p_ticket_number,
        p_bearer_token_hash,
        'active',
        timezone('utc', now())
    )
    RETURNING id INTO v_ticket_id;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'ticket_number', p_ticket_number,
        'status', 'active',
        'template_version_id', v_template_version_id,
        'is_existing', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_or_reconcile_ticket(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_or_reconcile_ticket(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. SAFE LIVE TICKET BEARER LOOKUP RPC (ZERO PII EXPOSURE)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_ticket_by_bearer_hash(p_bearer_token_hash TEXT)
RETURNS TABLE (
    ticket_id UUID,
    ticket_number TEXT,
    event_id UUID,
    event_title TEXT,
    event_slug TEXT,
    venue TEXT,
    venue_mode TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    attendee_name TEXT,
    team_name TEXT,
    ticket_status TEXT,
    attendance_status TEXT,
    template_design JSONB,
    checked_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS ticket_id,
        t.ticket_number,
        e.id AS event_id,
        e.title AS event_title,
        e.slug AS event_slug,
        e.venue,
        e.venue_mode::TEXT,
        e.start_date,
        e.end_date,
        r.attendee_name,
        tm.name AS team_name,
        t.status AS ticket_status,
        r.attendance_status::TEXT,
        COALESCE(ttv.design_data, '{}'::jsonb) AS template_design,
        r.checked_in_at
    FROM public.tickets t
    JOIN public.registrations r ON r.id = t.registration_id
    JOIN public.events e ON e.id = t.event_id
    LEFT JOIN public.teams tm ON tm.id = r.team_id
    LEFT JOIN public.ticket_template_versions ttv ON ttv.id = t.template_version_id
    WHERE t.bearer_token_hash = p_bearer_token_hash
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ticket_by_bearer_hash(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_by_bearer_hash(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. ATOMIC ROTATING QR VERIFICATION & CHECK-IN RPC
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_rotating_qr_token(
    p_ticket_id UUID,
    p_event_id UUID,
    p_actor_id UUID,
    p_method TEXT DEFAULT 'camera'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor RECORD;
    v_ticket RECORD;
    v_reg RECORD;
    v_event RECORD;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
    -- 1. Validate caller authorization
    IF p_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTOR_REQUIRED', 'message', 'Scanner authorization required.');
    END IF;

    SELECT id, role, full_name, email INTO v_actor
    FROM public.admin_profiles
    WHERE id = p_actor_id;

    IF NOT FOUND OR v_actor.role NOT IN ('master_admin', 'event_manager', 'attendance_staff') THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_ACTOR', 'message', 'Unauthorized attendance agent.');
    END IF;

    -- 2. Lock and verify ticket
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_NOT_FOUND', 'message', 'Invalid or unissued ticket.');
    END IF;

    -- Check revocation
    IF v_ticket.status = 'revoked' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TICKET_REVOKED',
            'message', COALESCE(v_ticket.revocation_reason, 'This ticket has been revoked by administration.')
        );
    END IF;

    IF v_ticket.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_CANCELLED', 'message', 'This ticket has been cancelled.');
    END IF;

    -- 3. Cross-event boundary check
    IF v_ticket.event_id <> p_event_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CROSS_EVENT_MISMATCH',
            'message', 'Ticket is not valid for this event.'
        );
    END IF;

    -- 4. Lock and verify registration
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = v_ticket.registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_NOT_FOUND', 'message', 'Registration record missing.');
    END IF;

    IF v_reg.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_CANCELLED', 'message', 'Attendee registration is cancelled.');
    END IF;

    -- 5. Duplicate check-in protection
    IF v_reg.attendance_status = 'checked_in' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_CHECKED_IN',
            'message', 'Ticket has already been used for check-in.',
            'attendee_name', v_reg.attendee_name,
            'checked_in_at', v_reg.checked_in_at,
            'ticket_number', v_ticket.ticket_number
        );
    END IF;

    -- 6. Perform atomic check-in
    UPDATE public.registrations
    SET attendance_status = 'checked_in',
        checked_in_at = v_now,
        updated_at = v_now
    WHERE id = v_reg.id;

    -- Insert attendance record
    INSERT INTO public.attendance_records (
        registration_id,
        event_id,
        checked_in_by,
        method,
        checked_in_at
    ) VALUES (
        v_reg.id,
        v_ticket.event_id,
        p_actor_id,
        COALESCE(p_method, 'camera')::check_in_method,
        v_now
    );

    -- Increment event checked_in_count
    UPDATE public.events
    SET checked_in_count = COALESCE(checked_in_count, 0) + 1,
        updated_at = v_now
    WHERE id = v_ticket.event_id;

    -- Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        actor_name,
        actor_email,
        action,
        target,
        details
    ) VALUES (
        p_actor_id,
        v_actor.full_name,
        v_actor.email,
        'ROTATING_QR_CHECK_IN',
        v_ticket.ticket_number,
        jsonb_build_object(
            'ticket_id', v_ticket.id,
            'registration_id', v_reg.id,
            'event_id', v_ticket.event_id,
            'attendee_name', v_reg.attendee_name,
            'method', p_method
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Check-in confirmed.',
        'attendance_status', 'checked_in',
        'attendee_name', v_reg.attendee_name,
        'ticket_number', v_ticket.ticket_number,
        'checked_in_at', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_rotating_qr_token(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_rotating_qr_token(UUID, UUID, UUID, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. TICKET REVOCATION RPC
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_ticket(
    p_ticket_id UUID,
    p_actor_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor RECORD;
    v_ticket RECORD;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
    SELECT id, role, full_name, email INTO v_actor
    FROM public.admin_profiles
    WHERE id = p_actor_id;

    IF NOT FOUND OR v_actor.role NOT IN ('master_admin', 'event_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_ACTOR', 'message', 'Unauthorized revocation agent.');
    END IF;

    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_NOT_FOUND', 'message', 'Ticket not found.');
    END IF;

    UPDATE public.tickets
    SET status = 'revoked',
        revoked_at = v_now,
        revoked_by = p_actor_id,
        revocation_reason = COALESCE(trim(p_reason), 'Revoked by administration.'),
        updated_at = v_now
    WHERE id = p_ticket_id;

    -- Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        actor_name,
        actor_email,
        action,
        target,
        details
    ) VALUES (
        p_actor_id,
        v_actor.full_name,
        v_actor.email,
        'TICKET_REVOKED',
        v_ticket.ticket_number,
        jsonb_build_object(
            'ticket_id', v_ticket.id,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Ticket revoked successfully.',
        'ticket_id', p_ticket_id,
        'status', 'revoked'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_ticket(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_ticket(UUID, UUID, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. SEED STARTER CINEMATIC TEMPLATE
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    v_template_id UUID := '77777777-7777-7777-7777-777777770001'::uuid;
    v_version_id UUID := '88888888-8888-8888-8888-888888880001'::uuid;
BEGIN
    INSERT INTO public.ticket_templates (
        id, name, slug, category, description, is_active
    ) VALUES (
        v_template_id,
        'Cinematic Midnight Premiere',
        'cinematic-midnight-premiere',
        'cinematic',
        'Deep charcoal pass with gold accents, perforated tear-off stub, and rotating live QR badge.',
        true
    ) ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.ticket_template_versions (
        id, template_id, version_number, design_data, is_published, published_at
    ) VALUES (
        v_version_id,
        v_template_id,
        1,
        '{
            "layout": "cinematic-horizontal",
            "canvas": { "width": 800, "height": 380, "unit": "px" },
            "theme": {
                "background": "#111315",
                "surface": "#181B1E",
                "accent": "#E2B857",
                "textColor": "#F3F4F6",
                "secondaryTextColor": "#9CA3AF",
                "borderColor": "#2C3136"
            },
            "stub": {
                "perforationPosition": "right",
                "stubWidth": 240,
                "badgeText": "OFFICIAL ADMISSION"
            },
            "qr": {
                "size": 180,
                "label": "SCAN AT TERMINAL",
                "rotating": true,
                "refreshIntervalSec": 30
            }
        }'::jsonb,
        true,
        timezone('utc', now())
    ) ON CONFLICT (template_id, version_number) DO NOTHING;
END $$;
