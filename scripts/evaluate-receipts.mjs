// Session 7 receipt test: reads every fake receipt with Tesseract.js (the same OCR that runs in the browser)
// and compares the result with the answer key in content/test-receipts.json.
// Usage: node scripts/evaluate-receipts.mjs [--show] [--save]   (--show prints what the OCR read)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { receipts } = JSON.parse(fs.readFileSync(path.join(root, 'content/test-receipts.json'), 'utf8'));
const show = process.argv.includes('--show');
// --save keeps what the OCR read, so the receipt parser can be unit-tested without running OCR (tests/fixtures/ocr).
const save = process.argv.includes('--save');
const fixtures = path.join(root, 'tests/fixtures/ocr');
if (save) fs.mkdirSync(fixtures, { recursive: true });

const norm = (s) => s.toUpperCase().replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
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
/** 1 = identical, 0 = nothing alike */
const similarity = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

// Keep downloaded reading models out of the project folder.
const worker = await createWorker(['ron', 'rus', 'eng'], 1, { cachePath: path.join(root, 'node_modules/.cache/tesseract') });
const rows = [];
for (const r of receipts) {
  const { data } = await worker.recognize(path.join(root, `public/demo-receipts/${r.id}.jpg`));
  const ocrLines = data.text.split('\n').map(norm).filter(Boolean);
  if (show) console.log(`\n── ${r.id}\n${ocrLines.join('\n')}`);
  if (save) fs.writeFileSync(path.join(fixtures, `${r.id}.txt`), `${data.text.trim()}\n# confidence ${Math.round(data.confidence)}\n`);

  // For each printed product name: how close is the best OCR line? Is its price readable anywhere?
  const names = r.lines.map(([name, , sum]) => {
    const best = Math.max(...ocrLines.map((l) => similarity(norm(name), l.slice(0, norm(name).length + 4))));
    const price = sum.replace(/\s*[AB]$/, '');
    return { best, priceFound: data.text.includes(price) };
  });
  const avg = names.reduce((a, n) => a + n.best, 0) / names.length;
  rows.push({
    receipt: r.id,
    look: r.look.label,
    'name accuracy': `${Math.round(avg * 100)}%`,
    'names ≥80% right': `${names.filter((n) => n.best >= 0.8).length}/${names.length}`,
    'prices read': `${names.filter((n) => n.priceFound).length}/${names.length}`,
    confidence: Math.round(data.confidence),
  });
}
await worker.terminate();
console.table(rows);
