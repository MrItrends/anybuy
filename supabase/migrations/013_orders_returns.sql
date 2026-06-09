-- ── Extend orders table ───────────────────────────────────────────────────────

-- Add 'cancelled' to allowed statuses
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (
    status in (
      'pending_payment','payment_held','preparing',
      'picked_up','in_transit','delivered',
      'confirmed','disputed','refunded','completed',
      'cancelled'
    )
  );

-- Delivery details
alter table public.orders
  add column if not exists delivery_fee       numeric(12,2) default 0,
  add column if not exists estimated_delivery_at timestamptz,
  add column if not exists cancelled_at       timestamptz,
  add column if not exists cancel_reason      text,
  add column if not exists confirmed_at       timestamptz;  -- set when buyer confirms receipt

-- ── Return / exchange / refund requests ──────────────────────────────────────
create table if not exists public.order_returns (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade not null,
  buyer_id     uuid references public.profiles(id) not null,
  type         text not null check (type in ('return','exchange','refund')),
  reason       text not null check (reason in (
    'wrong_item','damaged','not_as_described',
    'changed_mind','not_received','quality_issue','other'
  )),
  description  text,
  status       text not null default 'pending'
    check (status in ('pending','approved','rejected','completed')),
  seller_note  text,
  created_at   timestamptz default now(),
  resolved_at  timestamptz
);

create index if not exists order_returns_order_id_idx on public.order_returns(order_id);
create index if not exists order_returns_buyer_id_idx on public.order_returns(buyer_id);

alter table public.order_returns enable row level security;

create policy "Buyers see own returns"
  on public.order_returns for select
  using (auth.uid() = buyer_id);

create policy "Buyers create returns"
  on public.order_returns for insert
  with check (auth.uid() = buyer_id);

create policy "Sellers see returns for their orders"
  on public.order_returns for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.seller_id = auth.uid()
  ));

create policy "Sellers update return status"
  on public.order_returns for update
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.seller_id = auth.uid()
  ));
