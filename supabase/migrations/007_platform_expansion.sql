-- Migration 007: Platform Expansion
-- Adds: seller bank accounts, withdrawals, discounts, rider profiles,
--       deliveries, admin roles, platform announcements

-- ── Seller bank accounts ─────────────────────────────────────────────────────
create table public.seller_bank_accounts (
  id              uuid default uuid_generate_v4() primary key,
  seller_id       uuid references public.profiles(id) on delete cascade not null,
  bank_name       text not null,
  bank_code       text,
  account_number  text not null,
  account_name    text not null,
  is_default      boolean default false,
  created_at      timestamptz default now()
);
alter table public.seller_bank_accounts enable row level security;
create policy "Sellers manage own bank accounts"
  on public.seller_bank_accounts for all using (auth.uid() = seller_id);

-- ── Withdrawals ───────────────────────────────────────────────────────────────
create table public.withdrawals (
  id               uuid default uuid_generate_v4() primary key,
  seller_id        uuid references public.profiles(id) on delete cascade not null,
  bank_account_id  uuid references public.seller_bank_accounts(id) not null,
  amount           numeric(12,2) not null,
  status           text default 'pending'
    check (status in ('pending','processing','completed','failed')),
  reference        text unique,
  note             text,
  created_at       timestamptz default now(),
  processed_at     timestamptz
);
alter table public.withdrawals enable row level security;
create policy "Sellers see own withdrawals"
  on public.withdrawals for select using (auth.uid() = seller_id);
create policy "Sellers create withdrawals"
  on public.withdrawals for insert with check (auth.uid() = seller_id);

-- ── Discounts ─────────────────────────────────────────────────────────────────
create table public.discounts (
  id               uuid default uuid_generate_v4() primary key,
  seller_id        uuid references public.profiles(id) on delete cascade not null,
  product_id       uuid references public.products(id) on delete cascade,
  occasion         text,           -- 'black_friday', 'easter', 'ramadan', 'salah', 'custom'
  label            text,           -- buyer-facing name e.g. "Black Friday 20% Off"
  discount_type    text not null check (discount_type in ('percentage','fixed')),
  discount_value   numeric(12,2) not null,
  min_order_amount numeric(12,2) default 0,
  applies_to       text default 'product'
    check (applies_to in ('product','all_listings')),
  starts_at        timestamptz default now(),
  ends_at          timestamptz,
  is_active        boolean default true,
  created_at       timestamptz default now()
);
alter table public.discounts enable row level security;
create policy "Discounts readable by all"
  on public.discounts for select using (true);
create policy "Sellers manage own discounts"
  on public.discounts for all using (auth.uid() = seller_id);

-- ── Rider profiles ────────────────────────────────────────────────────────────
create table public.rider_profiles (
  user_id          uuid references public.profiles(id) on delete cascade primary key,
  phone            text,
  vehicle_type     text check (vehicle_type in ('bike','car','van','truck')),
  vehicle_plate    text,
  city             text,
  state            text,
  is_available     boolean default true,
  status           text default 'active'
    check (status in ('active','inactive','suspended')),
  total_deliveries integer default 0,
  rating           numeric(3,2) default 0,
  rating_count     integer default 0,
  current_lat      numeric(10,7),
  current_lng      numeric(10,7),
  created_at       timestamptz default now()
);
alter table public.rider_profiles enable row level security;
create policy "Riders manage own profile"
  on public.rider_profiles for all using (auth.uid() = user_id);
create policy "Rider profiles viewable by admins"
  on public.rider_profiles for select using (
    auth.uid() = user_id
    or exists (select 1 from public.admin_roles where user_id = auth.uid() and is_active = true)
  );

-- ── Deliveries ────────────────────────────────────────────────────────────────
create table public.deliveries (
  id                   uuid default uuid_generate_v4() primary key,
  order_id             uuid references public.orders(id) on delete cascade unique not null,
  rider_id             uuid references public.profiles(id),
  assigned_by          uuid references public.profiles(id),
  pickup_address       text,
  pickup_lat           numeric(10,7),
  pickup_lng           numeric(10,7),
  delivery_address     text,
  delivery_lat         numeric(10,7),
  delivery_lng         numeric(10,7),
  status               text default 'pending_assignment' check (status in (
    'pending_assignment','assigned','accepted','picked_up',
    'in_transit','at_delivery_point','delivered',
    'failed','return_scheduled','returned'
  )),
  notes                text,
  estimated_delivery_at timestamptz,
  assigned_at          timestamptz,
  picked_up_at         timestamptz,
  delivered_at         timestamptz,
  created_at           timestamptz default now()
);
create index on public.deliveries(rider_id);
create index on public.deliveries(order_id);
create index on public.deliveries(status);

alter table public.deliveries enable row level security;
create policy "Order participants see delivery"
  on public.deliveries for select
  using (
    auth.uid() in (
      select buyer_id  from public.orders where id = order_id
      union select seller_id from public.orders where id = order_id
    )
    or auth.uid() = rider_id
    or exists (select 1 from public.admin_roles where user_id = auth.uid() and is_active = true)
  );
create policy "Admins manage deliveries"
  on public.deliveries for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid() and is_active = true));
create policy "Riders update own deliveries"
  on public.deliveries for update using (auth.uid() = rider_id);

-- ── Admin roles ───────────────────────────────────────────────────────────────
create table public.admin_roles (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  role         text not null check (
    role in ('super_admin','chat_admin','order_admin','technical_admin','viewer')
  ),
  assigned_by  uuid references public.profiles(id),
  is_active    boolean default true,
  created_at   timestamptz default now(),
  unique (user_id, role)
);
alter table public.admin_roles enable row level security;
create policy "Admins see admin roles"
  on public.admin_roles for select
  using (exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid() and ar.is_active = true));

-- ── Platform announcements ────────────────────────────────────────────────────
create table public.platform_announcements (
  id               uuid default uuid_generate_v4() primary key,
  created_by       uuid references public.profiles(id),
  type             text check (type in ('notification','banner','sale_event')),
  title            text not null,
  body             text,
  occasion         text,           -- 'black_friday','easter','ramadan','salah','custom'
  cta_label        text,
  cta_url          text,
  target_audience  text default 'all'
    check (target_audience in ('all','buyers','sellers','riders')),
  is_active        boolean default true,
  starts_at        timestamptz default now(),
  ends_at          timestamptz,
  created_at       timestamptz default now()
);
alter table public.platform_announcements enable row level security;
create policy "Active announcements readable by all"
  on public.platform_announcements for select using (is_active = true);
create policy "Admins manage announcements"
  on public.platform_announcements for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid() and is_active = true));

-- ── Add ready_for_delivery flag to orders ─────────────────────────────────────
alter table public.orders add column if not exists ready_for_pickup boolean default false;
alter table public.orders add column if not exists seller_note text;
