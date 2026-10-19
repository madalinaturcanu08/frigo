-- Frigo — session 5: remember the pack size of products in the shared barcode cache.
-- Run in the Supabase SQL editor after 0001_init.sql. Safe to run twice.

alter table public.products add column if not exists pack_quantity numeric check (pack_quantity is null or pack_quantity > 0);
alter table public.products add column if not exists pack_unit text check (pack_unit is null or pack_unit in ('pcs', 'g', 'kg', 'ml', 'l', 'pack'));
-- where the row came from: typed by a Frigo user, or copied from Open Food Facts
alter table public.products add column if not exists source text not null default 'user' check (source in ('user', 'off'));
