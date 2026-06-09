-- Add store logo URL to seller profiles
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS store_logo_url TEXT;

-- Storage bucket for store logos (run this in Supabase Dashboard > Storage if bucket doesn't exist)
-- Bucket name: store-logos  |  Public: true
-- Policy: authenticated users can upload to their own folder (userId/logo*)
