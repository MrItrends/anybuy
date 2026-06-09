-- Migration 015: Live Auction V2
-- Adds closing_price, claim lifecycle, and scheduled sessions

-- ── live_drops: auction closing price + claim lifecycle ───────────────────────
ALTER TABLE public.live_drops
  ADD COLUMN IF NOT EXISTS closing_price  numeric(12,2),   -- optional: first bid ≥ this wins
  ADD COLUMN IF NOT EXISTS claim_deadline timestamptz,      -- set when winner declared (now + 15min)
  ADD COLUMN IF NOT EXISTS claim_status   text DEFAULT 'none'
    CHECK (claim_status IN ('none', 'pending', 'claimed', 'expired'));

-- ── live_sessions: scheduled support ─────────────────────────────────────────
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Update status check to include 'scheduled'
ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_status_check;
ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_status_check
    CHECK (status IN ('waiting', 'scheduled', 'live', 'ended'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
