import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIN_OCR_CONFIDENCE, parseReceipt } from '@/lib/receipt';
import key from '../../content/test-receipts.json';

// Scores the parser on what Tesseract really read from the fake receipts (tests/fixtures/ocr, made by
// `node scripts/evaluate-receipts.mjs --save`) against the answer key in content/test-receipts.json.

const fixture = (id: string) => fs.readFileSync(path.join(__dirname, '../fixtures/ocr', `${id}.txt`), 'utf8');
const confidence = (text: string) => Number(text.match(/# confidence (\d+)/)?.[1] ?? 0);

function score(id: string) {
  const receipt = key.receipts.find((r) => r.id === id)!;
  const items = parseReceipt(fixture(id));
  const found = receipt.food.map((f) => {
    const hit = items.find((i) => i.price !== null && Math.abs(i.price - f.price) < 0.02);
    return { f, hit };
  });
  const nonFoodLines = receipt.lines.map((_, i) => i).filter((i) => !receipt.food.some((f) => f.line === i));
  const nonFoodPrices = nonFoodLines.map((i) => Number.parseFloat(receipt.lines[i][2]));
  const wronglyFood = items.filter((i) => i.food && i.price !== null && nonFoodPrices.some((p) => Math.abs(p - i.price!) < 0.02));
  return {
    recall: found.filter((x) => x.hit).length / found.length,
    category: found.filter((x) => x.hit?.category === x.f.category).length / found.length,
    quantity: found.filter((x) => x.hit?.unit === x.f.unit && Math.abs(x.hit.quantity - x.f.quantity) < 0.001).length / found.length,
    wronglyFood: wronglyFood.length,
    items,
  };
}

describe('receipt parser on realistic photos', () => {
  const readable = ['r1-clean', 'r2-phone-tilted', 'r3-faded', 'r4-romanian-russian', 'r5-long-with-nonfood'];

  it.each(readable)('%s: finds the food with the right category and skips non-food', (id) => {
    const s = score(id);
    expect(s.recall).toBeGreaterThanOrEqual(0.8);
    expect(s.category).toBeGreaterThanOrEqual(0.8);
    expect(s.wronglyFood).toBe(0);
  });

  it('gets most quantities and units right across the readable receipts', () => {
    const avg = readable.map((id) => score(id).quantity).reduce((a, b) => a + b, 0) / readable.length;
    expect(avg).toBeGreaterThanOrEqual(0.7);
  });

  it('flags the blurry receipt as too unclear instead of trusting it', () => {
    expect(confidence(fixture('r6-hard'))).toBeLessThan(MIN_OCR_CONFIDENCE);
    for (const id of readable) expect(confidence(fixture(id))).toBeGreaterThanOrEqual(MIN_OCR_CONFIDENCE);
  });
});

describe('parseReceipt details', () => {
  it('reads a weighed item from the two-line layout', () => {
    const [item] = parseReceipt('14.10.2026\nMERE GOLDEN\n1.245 x 16.90 21.04 B\nTOTAL 21.04');
    expect(item).toMatchObject({ name: 'Mere', category: 'fruit', quantity: 1.245, unit: 'kg', price: 21.04, food: true });
  });
  it('names Russian lines in Russian and Romanian lines in Romanian', () => {
    const items = parseReceipt('14.10.2026\nМОЛОКО 3.2% 1Л\n1 X 23.90 23.90 A\nLAPTE JLC 1L\n1 x 22.90 22.90 A\nTOTAL 46.80');
    expect(items.map((i) => i.name)).toEqual(['Молоко', 'Lapte']);
  });
  it('marks household items as not food and ignores discounts', () => {
    const items = parseReceipt('14.10.2026\nDETERGENT VASE\n1 x 34.90 34.90 A\nREDUCERE CARD -5.00\nTOTAL 29.90');
    expect(items).toHaveLength(1);
    expect(items[0].food).toBe(false);
  });
});

describe('what the browser read (session 8 check)', () => {
  // The same photo is read a little differently in the browser than in Node (the photo is downscaled first).
  it('keeps the price when the VAT letter is misread, and a garbled quantity line stays with its product', () => {
    const items = parseReceipt('18.10.2026 17:48\nARDEI GRAS\n0.520 x 39.90 20:15 E\nUNT 72.5% 200G\n1 SETI 39.90 A\nTOTAL 60.05');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'Ardei', quantity: 0.52, unit: 'kg', price: 20.15 });
    expect(items[1]).toMatchObject({ name: 'Unt', price: 39.9 });
  });
});

describe('shop details are never products', () => {
  it('skips the shop name and address even when no date was read', () => {
    const items = parseReceipt('FRIGO DEMO MARKET SRL\nmun. Chișinău, str. Exemplu 1\nLAPTE JLC 2.5% 1L 22.90 A');
    expect(items.map((i) => i.name)).toEqual(['Lapte']);
  });
});
