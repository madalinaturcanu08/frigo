import { getTranslations } from 'next-intl/server';
import { addItem } from '@/app/actions/items';
import { ItemForm } from '@/components/ItemForm';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';
import type { ShelfLifeRow } from '@/lib/categories';

export default async function AddPage() {
  const { supabase } = await requireUser();
  const t = await getTranslations('add');
  const { data } = await supabase.from('shelf_life').select('category, storage, days');

  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      <ItemForm action={addItem} shelfLife={(data ?? []) as ShelfLifeRow[]} submitLabel={t('submit')} />
    </>
  );
}
