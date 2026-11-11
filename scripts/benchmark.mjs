// Session 12 benchmark (see docs/HYPOTHESIS.md): compares 5 ways of categorising receipt lines on
//   - REAL product names from Kaufland Moldova (labelled by the shop) — as printed and in receipt style,
//   - REAL products sold in Moldova from Open Food Facts (labelled by its community) — held out, never used for tuning,
//   - the 109 synthetic receipt lines (labelled by us).
// Writes docs/benchmarks/results.json, docs/benchmarks/RESULTS.md and SVG charts.
// Usage: npm run benchmark

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { FOOD_CATALOG } from '../src/lib/foodCatalog.ts';
import { AI_MODEL, HIGH, MEDIUM, bestMatch, combine, decodeVectors, encodeVectors, lineForAI, plain } from '../src/lib/aiMatch.ts';
import { parseReceipt } from '../src/lib/receipt.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs/benchmarks');
fs.mkdirSync(outDir, { recursive: true });
env.cacheDir = path.join(root, 'node_modules/.cache/transformers');

// ── test sets ───────────────────────────────────────────────────────────────────────────────────
// Frigo categories are finer than the shop's sections, so real products are scored by group.
const GROUP_OF = { vegetables: 'produce', fruit: 'produce', meat: 'meat', fish: 'fish', dairy: 'dairy', cheese: 'dairy', eggs: 'dairy', bread: 'bakery', drinks: 'drinks', other: 'pantry', sauces: 'pantry', leftovers: 'ready', nonfood: 'nonfood' };
// shop section → [gold group, groups that count as right]. Fixed before running (docs/HYPOTHESIS.md).
const SHOP = {
  'Legume, fructe, flori': ['produce', ['produce']],
  'Carne, mezeluri': ['meat', ['meat']],
  'Pește': ['fish', ['fish']],
  'Lactate, ouă': ['dairy', ['dairy']],
  'Delicatese, congelate': ['food', ['produce', 'meat', 'fish', 'dairy', 'bakery', 'pantry', 'ready']], // mixed section: only food vs not food is scored
  'Alimente de bază': ['pantry', ['pantry']],
  'Brutărie': ['bakery', ['bakery', 'pantry']],
  'Cafea și ceai': ['pantry', ['pantry', 'drinks']],
  'Dulciuri, snackuri': ['pantry', ['pantry']],
  'Băuturi': ['drinks', ['drinks']],
  'Cosmetice, îngrijire': ['nonfood', ['nonfood']],
  'Curățenie, detergenți': ['nonfood', ['nonfood']],
  'Animale': ['nonfood', ['nonfood']],
};
const receiptStyle = (s) => plain(s).toUpperCase().replace(/\s+/g, ' ').slice(0, 32).trim();

const real = JSON.parse(fs.readFileSync(path.join(root, 'content/real-products-kaufland.json'), 'utf8')).products.filter((p) => SHOP[p.shopCategory]);
const off = JSON.parse(fs.readFileSync(path.join(root, 'content/real-products-off.json'), 'utf8')).products;
const synthetic = JSON.parse(fs.readFileSync(path.join(root, 'content/receipt-lines-eval.json'), 'utf8')).lines;
const label = (category, food) => (food ? category : 'nonfood');

const SETS = {
  'real · as printed': real.map((p) => ({ text: `${p.name} ${p.brand}`, gold: SHOP[p.shopCategory][0], accept: SHOP[p.shopCategory][1], grouped: true })),
  'real · receipt style': real.map((p) => ({ text: receiptStyle(`${p.name} ${p.brand}`), gold: SHOP[p.shopCategory][0], accept: SHOP[p.shopCategory][1], grouped: true })),
  // held out: never looked at while improving the product list (version 2)
  'real held-out · Open Food Facts': off.map((p) => ({ text: receiptStyle(`${p.name} ${p.brand}`), gold: p.gold, accept: p.accept, grouped: true })),
  'synthetic (AI-written)': synthetic.map((l) => ({ text: l.line, gold: label(l.category, l.food), accept: [label(l.category, l.food)], grouped: false })),
};

