import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/PageHeader';
import { ReceiptScanner, type Correction } from '@/components/ReceiptScanner';
import { requireUser } from '@/lib/supabase/server';
import type { ShelfLifeRow } from '@/lib/categories';

export default async function ReceiptPage() {
  const { supabase } = await requireUser();
  const t = await getTranslations('receipt');
  const [{ data: shelf }, { data: corrections }] = await Promise.all([
    supabase.from('shelf_life').select('category, storage, days'),
    // the user's own past corrections (newest first, so the latest fix wins)
    supabase.from('receipt_corrections').select('raw_text, corrected_name, corrected_category').order('created_at', { ascending: false }).limit(500),
  ]);
  const latest = new Map<string, Correction>();
  for (const c of (corrections ?? []) as Correction[]) if (!latest.has(c.raw_text)) latest.set(c.raw_text, c);

  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      <ReceiptScanner shelfLife={(shelf ?? []) as ShelfLifeRow[]} corrections={[...latest.values()]} />
    </>
  );
}
