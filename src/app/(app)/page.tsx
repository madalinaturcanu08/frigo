import { getTranslations } from 'next-intl/server';
import { FridgeView } from '@/components/FridgeView';
import { PageHeader } from '@/components/PageHeader';
import { requireUser } from '@/lib/supabase/server';
import type { ItemCardData } from '@/components/ItemCard';

export default async function FridgePage() {
  const { supabase, user } = await requireUser();
  const t = await getTranslations('fridge');

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase
      .from('fridge_items')
      .select('id, name, category, quantity, unit, storage, expires_at, expiry_estimated')
      .eq('status', 'active')
      .order('expires_at'),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader kicker={t('hello', { name: profile?.display_name || user.email?.split('@')[0] || '' })} title={t('title')} />
      <FridgeView items={(items ?? []) as ItemCardData[]} />
    </>
  );
}
