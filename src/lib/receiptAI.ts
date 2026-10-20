'use client';

import { AI_MODEL, bestMatch, combine, decodeVectors, lineForAI, type AISuggestion } from './aiMatch';
import { FOOD_CATALOG, catalogFingerprint } from './foodCatalog';
import type { ReceiptItem } from './receipt';
import type { Category } from './categories';

/** The user said yes to the one-time download; from then on the AI checks every receipt by itself. */
const PREF = 'frigo_receipt_ai_v1';
/** A past correction counts for a new line only when the two lines mean (almost) the same. */
const LEARNED_SIMILARITY = 0.95;

export function aiWanted(): boolean {
  try {
    return localStorage.getItem(PREF) === 'on';
  } catch {
    return false;
  }
}

export function setAIWanted(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF, 'on');
    else localStorage.removeItem(PREF);
  } catch {}
}

/** Is the model already on this phone? (Transformers.js keeps it in the "transformers-cache" cache.) */
export async function aiDownloaded(): Promise<boolean> {
  try {
    const cache = await caches.open('transformers-cache');
    return (await cache.keys()).some((r) => r.url.includes(AI_MODEL.id) && r.url.endsWith('.onnx'));
  } catch {
    return false;
  }
}

/** Deletes the downloaded model (Settings). */
export async function removeAI() {
  setAIWanted(false);
  try {
    await caches.delete('transformers-cache');
  } catch {}
}

let worker: Worker | null = null;
let nextId = 0;
let onProgress: ((share: number) => void) | null = null;
const waiting = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./receiptAI.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === 'progress') onProgress?.(m.total ? m.loaded / m.total : 0);
    else if (m.type === 'result') waiting.get(m.id)?.resolve(m.vectors);
    else if (m.type === 'error') waiting.get(m.id)?.reject(new Error(m.message));
    if (m.type !== 'progress') waiting.delete(m.id);
  };
  worker.onerror = () => {
    for (const w of waiting.values()) w.reject(new Error('worker failed'));
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function embed(texts: string[]): Promise<number[][]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ id, texts });
  });
}

let catalog: Promise<{ vectors: Float32Array[]; owners: number[] }> | null = null;
function loadCatalog() {
  catalog ??= fetch('/ai/catalog.json')
    .then((r) => r.json())
    .then((c: { revision: string; catalog: string; dims: number; owners: number[]; vectors: string }) => {
      if (c.revision !== AI_MODEL.revision || c.catalog !== catalogFingerprint()) throw new Error('catalog.json is out of date: npm run ai:catalog');
      return { vectors: decodeVectors(c.vectors, c.dims), owners: c.owners };
    })
    .catch((e) => {
      catalog = null;
      throw e;
    });
  return catalog;
}

export interface PastCorrection {
  raw_text: string;
  corrected_name: string;
  corrected_category: string;
}

export type AIItem = ReturnType<typeof combine>;

/**
 * Runs the AI over the receipt lines and merges its suggestions with the dictionary's (see `combine`).
 * `progress` gets 0–1 while the model downloads (only the first time).
 */
export async function checkWithAI(items: ReceiptItem[], corrections: PastCorrection[], progress?: (share: number) => void): Promise<AIItem[]> {
  onProgress = progress ?? null;
  const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s);
  const texts = items.map((i) => lineForAI(i.raw));
  const pastTexts = corrections.map((c) => lineForAI(c.raw_text));
  const [{ vectors, owners }, embedded] = await Promise.all([loadCatalog(), embed([...texts, ...pastTexts])]);
  onProgress = null;
  const lines = embedded.slice(0, texts.length);
  const past = embedded.slice(texts.length);

  return items.map((item, i) => {
    if (!texts[i]) return combine(item, null);
    // 1. a correction the user made for a line that means the same ("LAPTE JLC 1.5%" after fixing "LAPTE JLC 2.5%")
    const learned = past.length ? bestMatch(lines[i], past, past.map((_, k) => k)) : null;
    if (learned && learned.similarity >= LEARNED_SIMILARITY) {
      const c = corrections[learned.product];
      return combine(item, {
        name: c.corrected_name,
        category: c.corrected_category as Category,
        food: true,
        similarity: learned.similarity,
        confidence: 'high',
        learned: true,
      });
    }
    // 2. the closest product in the catalog
    const match = bestMatch(lines[i], vectors, owners);
    if (!match) return combine(item, null);
    const product = FOOD_CATALOG[match.product];
    const suggestion: AISuggestion = {
      name: hasCyrillic(item.raw) ? product.ru : product.ro,
      category: product.category,
      food: product.food !== false,
      similarity: match.similarity,
      confidence: match.confidence,
      learned: false,
    };
    return combine(item, suggestion);
  });
}
