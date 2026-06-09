-- Migration 006: Buyer–seller chat
-- One conversation per (buyer, seller, product) triple.
-- Messages live inside conversations.

-- ── Conversations ────────────────────────────────────────────────────────────
create table public.conversations (
  id              uuid default uuid_generate_v4() primary key,
  product_id      uuid references public.products(id) on delete cascade not null,
  buyer_id        uuid references public.profiles(id) on delete cascade not null,
  seller_id       uuid references public.profiles(id) on delete cascade not null,
  last_message_at timestamptz default now(),
  created_at      timestamptz default now(),
  unique (product_id, buyer_id, seller_id)
);

create index on public.conversations(buyer_id);
create index on public.conversations(seller_id);
create index on public.conversations(last_message_at desc);

alter table public.conversations enable row level security;

create policy "Participants see own conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

create policy "Participants update conversation timestamp"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ── Messages ─────────────────────────────────────────────────────────────────
create table public.messages (
  id              uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  body            text not null check (length(trim(body)) > 0),
  read_at         timestamptz default null,
  created_at      timestamptz default now()
);

create index on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

create policy "Participants see messages"
  on public.messages for select
  using (
    auth.uid() in (
      select buyer_id  from public.conversations where id = conversation_id
      union
      select seller_id from public.conversations where id = conversation_id
    )
  );

create policy "Participants send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    auth.uid() in (
      select buyer_id  from public.conversations where id = conversation_id
      union
      select seller_id from public.conversations where id = conversation_id
    )
  );

-- ── Trigger: bump last_message_at on every new message ───────────────────────
create or replace function public.update_conversation_timestamp()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

create trigger on_message_sent
  after insert on public.messages
  for each row execute function public.update_conversation_timestamp();
