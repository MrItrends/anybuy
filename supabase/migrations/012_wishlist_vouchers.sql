-- ── Wishlist RLS policies (table already exists in schema.sql) ────────────────
create policy if not exists "Users see own wishlist"
  on public.wishlists for select using (auth.uid() = user_id);

create policy if not exists "Users manage own wishlist"
  on public.wishlists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Vouchers ──────────────────────────────────────────────────────────────────
-- Sellers create redeemable discount codes. seller_id = null means platform-wide.
create table if not exists public.vouchers (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid references public.profiles(id) on delete cascade,
  code             text not null unique,
  label            text,                        -- buyer-facing name e.g. "10% off electronics"
  discount_type    text not null check (discount_type in ('percentage','fixed')),
  discount_value   numeric(12,2) not null,
  min_order_amount numeric(12,2) default 0,
  max_uses         integer,                     -- null = unlimited
  used_count       integer not null default 0,
  expires_at       timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz default now()
);

alter table public.vouchers enable row level security;

-- Anyone can look up an active voucher by code (needed for checkout validation)
create policy "Active vouchers readable by all"
  on public.vouchers for select using (is_active = true);

-- Sellers manage their own vouchers
create policy "Sellers manage own vouchers"
  on public.vouchers for all using (auth.uid() = seller_id);

-- ── order_reviews helper view: know if a buyer has reviewed an order ──────────
-- (reviews table already exists; this just makes the join easier)
-- No schema change needed — we query reviews.order_id directly.
