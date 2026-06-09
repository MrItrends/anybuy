-- Migration 005: Add negotiation_floor to products
-- Sellers set the minimum price they will accept so offers are auto-approved instantly.

alter table public.products
  add column if not exists negotiation_floor numeric(12,2) default null;

-- A check constraint: when set, floor must be less than price and at least ₦100
alter table public.products
  add constraint negotiation_floor_valid
    check (
      negotiation_floor is null
      or (negotiation_floor >= 100 and negotiation_floor < price)
    );

comment on column public.products.negotiation_floor is
  'Minimum price the seller will auto-accept. Null means the full price only (no negotiation floor set even if is_negotiable = true). Any buyer offer >= this value is automatically accepted without seller review.';
