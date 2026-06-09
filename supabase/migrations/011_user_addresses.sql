-- Saved delivery addresses per user
create table if not exists user_addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Home',   -- 'Home', 'Office', 'Other', etc.
  street      text not null,
  city        text not null,
  state       text not null,
  is_default  boolean not null default false,
  created_at  timestamptz default now()
);

-- Enforce only one default per user
create unique index if not exists user_addresses_one_default
  on user_addresses(user_id)
  where is_default = true;

-- RLS — users can only access their own addresses
alter table user_addresses enable row level security;

create policy "addresses_owner_all"
  on user_addresses
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
