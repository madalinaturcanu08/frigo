// Held-out REAL test set: products sold in Moldova from Open Food Facts (open database, ODbL licence), with the
// categories its community gave them. Nothing here was written or labelled by us, and it was never looked at while
// improving Frigo's product list. The rules below (Open Food Facts category → group) were fixed before testing.
// Output: content/real-products-off.json. Usage: npm run collect:off

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIELDS = 'code,product_name,product_name_ro,product_name_ru,categories_tags,brands';

// First rule that matches wins: [gold group, groups that count as right, tags]
const RULES = [
  ['nonfood', ['nonfood'], ['en:non-food-products', 'en:open-beauty-facts', 'en:open-pet-food-facts', 'en:pet-food']],
  ['skip', [], ['en:dietary-supplements']],
  ['pantry', ['pantry', 'drinks'], ['en:coffees', 'en:teas', 'en:hot-beverages', 'en:instant-beverages']],
  ['drinks', ['drinks'], ['en:alcoholic-beverages', 'en:beverages', 'en:waters', 'en:juices', 'en:sodas', 'en:beverages-and-beverages-preparations']],
  ['dairy', ['dairy'], ['en:dairies', 'en:milks', 'en:yogurts', 'en:cheeses', 'en:eggs', 'en:butters']],
  ['meat', ['meat'], ['en:meats', 'en:sausages', 'en:hams', 'en:prepared-meats']],
  ['fish', ['fish'], ['en:seafood', 'en:fishes', 'en:canned-fishes']],
  ['bakery', ['bakery', 'pantry'], ['en:breads', 'en:viennoiseries', 'en:pastries']],
  ['produce', ['produce', 'pantry'], ['en:canned-vegetables', 'en:canned-fruits', 'en:legumes']],
  ['produce', ['produce'], ['en:fresh-vegetables', 'en:fresh-fruits', 'en:vegetables', 'en:fruits']],
  ['ready', ['ready', 'pantry'], ['en:meals', 'en:dumplings', 'en:soups']],
  ['pantry', ['pantry'], ['en:snacks', 'en:sweet-snacks', 'en:salty-snacks', 'en:confectioneries', 'en:biscuits', 'en:chocolates', 'en:cereals-and-their-products', 'en:breakfast-cereals', 'en:pastas', 'en:condiments', 'en:sauces', 'en:spreads', 'en:canned-foods', 'en:desserts', 'en:frozen-desserts', 'en:sweeteners', 'en:fats', 'en:vegetable-oils', 'en:flours', 'en:groceries']],
];

const all = [];
for (let page = 1; page <= 20; page++) {
  const url = `https://search.openfoodfacts.org/search?q=countries_tags:%22en:moldova%22&page_size=100&page=${page}&fields=${FIELDS}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Frigo/1.0 (school research project)' } });
  if (!res.ok) throw new Error(`${res.status} on page ${page}`);
  const { hits, page_count } = await res.json();
  all.push(...hits);
  if (page >= page_count) break;
  await new Promise((r) => setTimeout(r, 800)); // be polite
}

const products = [];
for (const p of all) {
  const name = (p.product_name_ro || p.product_name_ru || p.product_name || '').trim();
  const tags = p.categories_tags ?? [];
  if (name.length < 3 || !tags.length) continue;
  const rule = RULES.find(([, , ts]) => ts.some((t) => tags.includes(t)));
  if (!rule || rule[0] === 'skip') continue;
  const brand = (Array.isArray(p.brands) ? p.brands[0] : String(p.brands ?? '').split(',')[0])?.trim() ?? '';
  products.push({ code: p.code, name, brand, gold: rule[0], accept: rule[1], offCategories: tags.filter((t) => t.startsWith('en:')).slice(0, 4) });
}

fs.writeFileSync(
  path.join(root, 'content/real-products-off.json'),
  JSON.stringify(
    {
      _note:
        'Held-out real test set: products sold in Moldova from Open Food Facts (openfoodfacts.org, ODbL), categories by its community, mapped to groups by fixed rules in scripts/collect-off.mjs. Not used while improving Frigo.',
      collected: new Date().toISOString().slice(0, 10),
      products,
    },
    null,
    1,
  ),
);
const counts = {};
for (const p of products) counts[p.gold] = (counts[p.gold] ?? 0) + 1;
console.log(`${all.length} products in Moldova, ${products.length} usable`);
console.table(counts);
