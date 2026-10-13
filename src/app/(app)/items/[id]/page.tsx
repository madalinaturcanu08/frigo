import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { closeItem, deleteItem, updateItem } from '@/app/actions/items';
import { ItemForm, type ItemFormValues } from '@/components/ItemForm';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';
import type { ShelfLifeRow } from '@/lib/categories';

export default async function ItemPage({ params }: PageProps<'/items/[id]'>) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const t = await getTranslations('edit');

  const [{ data: item }, { data: shelf }] = await Promise.all([
    supabase
      .from('fridge_items')
      .select('id, name, category, quantity, unit, storage, price_lei, expires_at, expiry_estimated, status')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('shelf_life').select('category, storage, days'),
  ]);
  if (!item || item.status !== 'active') notFound();

  async function eaten() {
    'use server';
    await closeItem(id, 'eaten');
    redirect('/');
  }
  async function wasted() {
    'use server';
    await closeItem(id, 'wasted');
    redirect('/');
  }
  async function remove() {
    'use server';
    await deleteItem(id);
  }

  return (
    <>
      <PageHeader kicker={t('kicker')} title={item.name} />
      <ItemForm
        action={updateItem.bind(null, id)}
        shelfLife={(shelf ?? []) as ShelfLifeRow[]}
        initial={item as ItemFormValues}
        submitLabel={t('submit')}
      />
      <div className="flex flex-wrap gap-2.5">
        <form action={eaten}>
          <button className="btn-lime">{t('usedIt')}</button>
        </form>
        <form action={wasted}>
          <button className="btn-ghost">{t('tossed')}</button>
        </form>
        <form action={remove} className="ml-auto">
          <button className="btn-ghost text-muted">{t('delete')}</button>
        </form>
      </div>
      <p className="m-0 text-sm text-muted">{t('deleteHint')}</p>
    </>
  );
}