// ── methods ─────────────────────────────────────────────────────────────────────────────────────
function dictionaryItem(text) {
  return parseReceipt(`${text} 10.00`)[0] ?? { raw: text, name: text, category: 'other', quantity: 1, unit: 'pcs', price: 10, food: true, confidence: 'medium' };
}
// 1. exact dictionary (session 7): known stems only, anything else becomes "other"
const exact = (t) => {
  const i = dictionaryItem(t);
  return { label: label(i.category, i.food) };
};

// 2. fuzzy dictionary: Levenshtein similarity between the line's words and every product name word
function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}
const nameWords = FOOD_CATALOG.map((p) => [p.ro, p.ru, p.en].flatMap((n) => plain(n).split(/[^\p{L}]+/u).filter((w) => w.length >= 3)));
const fuzzy = (t) => {
  const words = plain(lineForAI(t)).split(' ').filter((w) => w.length >= 3);
  let best = { score: 0, product: -1 };
  nameWords.forEach((ws, product) => {
    for (const w of words)
      for (const n of ws) {
        // receipts shorten words, so a word is also compared with the start of a name ("CASC" vs "cascaval")
        const target = w.length < n.length ? n.slice(0, Math.max(w.length, 3)) : n;
        const score = 1 - lev(w, target) / Math.max(w.length, target.length);
        if (score > best.score) best = { score, product };
      }
  });
  if (best.score < 0.75) return { label: 'other' };
  const p = FOOD_CATALOG[best.product];
  return { label: label(p.category, p.food !== false) };
};

// 3–5. embeddings
async function embedder(id, prefix) {
  const t0 = performance.now();
  const rssBefore = process.memoryUsage().rss;
  const model = await pipeline('feature-extraction', id, { dtype: 'q8', ...(id === AI_MODEL.id ? { revision: AI_MODEL.revision } : {}) });
  const loadMs = performance.now() - t0;
  const embed = async (texts) => (await model(texts.map((x) => prefix + x), { pooling: 'mean', normalize: true })).tolist();
  // the product list, squeezed to int8 exactly as shipped to phones
  const names = [];
  const owners = [];
  FOOD_CATALOG.forEach((p, i) => {
    for (const n of new Set([p.ro, plain(p.ro), p.ru, p.en].map((s) => s.toLowerCase()))) {
      names.push(n);
      owners.push(i);
    }
  });
  const raw = await embed(names);
  const vectors = decodeVectors(encodeVectors(raw), raw[0].length);
  return { embed, vectors, owners, loadMs, rssMB: (process.memoryUsage().rss - rssBefore) / 1e6 };
}

const pct = (x) => Math.round(x * 1000) / 10;
function macroF1(rows) {
  const labels = [...new Set(rows.flatMap((r) => [r.gold, r.pred]))].filter((l) => rows.some((r) => r.gold === l));
  const f1s = labels.map((l) => {
    const tp = rows.filter((r) => r.gold === l && r.pred === l).length;
    const fp = rows.filter((r) => r.gold !== l && r.pred === l).length;
    const fn = rows.filter((r) => r.gold === l && r.pred !== l).length;
    return tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
  });
  return f1s.reduce((a, b) => a + b, 0) / f1s.length;
}
/** compare a prediction (a Frigo label) with the gold answer; real products are compared by group */
function score(item, predLabel) {
  if (!item.grouped) return { gold: item.gold, pred: predLabel, ok: predLabel === item.gold };
  const group = GROUP_OF[predLabel];
  const ok = item.accept.includes(group);
  // for F1 a right answer counts as the gold group; a mixed "food" section is scored as food / not food
  return { gold: item.gold, pred: ok ? item.gold : item.gold === 'food' && group !== 'nonfood' ? 'food' : group, ok };
}

