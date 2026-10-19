'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import { isCategory, isStorage, isUnit, lookupShelfDays, type ShelfLifeRow, type Storage } from '@/lib/categories';
import { estimateExpiry } from '@/lib/expiry';
import { isValidGtin } from '@/lib/barcode';

export type ItemFormState = { error?: string } | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseItem(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const category = formData.get('category');
  const unit = formData.get('unit') || 'pcs';
  const storage = formData.get('storage') || 'fridge';
  const quantity = Number(formData.get('quantity') || 1);
  const priceRaw = String(formData.get('price_lei') ?? '').replace(',', '.').trim();
  const price = priceRaw === '' ? null : Number(priceRaw);
  const expires = String(formData.get('expires_at') ?? '').trim();

  if (!name || name.length > 80) return { error: 'nameRequired' } as const;
  if (!isCategory(category)) return { error: 'categoryRequired' } as const;
  if (!isUnit(unit)) return { error: 'invalidUnit' } as const;
  if (!isStorage(storage)) return { error: 'invalidStorage' } as const;
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'invalidQuantity' } as const;
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: 'invalidPrice' } as const;
  if (expires && !ISO_DATE.test(expires)) return { error: 'invalidDate' } as const;

  return {
    data: { name, category, unit, storage, quantity, price_lei: price, expires_at: expires || null },
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

export async function addItem(_prev: ItemFormState, formData: FormData): Promise<ItemFormState> {
  const parsed = parseItem(formData);
  if ('error' in parsed) return { error: parsed.error };
  const { supabase } = await requireUser();

  const { expires_at, ...rest } = parsed.data;
  const estimated = !expires_at;
  const barcode = String(formData.get('barcode') ?? '');
  const scanned = isValidGtin(barcode);
  const { error } = await supabase.from('fridge_items').insert({
    ...rest,
    expires_at: expires_at ?? estimateExpiry(await shelfDays(supabase, rest.category, rest.storage)),
    expiry_estimated: estimated,
    source: scanned ? 'barcode' : 'manual',
  });
  if (error) return { error: 'saveFailed' };

  if (scanned) {
    // A product nobody had scanned before: remember what the user typed, for everyone's next scan.
    // Existing rows are left alone (ignoreDuplicates), so one user can't rename a product for others.
    await supabase.from('products').upsert(
      { barcode, name: rest.name, category: rest.category, pack_quantity: rest.quantity, pack_unit: rest.unit, source: 'user' },
      { onConflict: 'barcode', ignoreDuplicates: true },
    );
  }

  revalidatePath('/');
  redirect('/');
}

export async function updateItem(
  id: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = parseItem(formData);
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
