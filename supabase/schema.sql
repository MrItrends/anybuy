-- AnyBuy Database Schema
-- Run this in your Supabase SQL Editor

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  is_verified boolean default false,
  rating numeric(3,2) default 0,
  rating_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.seller_profiles (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  store_name text not null,
  store_description text,
  total_sales integer default 0,
  response_rate numeric(5,2) default 0,
  verified_seller boolean default false
);

-- ============================================
-- PRODUCTS
-- ============================================
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  price numeric(12,2) not null check (price > 0),
  category text not null check (category in ('phones','fashion','home','electronics','sports','other')),
  condition text not null check (condition in ('new','grade_a','grade_b','grade_c')),
  thumbnail_url text,
  location text default 'Lagos',
  is_negotiable boolean default false,
  is_available boolean default true,
  view_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.product_media (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  url text not null,
  type text not null check (type in ('image','video')),
  "order" integer not null default 0
);

create index on public.products(category);
create index on public.products(seller_id);
create index on public.products(is_available);
create index on public.products(created_at desc);

-- Full text search
alter table public.products add column search_vector tsvector
  generated always as (to_tsvector('english', title || ' ' || description)) stored;
create index on public.products using gin(search_vector);

-- ============================================
-- ORDERS
-- ============================================
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  product_id uuid references public.products(id) not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  status text not null default 'pending_payment' check (
    status in ('pending_payment','payment_held','preparing','picked_up','in_transit','delivered','confirmed','disputed','refunded','completed')
  ),
  delivery_street text,
  delivery_city text,
  delivery_state text,
  delivery_country text default 'Nigeria',
  tracking_code text,
  confirmation_code text,
  escrow_reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.orders(buyer_id);
create index on public.orders(seller_id);
create index on public.orders(status);

-- ============================================
-- PAYMENTS
-- ============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  amount numeric(12,2) not null,
  platform_fee numeric(12,2) not null,
  net_seller_amount numeric(12,2) not null,
  currency text default 'NGN',
  status text default 'pending' check (status in ('pending','held','released','refunded','failed')),
  paystack_reference text unique,
  paystack_transaction_id text,
  held_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- LIVE SESSIONS
-- ============================================
create table public.live_sessions (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) not null,
  title text not null,
  thumbnail_url text,
  room_name text unique not null,
  status text default 'scheduled' check (status in ('scheduled','live','ended')),
  viewer_count integer default 0,
  product_ids uuid[] default '{}',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

create index on public.live_sessions(status);
create index on public.live_sessions(seller_id);

-- ============================================
-- DISPUTES
-- ============================================
create table public.disputes (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  reason text not null,
  evidence_urls text[] default '{}',
  status text default 'open' check (
    status in ('open','under_review','resolved_refund','resolved_partial','resolved_rejected')
  ),
  admin_notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ============================================
-- REVIEWS
-- ============================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null unique,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- ============================================
-- WISHLIST
-- ============================================
create table public.wishlists (
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.disputes enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Seller profiles: public read, owner write
create policy "Seller profiles are public" on public.seller_profiles for select using (true);
create policy "Sellers manage own profile" on public.seller_profiles for all using (auth.uid() = user_id);

-- Products: everyone can read available, seller manages own
create policy "Available products are public" on public.products for select using (is_available = true);
create policy "Sellers can insert products" on public.products for insert with check (auth.uid() = seller_id);
create policy "Sellers can manage own products" on public.products for all using (auth.uid() = seller_id);

-- Product media: public read, seller manages own
create policy "Product media is public" on public.product_media for select using (true);
create policy "Sellers manage own product media" on public.product_media for all
  using (auth.uid() = (select seller_id from public.products where id = product_id));

-- Orders: buyers and sellers see own orders
create policy "Users see own orders" on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers create orders" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Parties update order status" on public.orders for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Trigger: update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger products_updated_at before update on public.products
  for each row execute function update_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'buyer');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
