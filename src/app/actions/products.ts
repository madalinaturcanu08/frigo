'use server';

import { getLocale } from 'next-intl/server';
import { requireUser } from '@/lib/supabase/server';
import { categoryFromTags, isValidGtin, parsePackQuantity } from '@/lib/barcode';
import { isCategory, isUnit, type Category, type Unit } from '@/lib/categories';

export type BarcodeLookup =
  | { status: 'invalid' }
  | { status: 'unknown'; barcode: string }
  | {
      status: 'found';
      barcode: string;
      name: string;
      category: Category;
      quantity: number | null;
      unit: Unit | null;
      source: 'cache' | 'off';
    };

interface OffProduct {
  product_name?: string;
  product_name_ro?: string;
  product_name_ru?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
}

const OFF_FIELDS = 'product_name,product_name_ro,product_name_ru,product_name_en,generic_name,brands,quantity,categories_tags';
// Open Food Facts asks every app to identify itself.
const OFF_USER_AGENT = 'Frigo/0.1 (InfoMatrix school project; https://github.com/madalinaturcanu08/frigo)';

async function fetchOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`, {
      headers: { 'User-Agent': OFF_USER_AGENT },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    return json.status === 1 && json.product ? json.product : null;
  } catch {
    return null; // offline or slow: treat as unknown, the user can type it
  }
}

function localName(p: OffProduct, locale: string): string {
  const byLocale = { ro: p.product_name_ro, ru: p.product_name_ru, en: p.product_name_en }[locale];
  return (byLocale || p.product_name || p.generic_name || p.brands?.split(',')[0] || '').trim().slice(0, 80);
}

/** Barcode → product: Frigo's shared product list first, then Open Food Facts. */
export async function lookupBarcode(raw: string): Promise<BarcodeLookup> {
  const barcode = raw.replace(/\s/g, '');
  if (!isValidGtin(barcode)) return { status: 'invalid' };
  const { supabase } = await requireUser();

  const { data: cached } = await supabase
    .from('products')
    .select('name, category, pack_quantity, pack_unit')
    .eq('barcode', barcode)
    .maybeSingle();
  if (cached && isCategory(cached.category)) {
    return {
      status: 'found',
      barcode,
      name: cached.name,
      category: cached.category,
      quantity: cached.pack_quantity,
      unit: isUnit(cached.pack_unit) ? cached.pack_unit : null,
      source: 'cache',
    };
  }

  const off = await fetchOpenFoodFacts(barcode);
  const name = off ? localName(off, await getLocale()) : '';
  if (!off || !name) return { status: 'unknown', barcode };

  const category = categoryFromTags(off.categories_tags);
  const pack = parsePackQuantity(off.quantity);
  // Remember it so the next scan (by anyone) is instant and works even if Open Food Facts is down.
  await supabase.from('products').upsert(
    { barcode, name, category, pack_quantity: pack?.quantity ?? null, pack_unit: pack?.unit ?? null, source: 'off' },
    { onConflict: 'barcode', ignoreDuplicates: true },
  );
  return { status: 'found', barcode, name, category, quantity: pack?.quantity ?? null, unit: pack?.unit ?? null, source: 'off' };
}
