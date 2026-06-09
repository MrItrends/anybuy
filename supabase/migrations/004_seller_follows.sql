-- Seller follows: buyers can follow a seller to get notified of new listings.
create table public.seller_follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  seller_id   uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, seller_id)
);

create index on public.seller_follows(seller_id);

alter table public.seller_follows enable row level security;

-- Users can read their own follows (to show Follow/Unfollow state)
create policy "Users see own follows" on public.seller_follows
  for select using (auth.uid() = follower_id);

-- Users can follow / unfollow
create policy "Users manage own follows" on public.seller_follows
  for all using (auth.uid() = follower_id);
