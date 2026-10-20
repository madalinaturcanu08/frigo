'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/server';
import { isCategory, isUnit } from '@/lib/categories';
import { addDays, toISODate } from '@/lib/dates';
import { foldReceiptText } from '@/lib/receipt';

export interface ConfirmedReceiptItem {
  raw: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number | null;
  /** days until it expires, as confirmed by the user */
  days: number;
  /** the user changed the suggested name or category — remember it for next time */
  corrected: boolean;
}

/** Adds the items the user confirmed on the review screen, and learns from their corrections. */
export async function addReceiptItems(items: unknown): Promise<{ added: number } | { error: string }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 60) return { error: 'invalid' };
  const valid = (items as ConfirmedReceiptItem[]).filter(
    (i) =>
      typeof i?.name === 'string' &&
      i.name.trim().length > 0 &&
      i.name.trim().length <= 80 &&
      isCategory(i.category) &&
      isUnit(i.unit) &&
      Number.isFinite(i.quantity) &&
      i.quantity > 0 &&
      Number.isInteger(i.days) &&
      i.days >= 0 &&
      i.days <= 730 &&
      (i.price === null || (Number.isFinite(i.price) && i.price >= 0 && i.price < 100_000)),
  );
  if (valid.length === 0) return { error: 'invalid' };
  const { supabase } = await requireUser();

  const today = new Date();
  const { error } = await supabase.from('fridge_items').insert(
    valid.map((i) => ({
      name: i.name.trim(),
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      storage: 'fridge',
      price_lei: i.price,
      expires_at: toISODate(addDays(today, i.days)),
      // dates on receipts are guesses — the fridge shows "~" until the user checks the package
      expiry_estimated: true,
      source: 'receipt',
    })),
  );
  if (error) return { error: 'saveFailed' };

  const corrections = valid
    .filter((i) => i.corrected && typeof i.raw === 'string' && i.raw.trim())
    .map((i) => ({ raw_text: foldReceiptText(i.raw.trim()).slice(0, 120), corrected_name: i.name.trim(), corrected_category: i.category }));
  if (corrections.length) await supabase.from('receipt_corrections').insert(corrections);

  revalidatePath('/', 'layout');
  return { added: valid.length };
}
