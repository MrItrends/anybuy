-- Rider compliance columns + expanded status
ALTER TABLE public.rider_profiles
  ADD COLUMN IF NOT EXISTS nin                 TEXT,
  ADD COLUMN IF NOT EXISTS selfie_url          TEXT,
  ADD COLUMN IF NOT EXISTS id_front_url        TEXT,
  ADD COLUMN IF NOT EXISTS id_back_url         TEXT,
  ADD COLUMN IF NOT EXISTS license_number      TEXT,
  ADD COLUMN IF NOT EXISTS license_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_make        TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model       TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year        TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color       TEXT,
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name   TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason    TEXT,
  ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Expand status to include pending/approved/rejected
ALTER TABLE public.rider_profiles DROP CONSTRAINT IF EXISTS rider_profiles_status_check;
ALTER TABLE public.rider_profiles
  ADD CONSTRAINT rider_profiles_status_check
  CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'suspended'));

-- Treat all current 'active' riders as approved
UPDATE public.rider_profiles SET status = 'approved' WHERE status = 'active';

-- Storage bucket for rider docs (create in Supabase Dashboard > Storage)
-- Bucket name: rider-docs  |  Public: false
-- RLS: authenticated users upload to their own folder (userId/*)
