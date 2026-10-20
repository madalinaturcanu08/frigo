-- Frigo — session 6: details the recipe screens need. Run after 0002. Safe to run twice.

-- stable id for each recipe, so supabase/recipes.sql can be re-run to update recipes in place
alter table public.recipes add column if not exists slug text unique;
alter table public.recipes add column if not exists minutes integer check (minutes is null or minutes > 0);
alter table public.recipes add column if not exists servings integer check (servings is null or servings > 0);
alter table public.recipes add column if not exists emoji text;

-- how an ingredient is shown ("brânză", "брынза", "cheese");
-- `keyword` holds comma-separated name stems matched against fridge item names (lowercase, no diacritics)
alter table public.recipe_ingredients add column if not exists label_ro text;
alter table public.recipe_ingredients add column if not exists label_ru text;
alter table public.recipe_ingredients add column if not exists label_en text;
alter table public.recipe_ingredients add column if not exists position integer not null default 0;
