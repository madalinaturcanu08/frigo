// Draws the fake receipts from content/test-receipts.json and photographs them in a headless browser,
// degraded like real phone photos (tilt, perspective, blur, fading, shadow, grain).
// Output: public/demo-receipts/<id>.jpg — used by the accuracy test and the "try a sample receipt" button.
// Usage: node scripts/make-test-receipts.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { receipts } = JSON.parse(fs.readFileSync(path.join(root, 'content/test-receipts.json'), 'utf8'));
const outDir = path.join(root, 'public/demo-receipts');
fs.mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const money = (n) => n.toFixed(2);

function receiptHtml(r, index) {
  const sums = r.lines.map(([, , sum]) => Number.parseFloat(sum));
  const total = sums.reduce((a, b) => a + b, 0);
  const vat = (letter, rate) => {
    const base = r.lines.filter(([, , s]) => s.endsWith(` ${letter}`)).reduce((a, [, , s]) => a + Number.parseFloat(s), 0);
    return base - base / (1 + rate);
  };
  const paid = Math.ceil(total / 50) * 50;
  const items = r.lines
    .map(([name, qty, sum]) =>
      qty
        ? `<div>${esc(name)}</div><div class="row"><span>&nbsp;&nbsp;${esc(qty)}</span><span>${esc(sum)}</span></div>`
        : `<div class="row"><span>${esc(name)}</span><span>${esc(sum)}</span></div>`,
    )
    .join('');
  const L = r.look;
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:620px;height:${560 + r.lines.length * 46}px;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 30% 20%,#9a8f80,#5d554b);overflow:hidden}
    .paper{position:relative;width:340px;padding:22px 20px 30px;background:#f7f5ef;
      font:15px/1.35 'Courier New',Courier,monospace;color:rgb(${30 + L.fade * 120},${30 + L.fade * 115},${30 + L.fade * 105});
      transform:perspective(900px) rotateX(${L.skew}deg) rotate(${L.rotate}deg);
      filter:blur(${L.blur}px) contrast(${1 - L.fade * 0.35});box-shadow:0 8px 24px rgba(0,0,0,.35)}
    .c{text-align:center}.b{font-weight:bold}.row{display:flex;justify-content:space-between}
    hr{border:0;border-top:1px dashed currentColor;margin:8px 0}
    .shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(${110 + index * 37}deg,rgba(0,0,0,${L.shadow * 0.55}) 0%,transparent 60%)}
    .grain{position:absolute;inset:0;pointer-events:none;opacity:${L.noise};mix-blend-mode:multiply}
  </style>
  <div class="paper">
    <div class="c b">FRIGO DEMO MARKET SRL</div>
    <div class="c">MOSTRĂ - NU ESTE BON FISCAL</div>
    <div class="c">mun. Chișinău, str. Exemplu 1</div>
    <div class="c">IDNO 0000000000000 (fictiv)</div>
    <hr>
    <div class="row"><span>${esc(r.date)}</span><span>Nr. ${String(index + 1).padStart(4, '0')}</span></div>
    <hr>
    ${items}
    <hr>
    <div class="row b"><span>TOTAL</span><span>${money(total)}</span></div>
    <div class="row"><span>NUMERAR</span><span>${money(paid)}</span></div>
    <div class="row"><span>REST</span><span>${money(paid - total)}</span></div>
    <hr>
    <div class="row"><span>TVA A 20.00%</span><span>${money(vat('A', 0.2))}</span></div>
    <div class="row"><span>TVA B 8.00%</span><span>${money(vat('B', 0.08))}</span></div>
    <hr>
    <div class="c">*** MOSTRĂ / SAMPLE ***</div>
    <div class="c">VĂ MULȚUMIM!</div>
    <div class="shade"></div>
    <svg class="grain" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${index + 3}"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
  </div>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [i, r] of receipts.entries()) {
  await page.setContent(receiptHtml(r, i));
  await page.locator('body').screenshot({ path: path.join(outDir, `${r.id}.jpg`), type: 'jpeg', quality: 82 });
  console.log(`${r.id}.jpg — ${r.look.label}`);
}
await browser.close();
