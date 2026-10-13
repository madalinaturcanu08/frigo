-- Frigo — starter shelf-life table.
-- These are STARTER values rounded from the USDA FoodKeeper guidance (foodsafety.gov/keep-food-safe/foodkeeper-app)
-- for opened/fresh products. Before the competition, check each row against FoodKeeper and ANSA Moldova (ansa.gov.md)
-- and replace `source` with the exact reference you used (plan section 8).

insert into public.shelf_life (category, storage, days, source) values
  ('dairy',      'fridge',   7,   'USDA FoodKeeper — starter value, verify'),
  ('dairy',      'freezer',  90,  'USDA FoodKeeper — starter value, verify'),
  ('cheese',     'fridge',   14,  'USDA FoodKeeper — starter value, verify'),
  ('cheese',     'freezer',  180, 'USDA FoodKeeper — starter value, verify'),
  ('eggs',       'fridge',   28,  'USDA FoodKeeper — starter value, verify'),
  ('eggs',       'pantry',   14,  'Frigo default — verify'),
  ('meat',       'fridge',   2,   'USDA FoodKeeper — starter value, verify'),
  ('meat',       'freezer',  120, 'USDA FoodKeeper — starter value, verify'),
  ('fish',       'fridge',   2,   'USDA FoodKeeper — starter value, verify'),
  ('fish',       'freezer',  180, 'USDA FoodKeeper — starter value, verify'),
  ('vegetables', 'fridge',   7,   'USDA FoodKeeper — starter value, verify'),
  ('vegetables', 'freezer',  240, 'USDA FoodKeeper — starter value, verify'),
  ('vegetables', 'pantry',   14,  'USDA FoodKeeper — starter value, verify'),
  ('fruit',      'fridge',   7,   'USDA FoodKeeper — starter value, verify'),
  ('fruit',      'freezer',  240, 'USDA FoodKeeper — starter value, verify'),
  ('fruit',      'pantry',   4,   'USDA FoodKeeper — starter value, verify'),
  ('bread',      'fridge',   7,   'USDA FoodKeeper — starter value, verify'),
  ('bread',      'freezer',  90,  'USDA FoodKeeper — starter value, verify'),
  ('bread',      'pantry',   4,   'USDA FoodKeeper — starter value, verify'),
  ('leftovers',  'fridge',   3,   'USDA FoodKeeper — starter value, verify'),
  ('leftovers',  'freezer',  90,  'USDA FoodKeeper — starter value, verify'),
  ('sauces',     'fridge',   30,  'USDA FoodKeeper — starter value, verify'),
  ('sauces',     'pantry',   180, 'USDA FoodKeeper — starter value, verify'),
  ('drinks',     'fridge',   7,   'USDA FoodKeeper — starter value, verify'),
  ('drinks',     'pantry',   180, 'Frigo default — verify'),
  ('other',      'fridge',   5,   'Frigo default — no specific guidance'),
  ('other',      'freezer',  60,  'Frigo default — no specific guidance'),
  ('other',      'pantry',   30,  'Frigo default — no specific guidance')
on conflict (category, storage) do update set days = excluded.days, source = excluded.source;

-- Profiles for accounts created before the on_auth_user_created trigger existed. Safe to run again.
insert into public.profiles (id, display_name, language)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)), coalesce(raw_user_meta_data ->> 'language', 'ro')
from auth.users
on conflict (id) do nothing;
