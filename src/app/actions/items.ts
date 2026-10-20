'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import { isCategory, isStorage, isUnit, lookupShelfDays, type ShelfLifeRow, type Storage } from '@/lib/categories';
import { estimateExpiry } from '@/lib/expiry';
import { isValidGtin } from '@/lib/barcode';
import { validOps } from '@/lib/offlineQueue';

export type ItemFormState = { error?: string } | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Field = 'name' | 'category' | 'unit' | 'storage' | 'quantity' | 'price_lei' | 'expires_at';

/** Validates an item from a form (or from an offline change, which has the same fields). */
function parseItem(get: (field: Field) => unknown) {
  const name = String(get('name') ?? '').trim();
  const category = get('category');
  const unit = get('unit') || 'pcs';
  const storage = get('storage') || 'fridge';
  const quantity = Number(get('quantity') || 1);
  const priceRaw = String(get('price_lei') ?? '').replace(',', '.').trim();
  const price = priceRaw === '' || priceRaw === 'null' ? null : Number(priceRaw);
  const expires = String(get('expires_at') ?? '').trim();

  if (!name || name.length > 80) return { error: 'nameRequired' } as const;
  if (!isCategory(category)) return { error: 'categoryRequired' } as const;
  if (!isUnit(unit)) return { error: 'invalidUnit' } as const;
  if (!isStorage(storage)) return { error: 'invalidStorage' } as const;
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'invalidQuantity' } as const;
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: 'invalidPrice' } as const;
  if (expires && expires !== 'null' && !ISO_DATE.test(expires)) return { error: 'invalidDate' } as const;

  return {
    data: { name, category, unit, storage, quantity, price_lei: price, expires_at: ISO_DATE.test(expires) ? expires : null },
  } as const;
}

/** Shelf-life days from the shelf_life table for this category and storage place. */
async function shelfDays(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  category: string,
  storage: Storage,
) {
  const { data } = await supabase.from('shelf_life').select('category, storage, days').eq('category', category);
  return lookupShelfDays((data ?? []) as ShelfLifeRow[], category, storage);
}

type Supabase = Awaited<ReturnType<typeof requireUser>>['supabase'];
type ParsedItem = Extract<ReturnType<typeof parseItem>, { data: unknown }>['data'];

/** Saves a new fridge item (and teaches the shared product list a new barcode). Shared by Add item and offline sync. */
async function insertItem(supabase: Supabase, item: ParsedItem, barcode: string, addedAt: Date = new Date()) {
  const { expires_at, ...rest } = item;
  const scanned = isValidGtin(barcode);
  const { error } = await supabase.from('fridge_items').insert({
    ...rest,
    added_at: addedAt.toISOString(),
    // an estimate counts from the day the food was added, even if it reaches the server later
    expires_at: expires_at ?? estimateExpiry(await shelfDays(supabase, rest.category, rest.storage), addedAt),
    expiry_estimated: !expires_at,
    source: scanned ? 'barcode' : 'manual',
  });
  if (error) return false;

  if (scanned) {
    // A product nobody had scanned before: remember what the user typed, for everyone's next scan.
    // Existing rows are left alone (ignoreDuplicates), so one user can't rename a product for others.
    await supabase.from('products').upsert(
      { barcode, name: rest.name, category: rest.category, pack_quantity: rest.quantity, pack_unit: rest.unit, source: 'user' },
      { onConflict: 'barcode', ignoreDuplicates: true },
    );
  }
  return true;
}

export async function addItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const parsed = parseItem((f) => formData.get(f));
  if ('error' in parsed) return { error: parsed.error };
  const { supabase } = await requireUser();
  if (!(await insertItem(supabase, parsed.data, String(formData.get('barcode') ?? '')))) return { error: 'saveFailed' };

  revalidatePath('/');
  redirect('/');
}

/**
 * Applies changes made while offline, in order. Each change keeps the time it really happened.
 * Returns the ids of the changes that were applied (or can never apply, e.g. an item already closed),
 * so the device can drop them; anything else stays queued for the next try.
 */
export async function syncOffline(raw: unknown): Promise<{ done: string[] }> {
  const ops = validOps(raw).slice(0, 100);
  if (ops.length === 0) return { done: [] };
  const { supabase } = await requireUser();
  const done: string[] = [];

  for (const op of ops) {
    if (op.kind === 'close') {
      const { error } = await supabase
        .from('fridge_items')
        .update({ status: op.outcome, closed_at: op.at })
        .eq('id', op.itemId)
        .eq('status', 'active');
      if (!error) done.push(op.opId);
    } else {
      const parsed = parseItem((f) => op.item[f]);
      // An invalid item will never become valid — drop it rather than retry forever.
      if ('error' in parsed || (await insertItem(supabase, parsed.data, op.item.barcode ?? '', new Date(op.at)))) {
        done.push(op.opId);
      }
    }
  }
  revalidatePath('/', 'layout');
  return { done };
}

export async function updateItem(
  id: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = parseItem((f) => formData.get(f));
  if ('error' in parsed) return { error: parsed.error };
  const { supabase } = await requireUser();

  const { expires_at, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  // An empty date keeps the existing (possibly estimated) date; a typed date is a real one.
  if (expires_at) {
    update.expires_at = expires_at;
    update.expiry_estimated = false;
  }
  const { error } = await supabase.from('fridge_items').update(update).eq('id', id);
  if (error) return { error: 'saveFailed' };

  revalidatePath('/');
  redirect('/');
}

/** Mark an item as eaten or thrown away — every statistic comes from this. */
export async function closeItem(id: string, outcome: 'eaten' | 'wasted') {
  if (outcome !== 'eaten' && outcome !== 'wasted') return;
  const { supabase } = await requireUser();
  await supabase
    .from('fridge_items')
    .update({ status: outcome, closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active');
  revalidatePath('/');
  revalidatePath('/stats');
}

/** "I cooked this": mark every fridge item a recipe used as eaten at once. */
export async function closeItems(ids: string[], outcome: 'eaten' | 'wasted') {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) return;
  if (outcome !== 'eaten' && outcome !== 'wasted') return;
  const { supabase } = await requireUser();
  await supabase
    .from('fridge_items')
    .update({ status: outcome, closed_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'active');
  revalidatePath('/', 'layout');
}

export async function reopenItems(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) return;
  const { supabase } = await requireUser();
  await supabase.from('fridge_items').update({ status: 'active', closed_at: null }).in('id', ids);
  revalidatePath('/', 'layout');
}

/** Undo for the toast after closing an item. */
export async function reopenItem(id: string) {
  const { supabase } = await requireUser();
  await supabase.from('fridge_items').update({ status: 'active', closed_at: null }).eq('id', id);
  revalidatePath('/');
  revalidatePath('/stats');
}

export async function deleteItem(id: string) {
  const { supabase } = await requireUser();
  await supabase.from('fridge_items').delete().eq('id', id);
  revalidatePath('/');
  redirect('/');
}
