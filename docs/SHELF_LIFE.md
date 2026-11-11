# Shelf-life table — verified against USDA FoodKeeper

When an item has no date, Frigo estimates one from this table (category × storage place) and marks it "~".

**Source:** USDA FSIS FoodKeeper data, version 128 (2018-09-06), file https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json as archived by the Internet Archive on 2023-11-10 (https://web.archive.org/web/20231110203616/https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json). US government work, public domain. Only the products Frigo cites are kept here.

**Rule:** for each row we took the products most often found in a Moldovan fridge, looked up their official
FoodKeeper times, and used the **shortest minimum**: the safest choice, because a guessed date that is too long could
make someone eat spoiled food. The user can always change a date. Reproduce with `npm run verify:shelf-life`.

**ANSA Moldova:** we did not find a public household storage-time table from ANSA (ansa.gov.md) to compare with. *To check
by the team:* search ansa.gov.md and add any official Moldovan values here.

| Category | Storage | Before (starter) | Verified | FoodKeeper products used (ID: official time) |
|---|---|---|---|---|
| dairy | fridge | 7 d | **7 d** | #33 Yogurt: 1–2 weeks<br>#25 Kefir (fermented milk): 1 weeks<br>#2 Buttermilk: 1–2 weeks<br>#543 Milk (lactose-free): 1 weeks after opening |
| dairy | freezer | 90 d | **90 d** | #27 Milk (plain or flavored): 3 months<br>#2 Buttermilk: 3 months<br>#1 Butter: 6–9 months |
| cheese | fridge | 14 d | **7 d** | #7 Cheese (soft such as brie, bel paese, goat): 1–2 weeks<br>#9 Cottage cheese: 2 weeks<br>#10 Cream cheese: 2 weeks<br>#546 Quark (fresh cheese): 7–10 days<br>#3 Cheese (hard such as cheddar, swiss, block parmesan): 6 months |
| cheese | freezer | 180 d | **90 d** | #7 Cheese (soft such as brie, bel paese, goat): 6 months<br>#3 Cheese (hard such as cheddar, swiss, block parmesan): 6 months<br>#5 Cheese (shredded; cheddar, mozzarella, etc.): 3–4 months |
| eggs | fridge | 28 d | **21 d** | #21 Eggs (in shell): 3–5 weeks |
| eggs | pantry | 14 d | **14 d** | FoodKeeper (US) only gives refrigerated times for eggs. In Moldova eggs are sold unrefrigerated; 14 days is a Frigo default, below the 28-day best-before used in the EU. |
| meat | fridge | 2 d | **1 d** | #43 Beef (ground): 1–2 days<br>#73 Pork (ground): 1–2 days<br>#113 Chicken (whole): 1–2 days<br>#117 Chicken parts (breast halves, boneless): 1–2 days<br>#102 Sausage (raw bulk type or patties): 1–2 days |
| meat | freezer | 120 d | **30 d** | #43 Beef (ground): 3–4 months<br>#73 Pork (ground): 3–4 months<br>#117 Chicken parts (breast halves, boneless): 9 months<br>#102 Sausage (raw bulk type or patties): 1–2 months |
| fish | fridge | 2 d | **1 d** | #144 Lean fish (cod, flounder, haddock, halibut, sole, etc.): 1–2 days<br>#146 Fatty fish (bluefish, catfish, mackerel, mullet, salmon, tuna, etc.): 1–2 days |
| fish | freezer | 180 d | **60 d** | #144 Lean fish (cod, flounder, haddock, halibut, sole, etc.): 6–8 months<br>#146 Fatty fish (bluefish, catfish, mackerel, mullet, salmon, tuna, etc.): 2–3 months |
| vegetables | fridge | 7 d | **3 d** | #283 Cucumbers: 4–6 days<br>#296 Peppers: 4–14 days<br>#278 Cabbage: 1–2 weeks<br>#279 Carrots, parsnips: 2–3 weeks<br>#291 Lettuce (leaf, spinach): 3–7 days<br>#600 Cherry tomatoes: 5 days |
| vegetables | freezer | 240 d | **180 d** | #279 Carrots, parsnips: 10–12 months<br>#278 Cabbage: 10–12 months<br>#296 Peppers: 6–8 months<br>#294 Onions (yellow, white, red, etc.): 10–12 months<br>#297 Potatoes: 10–12 months |
| vegetables | pantry | 14 d | **10 d** | #297 Potatoes: 1–2 months<br>#294 Onions (yellow, white, red, etc.): 1 months<br>#600 Cherry tomatoes: 10 days |
| fruit | fridge | 7 d | **2 d** | #248 Apples: 4–6 weeks<br>#251 Bananas: 3 days<br>#252 Berries (cherries, goose berries, lychee): 7 days<br>#481 Strawberries: 2–3 days |
| fruit | freezer | 240 d | **60 d** | #252 Berries (cherries, goose berries, lychee): 12 months<br>#481 Strawberries: 8–12 months<br>#251 Bananas: 2–3 months |
| fruit | pantry | 4 d | **4 d** | FoodKeeper gives no pantry time for fresh fruit (only "when ripe"); 4 days is a Frigo default. |
| bread | fridge | 7 d | **14 d** | #195 Commercial bread products (including pan breads, flat breads, rolls, and buns): 2–3 weeks after opening |
| bread | freezer | 90 d | **90 d** | #195 Commercial bread products (including pan breads, flat breads, rolls, and buns): 3–5 months<br>#461 Whole wheat bread (commercially baked & pre-sliced): 3 months |
| bread | pantry | 4 d | **3 d** | #461 Whole wheat bread (commercially baked & pre-sliced): 3–5 days<br>#574 Bread (homemade): 3–5 days<br>#195 Commercial bread products (including pan breads, flat breads, rolls, and buns): 14–18 days |
| leftovers | fridge | 3 d | **3 d** | #173 Leftovers (with meat, fish, poultry, or egg): 3–4 days<br>#174 Leftovers (without meat, fish, poultry, or egg (such as cooked vegitables, rice, or potatoes)): 3–4 days |
| leftovers | freezer | 90 d | **30 d** | #173 Leftovers (with meat, fish, poultry, or egg): 2–3 months<br>#174 Leftovers (without meat, fish, poultry, or egg (such as cooked vegitables, rice, or potatoes)): 1–2 months |
| sauces | fridge | 30 d | **5 d** | #348 Ketchup, cocktail, or chili sauce: 6 months after opening<br>#350 Mayonnaise (commercial): 2 months after opening<br>#351 Mustard: 1 years after opening<br>#347 Jams, jellies, and preserves: 6–12 months after opening<br>#353 Pickles: 1–3 months after opening<br>#373 Canned goods (high acid (such as juices, fruit, pickles, sauerkraut, tomato soup, and foods in vinegar-based sauce)): 5–7 days after opening |
| sauces | pantry | 180 d | **90 d** | #350 Mayonnaise (commercial): 3–6 months<br>#347 Jams, jellies, and preserves: 6–18 months<br>#351 Mustard: 1–2 years<br>#353 Pickles: 1 years<br>#373 Canned goods (high acid (such as juices, fruit, pickles, sauerkraut, tomato soup, and foods in vinegar-based sauce)): 12–18 months |
| drinks | fridge | 7 d | **7 d** | #404 Fruit Juice in cartons, fruit drinks, punch: 8–12 days after opening<br>#455 Orange juice (commercially packaged carton): 7–10 days after opening |
| drinks | pantry | 180 d | **360 d** | #373 Canned goods (high acid (such as juices, fruit, pickles, sauerkraut, tomato soup, and foods in vinegar-based sauce)): 12–18 months |
| other | fridge | 5 d | **5 d** | Too varied for one FoodKeeper product; Frigo default. |
| other | freezer | 60 d | **60 d** | Too varied for one FoodKeeper product; Frigo default. |
| other | pantry | 30 d | **30 d** | Too varied for one FoodKeeper product; Frigo default. |
