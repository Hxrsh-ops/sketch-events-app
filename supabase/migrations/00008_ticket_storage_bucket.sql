-- ==============================================================================
-- Migration: 00008_ticket_storage_bucket.sql
-- Description: Provision ticket-assets public storage bucket & RLS policies
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ticket-assets',
    'ticket-assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- 1. Public Read Policy: Allow anyone (live tickets, printable passes, email recipients) to view ticket assets
DROP POLICY IF EXISTS "Public Read Ticket Assets" ON storage.objects;
CREATE POLICY "Public Read Ticket Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-assets');

-- 2. Authenticated Admin / Service Role Upload Policy
DROP POLICY IF EXISTS "Admin Upload Ticket Assets" ON storage.objects;
CREATE POLICY "Admin Upload Ticket Assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'ticket-assets'
    AND (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.admin_profiles
            WHERE id = auth.uid()
        )
    )
);

-- 3. Prevent overwrites: Disallow UPDATE on published assets
DROP POLICY IF EXISTS "Disallow Ticket Asset Overwrite" ON storage.objects;
CREATE POLICY "Disallow Ticket Asset Overwrite"
ON storage.objects FOR UPDATE
USING (false);
