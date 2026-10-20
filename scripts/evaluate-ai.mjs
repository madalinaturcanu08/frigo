// Session 8 test: how well does the on-device AI turn receipt lines the dictionary doesn't know into fridge items?
// Runs the same model the browser runs (Transformers.js) on content/receipt-lines-eval.json and compares it
// with the session 7 dictionary. Also writes public/ai/catalog.json (the product names, already turned into vectors).
// Usage: npm run test:ai [-- --show] [-- --model Xenova/...]   ·   npm run ai:catalog (after editing src/lib/foodCatalog.ts)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { FOOD_CATALOG, catalogFingerprint } from '../src/lib/foodCatalog.ts';
import { AI_MODEL, bestMatch, decodeVectors, encodeVectors, lineForAI, plain } from '../src/lib/aiMatch.ts';
import { parseReceipt } from '../src/lib/receipt.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const modelId = process.argv.includes('--model') ? arg('--model') : AI_MODEL.id;
const isDefault = modelId === AI_MODEL.id;
const prefix = modelId.includes('e5') ? 'query: ' : '';
const show = process.argv.includes('--show');

// Keep the downloaded model out of the project folder.
env.cacheDir = path.join(root, 'node_modules/.cache/transformers');
const embed = await pipeline('feature-extraction', modelId, { dtype: 'q8', ...(isDefault ? { revision: AI_MODEL.revision } : {}) });
const vectorsOf = async (texts) => (await embed(texts.map((t) => prefix + t), { pooling: 'mean', normalize: true })).tolist();

// ── the catalog: every product under its Romanian (with and without diacritics), Russian and English name
const names = [];
const owners = [];
FOOD_CATALOG.forEach((p, i) => {
  for (const n of new Set([p.ro, plain(p.ro), p.ru, p.en].map((s) => s.toLowerCase()))) {
    names.push(n);
    owners.push(i);
  }
});
const t0 = Date.now();
const raw = await vectorsOf(names);
console.log(`${modelId}: ${names.length} product names → vectors in ${Date.now() - t0} ms`);
// What the browser gets: vectors squeezed to int8 — test with exactly those so the score is honest.
const encoded = encodeVectors(raw);
const catalog = decodeVectors(encoded, raw[0].length);

if (isDefault) {
  const out = path.join(root, 'public/ai/catalog.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify({ model: AI_MODEL.id, revision: AI_MODEL.revision, catalog: catalogFingerprint(), dims: raw[0].length, owners, vectors: encoded }),
  );
  console.log(`wrote public/ai/catalog.json (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}
if (process.argv.includes('--catalog-only')) process.exit(0);

// ── the test
const { lines } = JSON.parse(fs.readFileSync(path.join(root, 'content/receipt-lines-eval.json'), 'utf8'));
const t1 = Date.now();
const queries = await vectorsOf(lines.map((l) => lineForAI(l.line)));
const msPerLine = (Date.now() - t1) / lines.length;

const rows = lines.map((l, i) => {
  const hard = !!l.hard;
  const m = bestMatch(queries[i], catalog, owners);
  const p = FOOD_CATALOG[m.product];
  // what the session 7 dictionary does with the same line (a price is added so it counts as a product line)
  const dict = parseReceipt(`${l.line} 10.00`)[0];
  const dictKnows = dict && dict.confidence === 'high';
  return {
    line: l.line,
    hard,
    ai: p.en,
    sim: m.similarity,
    margin: m.margin,
    confidence: m.confidence,
    productOk: l.en.split('|').includes(p.en),
    categoryOk: p.category === l.category && (p.food !== false) === l.food,
    dictKnows,
    dictOk: dictKnows && dict.category === l.category && dict.food === l.food,
  };
});

if (show) {
  console.table(
    rows.map((r) => ({ line: r.line, ai: r.ai, sim: r.sim.toFixed(3), margin: r.margin.toFixed(3), conf: r.confidence, ok: r.categoryOk ? '✓' : '✗' })),
  );
}

const pct = (a, b) => (b ? `${a}/${b} (${Math.round((a / b) * 100)}%)` : '—');
function summary(list) {
  const n = (f, l = list) => l.filter(f).length;
  const by = (c) => list.filter((r) => r.confidence === c);
  return {
    'dictionary alone: right category': pct(n((r) => r.dictOk), list.length),
    'dictionary alone: confidently wrong': pct(n((r) => r.dictKnows && !r.dictOk), list.length),
    'AI: right product': pct(n((r) => r.productOk), list.length),
    'AI: right category + food/not food': pct(n((r) => r.categoryOk), list.length),
    'AI high confidence → right': pct(n((r) => r.categoryOk, by('high')), by('high').length),
    'AI medium confidence → right': pct(n((r) => r.categoryOk, by('medium')), by('medium').length),
    'AI low confidence (guess not shown) → would be right': pct(n((r) => r.categoryOk, by('low')), by('low').length),
  };
}
console.table({ everyday: summary(rows.filter((r) => !r.hard)), hard: summary(rows.filter((r) => r.hard)), all: summary(rows) });
console.log(`time per line on this computer: ${msPerLine.toFixed(1)} ms`);
