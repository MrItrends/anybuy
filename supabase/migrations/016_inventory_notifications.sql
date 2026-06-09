-- ============================================================
-- 016 — Inventory tracking + seller notifications
-- ============================================================

-- 1. Add quantity + low_stock_threshold to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3;

-- 2. Notifications table (seller-scoped)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('low_stock', 'listing_paused')),
  product_id UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  payload    JSONB       NOT NULL DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast unread-count + dropdown fetch
CREATE INDEX IF NOT EXISTS notifications_seller_created_idx
  ON public.notifications (seller_id, created_at DESC);

-- Prevent duplicate unread alerts for the same product + type
-- (e.g. low_stock fires once; fires again only after the seller reads it)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unread_product_type_idx
  ON public.notifications (product_id, type)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = seller_id);

-- Service role (no user auth) is used for INSERT from the orders API —
-- no INSERT policy needed; service role bypasses RLS entirely.

-- 3. Add variant_id to orders (nullable — only set when a specific variant was ordered)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);