const results = { date: new Date().toISOString().slice(0, 10), machine: `${process.platform} ${process.arch}, Node ${process.version}`, sets: {}, speed: {}, thresholds: [] };
const models = {
  'MiniLM-L12 embeddings': await embedder('Xenova/paraphrase-multilingual-MiniLM-L12-v2', ''),
  'e5-small embeddings': await embedder(AI_MODEL.id, AI_MODEL.prefix),
};
const confusion = {};
const sweep = [];

for (const [setName, items] of Object.entries(SETS)) {
  const methods = {};
  const add = (name, preds) => {
    const rows = items.map((it, i) => score(it, preds[i].label));
    methods[name] = { accuracy: pct(rows.filter((r) => r.ok).length / rows.length), macroF1: pct(macroF1(rows)), rows };
  };
  add('1 exact dictionary', items.map((it) => exact(it.text)));
  add('2 fuzzy dictionary (Levenshtein)', items.map((it) => fuzzy(it.text)));
  for (const [name, m] of Object.entries(models)) {
    const q = await m.embed(items.map((it) => lineForAI(it.text) || it.text.toLowerCase()));
    const matches = q.map((v) => bestMatch(v, m.vectors, m.owners));
    add(`${name === 'e5-small embeddings' ? 4 : 3} ${name}`, matches.map((x) => ({ label: label(FOOD_CATALOG[x.product].category, FOOD_CATALOG[x.product].food !== false) })));
    if (name === 'e5-small embeddings') {
      // 5. Frigo: dictionary + e5 + confidence gating (combine())
      const hybrid = items.map((it, i) => {
        const p = FOOD_CATALOG[matches[i].product];
        const c = combine(dictionaryItem(it.text), { name: p.ro, category: p.category, food: p.food !== false, similarity: matches[i].similarity, confidence: matches[i].confidence, learned: false });
        return { label: label(c.category, c.food), confidence: matches[i].confidence, similarity: matches[i].similarity };
      });
      add('5 hybrid: dictionary + e5 + gating (Frigo)', hybrid);
      const rows = methods['5 hybrid: dictionary + e5 + gating (Frigo)'].rows;
      confusion[setName] = rows;
      items.forEach((_, i) => sweep.push({ set: setName, sim: matches[i].similarity, ok: score(items[i], label(FOOD_CATALOG[matches[i].product].category, FOOD_CATALOG[matches[i].product].food !== false)).ok }));
      const byConf = (c) => hybrid.map((h, i) => ({ h, r: rows[i] })).filter((x) => x.h.confidence === c);
      methods['5 hybrid: dictionary + e5 + gating (Frigo)'].byConfidence = Object.fromEntries(
        ['high', 'medium', 'low'].map((c) => [c, { n: byConf(c).length, accuracy: byConf(c).length ? pct(byConf(c).filter((x) => x.r.ok).length / byConf(c).length) : null }]),
      );
    }
  }
  for (const m of Object.values(methods)) delete m.rows;
  results.sets[setName] = { n: items.length, methods };
}

// threshold curve (e5 alone): for each cut-off, how many lines are kept and how many of those are right
for (let t = 0.8; t <= 0.995; t += 0.01) {
  const kept = sweep.filter((s) => s.sim >= t);
  results.thresholds.push({ threshold: Math.round(t * 100) / 100, coverage: pct(kept.length / sweep.length), precision: kept.length ? pct(kept.filter((s) => s.ok).length / kept.length) : null });
}

