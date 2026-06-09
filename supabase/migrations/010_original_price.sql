-- Add original_price to products for discount display on product cards
-- When set, the card shows a strikethrough price and a discount % badge.

alter table products
  add column if not exists original_price numeric(12,2) default null;

comment on column products.original_price is
  'Pre-discount price. When set and greater than price, the product card shows a discount badge and strikethrough price.';
