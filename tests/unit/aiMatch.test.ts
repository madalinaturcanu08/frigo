import { describe, expect, it } from 'vitest';
import { bestMatch, combine, decodeVectors, encodeVectors, lineForAI, type AISuggestion } from '@/lib/aiMatch';
import type { ReceiptItem } from '@/lib/receipt';

const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};

const item = (patch: Partial<ReceiptItem> = {}): ReceiptItem => ({
  raw: 'SUC MERE 1L',
  name: 'Suc',
  category: 'drinks',
  quantity: 1,
  unit: 'l',
  price: 26.9,
  food: true,
  confidence: 'high',
  ...patch,
});

const ai = (patch: Partial<AISuggestion> = {}): AISuggestion => ({
  name: 'Suc',
  category: 'drinks',
  food: true,
  similarity: 0.93,
  confidence: 'high',
  learned: false,
  ...patch,
});

describe('lineForAI', () => {
  it('keeps only the words: no sizes, percentages or codes', () => {
    expect(lineForAI('LAPTE JLC 2.5% 1L')).toBe('lapte jlc');
    expect(lineForAI('BR.DE VACI 5% 200G')).toBe('br de vaci');
    expect(lineForAI('СЛИВКИ 10% 200МЛ')).toBe('сливки');
  });
});

describe('bestMatch', () => {
  // three products; product 1 has two names
  const vectors = [unit([1, 0, 0]), unit([0, 1, 0]), unit([0, 0.9, 0.1]), unit([0, 0, 1])];
  const owners = [0, 1, 1, 2];

  it('picks the closest product and counts its best name only once', () => {
    const m = bestMatch(unit([0, 1, 0.05]), vectors, owners)!;
    expect(m.product).toBe(1);
    expect(m.similarity).toBeGreaterThan(0.99);
    // the margin is measured against a *different* product, not the second name of the same one
    expect(m.margin).toBeGreaterThan(0.9);
    expect(m.confidence).toBe('high');
  });

  it('is not sure when two products are equally close', () => {
    const m = bestMatch(unit([1, 1, 0]), vectors, owners)!;
    expect(m.confidence).not.toBe('high');
  });

  it('gives up (low) when nothing is close', () => {
    expect(bestMatch(unit([1, 1, 1]), vectors, owners)!.confidence).toBe('low');
  });
});

describe('vectors survive being squeezed to int8', () => {
  it('keeps the similarity within 0.01', () => {
    const a = unit(Array.from({ length: 384 }, (_, i) => Math.sin(i * 1.3)));
    const b = unit(Array.from({ length: 384 }, (_, i) => Math.sin(i * 1.3) + Math.cos(i * 0.7) * 0.4));
    const [da, db] = decodeVectors(encodeVectors([a, b]), 384);
    const exact = a.reduce((s, x, i) => s + x * b[i], 0);
    const squeezed = da.reduce((s, x, i) => s + x * db[i], 0);
    expect(Math.abs(exact - squeezed)).toBeLessThan(0.01);
  });
});

describe('combine: dictionary + AI', () => {
  it('uses the AI for a line the dictionary does not know', () => {
    const r = combine(item({ name: 'Usturoi', category: 'other', confidence: 'medium' }), ai({ name: 'Usturoi', category: 'vegetables' }));
    expect(r).toMatchObject({ category: 'vegetables', usedAI: true, confidence: 'high' });
  });

  it('does not show a guess when the AI is not sure', () => {
    const r = combine(item({ name: 'Tofu natural', category: 'other', confidence: 'medium' }), ai({ name: 'Roșii', category: 'vegetables', confidence: 'low' }));
    expect(r).toMatchObject({ name: 'Tofu natural', category: 'other', usedAI: false, confidence: 'low' });
  });

  it('a sure AI corrects the dictionary ("SUC MERE" is juice, not fruit)', () => {
    const r = combine(item({ name: 'Mere', category: 'fruit' }), ai());
    expect(r).toMatchObject({ name: 'Suc', category: 'drinks', usedAI: true });
  });

  it('an unsure AI that disagrees only asks the user to check', () => {
    const r = combine(item({ name: 'Mere', category: 'fruit' }), ai({ confidence: 'medium' }));
    expect(r).toMatchObject({ name: 'Mere', category: 'fruit', usedAI: false, confidence: 'medium' });
  });

  it('when both agree, the dictionary name stays', () => {
    const r = combine(item({ name: 'Lapte', category: 'dairy' }), ai({ name: 'Lapte', category: 'dairy' }));
    expect(r).toMatchObject({ name: 'Lapte', usedAI: false, confidence: 'high' });
  });

  it('never makes a line "sure" when its price was not read', () => {
    const r = combine(item({ price: null, category: 'other', confidence: 'low' }), ai({ category: 'vegetables' }));
    expect(r.confidence).toBe('medium');
  });

  it('a past correction for a similar line wins', () => {
    const r = combine(item(), ai({ name: 'Suc de mere', category: 'drinks', learned: true }));
    expect(r).toMatchObject({ name: 'Suc de mere', confidence: 'high', usedAI: true });
  });
});

describe('public/ai/catalog.json', () => {
  it('was made from the current product list (otherwise run: npm run ai:catalog)', async () => {
    const fs = await import('node:fs');
    const { AI_MODEL } = await import('@/lib/aiMatch');
    const { FOOD_CATALOG, catalogFingerprint } = await import('@/lib/foodCatalog');
    const file = JSON.parse(fs.readFileSync('public/ai/catalog.json', 'utf8'));
    expect(file.catalog).toBe(catalogFingerprint());
    expect(file.revision).toBe(AI_MODEL.revision);
    expect(Math.max(...file.owners)).toBe(FOOD_CATALOG.length - 1);
  });
});
