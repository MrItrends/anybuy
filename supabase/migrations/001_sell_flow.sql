-- Migration 001: Sell flow additions
-- Run this in Supabase SQL Editor if you've already run the base schema.sql

-- 1. Add location column to products
alter table public.products add column if not exists location text default 'Lagos';

-- 2. Enable RLS on tables that were missing it
alter table public.seller_profiles enable row level security;
alter table public.product_media enable row level security;

-- 3. RLS policies for seller_profiles
create policy "Seller profiles are public"
  on public.seller_profiles for select using (true);

create policy "Sellers manage own profile"
  on public.seller_profiles for all using (auth.uid() = user_id);

-- 4. RLS policies for product_media
create policy "Product media is public"
  on public.product_media for select using (true);

create policy "Sellers manage own product media"
  on public.product_media for all
  using (
    auth.uid() = (
      select seller_id from public.products where id = product_id
    )
  );

-- 5. Allow sellers to insert their own products
create policy "Sellers can insert products"
  on public.products for insert
  with check (auth.uid() = seller_id);