// speed: one line at a time (what the phone feels), and a whole receipt at once
for (const [name, m] of Object.entries(models)) {
  const lines = synthetic.slice(0, 40).map((l) => lineForAI(l.line));
  await m.embed(lines.slice(0, 3)); // warm up
  const t0 = performance.now();
  for (const l of lines) await m.embed([l]);
  const single = (performance.now() - t0) / lines.length;
  const t1 = performance.now();
  await m.embed(lines);
  const batch = (performance.now() - t1) / lines.length;
  results.speed[name] = { loadMs: Math.round(m.loadMs), msPerLineSingle: Math.round(single * 10) / 10, msPerLineBatch: Math.round(batch * 10) / 10, memoryMB: Math.round(m.rssMB) };
}
results.speed['fuzzy dictionary (Levenshtein)'] = (() => {
  const t0 = performance.now();
  for (const l of synthetic) fuzzy(l.line);
  return { msPerLineSingle: Math.round(((performance.now() - t0) / synthetic.length) * 10) / 10 };
})();
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1));
// the same kind of lines for the speed test that runs on phones (Settings → Receipt AI → speed test)
fs.writeFileSync(
  path.join(root, 'public/ai/benchmark-lines.json'),
  JSON.stringify([...synthetic.slice(0, 20).map((l) => l.line), ...real.slice(0, 20).map((p) => receiptStyle(`${p.name} ${p.brand}`))]),
);

