-- Frigo — initial schema (session 1)
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- Every table has Row Level Security: a user only ever sees their own rows.
-- Shared reference tables (shelf_life, products, recipes) are readable by any signed-in user.

-- ─────────────────────────────────────────────── profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  language text not null default 'ro' check (language in ('ro', 'ru', 'en')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'language', 'ro')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────── shelf_life (reference)
create table public.shelf_life (
  category text not null,
  storage text not null check (storage in ('fridge', 'freezer', 'pantry')),
  days integer not null check (days > 0),
  source text not null,
  primary key (category, storage)
);

alter table public.shelf_life enable row level security;
create policy "shelf_life: read for signed-in" on public.shelf_life
  for select to authenticated using (true);

-- ─────────────────────────────────────────────── fridge_items
create table public.fridge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  storage text not null default 'fridge' check (storage in ('fridge', 'freezer', 'pantry')),
  price_lei numeric(10, 2) check (price_lei is null or price_lei >= 0),
  added_at timestamptz not null default now(),
  expires_at date not null,
  expiry_estimated boolean not null default false,
  status text not null default 'active' check (status in ('active', 'eaten', 'wasted')),
  closed_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'barcode', 'receipt')),
  -- closed_at is set exactly when the item is no longer active
  constraint closed_matches_status check ((status = 'active') = (closed_at is null))
);

create index fridge_items_user_status_idx on public.fridge_items (user_id, status, expires_at);
create index fridge_items_user_closed_idx on public.fridge_items (user_id, closed_at);

alter table public.fridge_items enable row level security;

create policy "fridge_items: read own" on public.fridge_items
  for select using (auth.uid() = user_id);
create policy "fridge_items: insert own" on public.fridge_items
  for insert with check (auth.uid() = user_id);
create policy "fridge_items: update own" on public.fridge_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fridge_items: delete own" on public.fridge_items
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────── products (shared barcode cache, session 5)
create table public.products (
  barcode text primary key,
  name text not null,
  category text not null,
  default_shelf_days integer check (default_shelf_days is null or default_shelf_days > 0),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "products: read for signed-in" on public.products
  for select to authenticated using (true);
create policy "products: insert for signed-in" on public.products
  for insert to authenticated with check (created_by = auth.uid());

-- ─────────────────────────────────────────────── recipes (session 6)
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title_ro text not null,
  title_ru text not null,
  title_en text not null,
  steps_ro text not null,
  steps_ru text not null,
  steps_en text not null,
  source_note text
);

create table public.recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  category text,
  keyword text,
  optional boolean not null default false,
  check (category is not null or keyword is not null)
);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
create policy "recipes: read for signed-in" on public.recipes
  for select to authenticated using (true);
create policy "recipe_ingredients: read for signed-in" on public.recipe_ingredients
  for select to authenticated using (true);

-- ─────────────────────────────────────────────── receipt_corrections (session 8)
create table public.receipt_corrections (
  id bigint generated always as identity primary key,
  raw_text text not null,
  corrected_name text not null,
  corrected_category text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.receipt_corrections enable row level security;
create policy "receipt_corrections: read own" on public.receipt_corrections
  for select using (auth.uid() = user_id);
create policy "receipt_corrections: insert own" on public.receipt_corrections
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────── push_subscriptions (session 4)
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: read own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
