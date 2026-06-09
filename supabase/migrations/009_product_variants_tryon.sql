-- Product variants: size (UK + US), color, quantity per SKU
create table if not exists product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  size_label    text,           -- 'UK 10', 'US 8', 'M', 'XL', etc.
  size_system   text,           -- 'uk' | 'us' | 'generic' | 'shoe_uk' | 'shoe_us'
  color_name    text,           -- e.g. 'Black', 'Sky Blue'
  color_hex     text,           -- e.g. '#000000'
  quantity      int not null default 1 check (quantity >= 0),
  created_at    timestamptz default now()
);

-- Virtual try-on columns on products table
alter table products
  add column if not exists virtual_tryon_enabled boolean default false,
  add column if not exists tryon_image_url        text;

-- Indexes
create index if not exists product_variants_product_id_idx on product_variants(product_id);

-- RLS
alter table product_variants enable row level security;

-- Anyone can read variants
create policy "variants_public_read"
  on product_variants for select
  using (true);

-- Sellers can manage their own product variants
create policy "variants_seller_insert"
  on product_variants for insert
  with check (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.seller_id = auth.uid()
    )
  );

create policy "variants_seller_update"
  on product_variants for update
  using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.seller_id = auth.uid()
    )
  );

create policy "variants_seller_delete"
  on product_variants for delete
  using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.seller_id = auth.uid()
    )
  );
