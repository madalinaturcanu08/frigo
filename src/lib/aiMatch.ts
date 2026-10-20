/**
 * The maths behind the on-device AI suggestions (session 8), kept free of the model so it can be unit-tested
 * and shared with scripts/evaluate-ai.mjs. The model turns text into a list of numbers (a "vector") that
 * describes its meaning; similar meanings give similar vectors, in any language.
 */

import type { Category } from './categories';
import type { ReceiptItem } from './receipt';

/** The AI model, pinned to an exact version so the suggestions can't change without us knowing. */
export const AI_MODEL = {
  id: 'Xenova/multilingual-e5-small',
  revision: '761b726dd34fb83930e26aab4e9ac3899aa1fa78',
  dtype: 'q8',
  /** e5 models expect this in front of every text */
  prefix: 'query: ',
  license: 'MIT',
  downloadMB: 118,
} as const;

/** Receipt line → the words worth comparing: no sizes, percentages, prices or codes; lowercase. */
export function lineForAI(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,/\\_*+]/g, ' ')
    .split(/\s+/)
    .filter((w) => /\p{L}{2,}/u.test(w) && !/\d/.test(w))
    .join(' ')
    .trim();
}

/** Lowercase, and without Romanian diacritics — receipts are printed without them. */
export function plain(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC');
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export interface AIMatch {
  /** index into the list of products */
  product: number;
  /** how alike the meanings are, 0–1 (cosine similarity) */
  similarity: number;
  /** how much better the best product is than the next-best different product */
  margin: number;
  confidence: 'high' | 'medium' | 'low';
}

// Calibrated on content/receipt-lines-eval.json (see docs/AI.md): above HIGH the category was right
// almost every time; below MEDIUM the AI was guessing, so we don't show its guess at all.
export const HIGH = 0.9;
export const MEDIUM = 0.86;
export const MIN_MARGIN = 0.01;

/**
 * Finds the closest product. `vectors[i]` belongs to product `owners[i]` (each product has several names).
 * Vectors must be normalised (length 1), so the dot product is the cosine similarity.
 */
export function bestMatch(query: ArrayLike<number>, vectors: ArrayLike<number>[], owners: number[]): AIMatch | null {
  const best = new Map<number, number>();
  vectors.forEach((v, i) => {
    const s = dot(query, v);
    if (s > (best.get(owners[i]) ?? -1)) best.set(owners[i], s);
  });
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const [product, similarity] = ranked[0];
  const margin = similarity - (ranked[1]?.[1] ?? 0);
  const confidence = similarity >= HIGH && margin >= MIN_MARGIN ? 'high' : similarity >= MEDIUM ? 'medium' : 'low';
  return { product, similarity, margin, confidence };
}

export interface AISuggestion {
  name: string;
  category: Category;
  food: boolean;
  similarity: number;
  confidence: AIMatch['confidence'];
  /** a correction the user made earlier for a similar line */
  learned: boolean;
}

/**
 * Puts the dictionary and the AI together for one receipt line:
 * - the dictionary didn't know the line → the AI's suggestion, unless the AI is only guessing (low confidence);
 * - both agree → the dictionary's name, and more sure;
 * - they disagree → the AI wins only when it is sure; otherwise the line is marked for the user to check.
 */
export function combine(item: ReceiptItem, ai: AISuggestion | null): ReceiptItem & { ai: AISuggestion | null; usedAI: boolean } {
  if (!ai) return { ...item, ai, usedAI: false };
  if (ai.learned) return { ...item, name: ai.name, category: ai.category, food: ai.food, confidence: 'high', ai, usedAI: true };
  const known = item.confidence === 'high';
  const agrees = ai.category === item.category && ai.food === item.food;
  if (known && agrees) return { ...item, ai, usedAI: false };
  if (ai.confidence === 'low') return { ...item, confidence: known ? 'medium' : 'low', ai, usedAI: false };
  if (known && ai.confidence !== 'high') return { ...item, confidence: 'medium', ai, usedAI: false };
  return {
    ...item,
    name: ai.food ? ai.name : item.name,
    category: ai.category,
    food: ai.food,
    // the AI never makes a line "high" on its own unless it is sure and the price was read
    confidence: ai.confidence === 'high' && item.price !== null ? 'high' : 'medium',
    ai,
    usedAI: true,
  };
}

/** Vectors are shipped as base64 int8 (each scaled so its largest number is 127) to keep the file small. */
export function decodeVectors(base64: string, dims: number): Float32Array[] {
  const bin = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const out: Float32Array[] = [];
  for (let i = 0; i < bin.length; i += dims) {
    const v = new Float32Array(dims);
    let norm = 0;
    for (let j = 0; j < dims; j++) {
      const byte = bin.charCodeAt(i + j);
      v[j] = (byte > 127 ? byte - 256 : byte) / 127;
      norm += v[j] * v[j];
    }
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < dims; j++) v[j] /= norm;
    out.push(v);
  }
  return out;
}

export function encodeVectors(vectors: ArrayLike<number>[]): string {
  const bytes: number[] = [];
  for (const v of vectors) {
    let max = 0;
    for (let j = 0; j < v.length; j++) max = Math.max(max, Math.abs(v[j]));
    for (let j = 0; j < v.length; j++) bytes.push(Math.round((v[j] / (max || 1)) * 127) & 0xff);
  }
  return Buffer.from(bytes).toString('base64');
}
