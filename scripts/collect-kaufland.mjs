// Collects REAL Moldovan product names, with the shop's own category, from Kaufland Moldova's public offers pages
// (kaufland.md robots.txt allows this; a handful of requests). Used to test the receipt AI on real data that was
// NOT written or labelled by us. Output: content/real-products-kaufland.json (date and source URL kept).
// Usage: node scripts/collect-kaufland.mjs   (run again on another week to grow the set; products are merged)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'content/real-products-kaufland.json');
const PAGES = [
  'https://www.kaufland.md/ro/oferte/oferte-saptamanale/saptamana-curenta.html',
  'https://www.kaufland.md/ro/oferte/oferta-weekend.html',
  'https://www.kaufland.md/ro/oferte/prezentare-generala-oferte.html',
];

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!--.*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const existing = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')).products : [];
const byKey = new Map(existing.map((p) => [`${p.brand}|${p.name}`, p]));
const today = new Date().toISOString().slice(0, 10);

for (const url of PAGES) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (school research project Frigo)' } });
  if (!res.ok) {
    console.log(`${url}: ${res.status}`);
    continue;
  }
  const html = await res.text();
  // The page is split into sections, each with the shop's category in an <h2>, followed by product tiles.
  const sections = html.split('class="k-product-section ').slice(1);
  let found = 0;
  for (const section of sections) {
    const category = decode(section.match(/<h2 class="k-product-section__headline(?:_elem)?">([^<]*)<\/h2>/)?.[1] ?? '');
    if (!category || /oferte actuale|card xtra/i.test(category)) continue; // mixed "top offers" sections have no single category
    const titles = [...section.matchAll(/k-product-tile__title[^>]*>([^<]*)</g)].map((m) => decode(m[1]));
    const subtitles = [...section.matchAll(/k-product-tile__subtitle[^>]*>([\s\S]*?)<\/div>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, ' ')));
    titles.forEach((brand, i) => {
      const name = subtitles[i] ?? '';
      if (!name) return;
      const key = `${brand}|${name}`;
      if (!byKey.has(key)) {
        byKey.set(key, { brand, name, shopCategory: category, source: url, collected: today });
        found++;
      }
    });
  }
  console.log(`${url}: ${found} new products`);
}

const products = [...byKey.values()];
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      _note:
        'Real product names and categories from Kaufland Moldova public offer pages (kaufland.md), collected with scripts/collect-kaufland.mjs. The category is the shop’s own section, not chosen by us. Used only to test Frigo’s receipt AI (school research).',
      products,
    },
    null,
    1,
  ),
);
const counts = {};
for (const p of products) counts[p.shopCategory] = (counts[p.shopCategory] ?? 0) + 1;
console.log(products.length, 'products');
console.table(counts);
