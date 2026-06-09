-- Migration 008: Live Selling
-- Adds: live_sessions, live_drops, live_bids, live_messages, live_polls, live_poll_votes

-- ── Live sessions ─────────────────────────────────────────────────────────────
create table public.live_sessions (
  id            uuid default uuid_generate_v4() primary key,
  seller_id     uuid references public.profiles(id) on delete cascade not null,
  title         text not null,
  description   text,
  thumbnail_url text,
  status        text default 'waiting'
    check (status in ('waiting', 'live', 'ended')),
  viewer_count  integer default 0,
  channel_id    text unique not null, -- used as Agora/WebRTC channel name
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz default now()
);
create index on public.live_sessions(seller_id);
create index on public.live_sessions(status);

alter table public.live_sessions enable row level security;
create policy "Live sessions readable by all"
  on public.live_sessions for select using (true);
create policy "Sellers manage own sessions"
  on public.live_sessions for all using (auth.uid() = seller_id);

-- ── Live drops (products sold during a session) ───────────────────────────────
create table public.live_drops (
  id              uuid default uuid_generate_v4() primary key,
  session_id      uuid references public.live_sessions(id) on delete cascade not null,
  product_id      uuid references public.products(id) on delete set null,
  title           text not null,
  image_url       text,
  drop_type       text default 'auction'
    check (drop_type in ('auction', 'fixed')),
  start_price     numeric(12,2) not null,
  current_price   numeric(12,2),
  reserve_price   numeric(12,2),
  min_increment   numeric(12,2) default 50,
  timer_seconds   integer default 60,
  ends_at         timestamptz,           -- set when timer starts
  status          text default 'waiting'
    check (status in ('waiting', 'active', 'ending', 'sold', 'cancelled')),
  winner_id       uuid references public.profiles(id),
  winner_name     text,
  final_price     numeric(12,2),
  sort_order      integer default 0,
  created_at      timestamptz default now()
);
create index on public.live_drops(session_id);
create index on public.live_drops(status);

alter table public.live_drops enable row level security;
create policy "Live drops readable by all"
  on public.live_drops for select using (true);
create policy "Sellers manage own drops"
  on public.live_drops for all
  using (exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.seller_id = auth.uid()
  ));

-- ── Live bids ─────────────────────────────────────────────────────────────────
create table public.live_bids (
  id         uuid default uuid_generate_v4() primary key,
  drop_id    uuid references public.live_drops(id) on delete cascade not null,
  session_id uuid references public.live_sessions(id) on delete cascade not null,
  bidder_id  uuid references public.profiles(id) not null,
  bidder_name text not null,
  amount     numeric(12,2) not null,
  created_at timestamptz default now()
);
create index on public.live_bids(drop_id);
create index on public.live_bids(session_id);

alter table public.live_bids enable row level security;
create policy "Bids readable by all"
  on public.live_bids for select using (true);
create policy "Auth users can bid"
  on public.live_bids for insert with check (auth.uid() = bidder_id);

-- ── Live messages (chat) ──────────────────────────────────────────────────────
create table public.live_messages (
  id         uuid default uuid_generate_v4() primary key,
  session_id uuid references public.live_sessions(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) not null,
  user_name  text not null,
  content    text not null,
  type       text default 'message'
    check (type in ('message', 'system', 'reaction', 'bid_placed')),
  created_at timestamptz default now()
);
create index on public.live_messages(session_id, created_at);

alter table public.live_messages enable row level security;
create policy "Messages readable by all"
  on public.live_messages for select using (true);
create policy "Auth users can chat"
  on public.live_messages for insert with check (auth.uid() = user_id);

-- ── Live polls ────────────────────────────────────────────────────────────────
create table public.live_polls (
  id         uuid default uuid_generate_v4() primary key,
  session_id uuid references public.live_sessions(id) on delete cascade not null,
  question   text not null,
  options    jsonb not null default '[]',   -- [{text, votes}]
  ends_at    timestamptz,
  is_active  boolean default true,
  created_at timestamptz default now()
);

alter table public.live_polls enable row level security;
create policy "Polls readable by all"
  on public.live_polls for select using (true);
create policy "Sellers manage polls"
  on public.live_polls for all
  using (exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.seller_id = auth.uid()
  ));

-- ── Live poll votes ───────────────────────────────────────────────────────────
create table public.live_poll_votes (
  id           uuid default uuid_generate_v4() primary key,
  poll_id      uuid references public.live_polls(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) not null,
  option_index integer not null,
  created_at   timestamptz default now(),
  unique (poll_id, user_id)
);

alter table public.live_poll_votes enable row level security;
create policy "Votes readable by all"
  on public.live_poll_votes for select using (true);
create policy "Auth users can vote"
  on public.live_poll_votes for insert with check (auth.uid() = user_id);
