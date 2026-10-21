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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Ticket Assets'
    ) THEN
        CREATE POLICY "Public Read Ticket Assets"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'ticket-assets');
    END IF;
END $$;

-- 2. Authenticated Admin / Service Role Upload Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin Upload Ticket Assets'
    ) THEN
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
    END IF;
END $$;

-- 3. Prevent overwrites: Disallow UPDATE on published assets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Disallow Ticket Asset Overwrite'
    ) THEN
        CREATE POLICY "Disallow Ticket Asset Overwrite"
        ON storage.objects FOR UPDATE
        USING (false);
    END IF;
END $$;