// ── charts (plain SVG, readable in light and dark viewers) ─────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function confusionSvg(rows, title) {
  const labels = [...new Set(rows.flatMap((r) => [r.gold, r.pred]))].sort();
  const cell = 34;
  const left = 120;
  const top = 130;
  const W = left + labels.length * cell + 20;
  const H = top + labels.length * cell + 40;
  const max = Math.max(...labels.flatMap((g) => labels.map((p) => rows.filter((r) => r.gold === g && r.pred === p).length)));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="11"><rect width="100%" height="100%" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold">${esc(title)}</text>`;
  s += `<text x="${left + (labels.length * cell) / 2}" y="34" text-anchor="middle">predicted →</text><text x="12" y="${top + (labels.length * cell) / 2}" transform="rotate(-90 12 ${top + (labels.length * cell) / 2})" text-anchor="middle">true (answer key) →</text>`;
  labels.forEach((l, i) => {
    s += `<text x="${left + i * cell + cell / 2}" y="${top - 6}" transform="rotate(-55 ${left + i * cell + cell / 2} ${top - 6})">${esc(l)}</text>`;
    s += `<text x="${left - 6}" y="${top + i * cell + cell / 2 + 4}" text-anchor="end">${esc(l)}</text>`;
  });
  labels.forEach((g, i) =>
    labels.forEach((p, j) => {
      const n = rows.filter((r) => r.gold === g && r.pred === p).length;
      const a = n / max;
      const fill = i === j ? `rgba(70,150,60,${0.12 + a * 0.88})` : n ? `rgba(220,60,40,${0.15 + a * 0.85})` : '#f4f4f4';
      s += `<rect x="${left + j * cell}" y="${top + i * cell}" width="${cell - 2}" height="${cell - 2}" fill="${fill}"/>`;
      if (n) s += `<text x="${left + j * cell + cell / 2 - 1}" y="${top + i * cell + cell / 2 + 4}" text-anchor="middle" fill="${a > 0.55 ? '#fff' : '#121212'}">${n}</text>`;
    }),
  );
  return s + '</svg>';
}
function thresholdSvg(points) {
  const W = 560, H = 320, L = 50, R = 20, T = 30, B = 45;
  const x = (t) => L + ((t - 0.8) / 0.19) * (W - L - R);
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="11"><rect width="100%" height="100%" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold">Confidence threshold: how many lines kept vs how many right</text>`;
  for (const v of [0, 25, 50, 75, 100]) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e5e5"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  for (const t of [0.8, 0.85, 0.9, 0.95]) s += `<text x="${x(t)}" y="${H - B + 16}" text-anchor="middle">${t.toFixed(2)}</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">similarity threshold</text>`;
  for (const [t, name] of [[MEDIUM, 'not sure ≥ ' + MEDIUM], [HIGH, 'sure ≥ ' + HIGH]]) s += `<line x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${H - B}" stroke="#999" stroke-dasharray="4 3"/><text x="${x(t) + 4}" y="${T + 12}" fill="#555">${name}</text>`;
  const line = (key, color) => `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${points.filter((p) => p[key] !== null).map((p) => `${x(p.threshold)},${y(p[key])}`).join(' ')}"/>`;
  s += line('precision', '#3c8c2e') + line('coverage', '#2f6fbf');
  s += `<rect x="${W - 190}" y="${H - B - 46}" width="12" height="3" fill="#3c8c2e"/><text x="${W - 172}" y="${H - B - 42}">right among kept (precision)</text>`;
  s += `<rect x="${W - 190}" y="${H - B - 28}" width="12" height="3" fill="#2f6fbf"/><text x="${W - 172}" y="${H - B - 24}">lines kept (coverage)</text>`;
  return s + '</svg>';
}
function barsSvg() {
  const sets = Object.keys(results.sets);
  const methods = Object.keys(results.sets[sets[0]].methods);
  const colors = ['#b9b9b9', '#8c8c8c', '#7fb0e0', '#2f6fbf', '#3c8c2e'];
  const W = 760, H = 340, L = 50, T = 30, B = 70, gw = (W - L - 20) / sets.length, bw = (gw - 30) / methods.length;
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="11"><rect width="100%" height="100%" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" font-weight="bold">Macro F1 by method (higher is better)</text>`;
  for (const v of [0, 25, 50, 75, 100]) s += `<line x1="${L}" x2="${W - 20}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e5e5"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  sets.forEach((set, i) => {
    methods.forEach((m, j) => {
      const v = results.sets[set].methods[m].macroF1;
      const bx = L + i * gw + 15 + j * bw;
      s += `<rect x="${bx}" y="${y(v)}" width="${bw - 3}" height="${y(0) - y(v)}" fill="${colors[j]}"/><text x="${bx + (bw - 3) / 2}" y="${y(v) - 3}" text-anchor="middle" font-size="9">${Math.round(v)}</text>`;
    });
    s += `<text x="${L + i * gw + gw / 2}" y="${y(0) + 16}" text-anchor="middle">${esc(set)} (n=${results.sets[set].n})</text>`;
  });
  methods.forEach((m, j) => (s += `<rect x="${L + (j % 3) * 195}" y="${H - 34 + Math.floor(j / 3) * 16}" width="10" height="10" fill="${colors[j]}"/><text x="${L + (j % 3) * 195 + 14}" y="${H - 25 + Math.floor(j / 3) * 16}">${esc(m)}</text>`));
  return s + '</svg>';
}
fs.writeFileSync(path.join(outDir, 'methods.svg'), barsSvg());
fs.writeFileSync(path.join(outDir, 'thresholds.svg'), thresholdSvg(results.thresholds));
fs.writeFileSync(path.join(outDir, 'confusion-real.svg'), confusionSvg(confusion['real · receipt style'], 'Frigo (hybrid) on real Kaufland products, receipt style'));
fs.writeFileSync(path.join(outDir, 'confusion-heldout.svg'), confusionSvg(confusion['real held-out · Open Food Facts'], 'Frigo (hybrid) on held-out Open Food Facts products'));
fs.writeFileSync(path.join(outDir, 'confusion-synthetic.svg'), confusionSvg(confusion['synthetic (AI-written)'], 'Frigo (hybrid) on synthetic receipt lines'));

// ── console summary ─────────────────────────────────────────────────────────────────────────────
for (const [set, r] of Object.entries(results.sets)) {
  console.log(`\n${set} (n=${r.n})`);
  console.table(Object.fromEntries(Object.entries(r.methods).map(([m, v]) => [m, { accuracy: v.accuracy, macroF1: v.macroF1 }])));
  console.log('hybrid by confidence:', JSON.stringify(r.methods['5 hybrid: dictionary + e5 + gating (Frigo)'].byConfidence));
}
console.table(results.speed);
console.table(results.thresholds.filter((t) => [0.8, 0.84, 0.86, 0.88, 0.9, 0.92, 0.95].includes(t.threshold)));
