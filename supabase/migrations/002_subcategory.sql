-- Migration 002: Add subcategory to products
alter table public.products add column if not exists subcategory text;
