import { getLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/PageHeader';
import { PhotoFrame } from '@/components/PhotoFrame';
import { RecipesView } from '@/components/RecipesView';
import { loadRecipes } from '@/lib/recipesData';
import { rankRecipes, type PantryItem } from '@/lib/recipes';
import { todayInChisinau } from '@/lib/reminders';
import { requireUser } from '@/lib/supabase/server';

export default async function RecipesPage() {
  const { supabase } = await requireUser();
  const [t, locale] = await Promise.all([getTranslations('recipes'), getLocale()]);
  const [recipes, { data: items }] = await Promise.all([
    loadRecipes(supabase, locale),
    supabase.from('fridge_items').select('id, name, category, expires_at').eq('status', 'active'),
  ]);

  return (
    <>
      <PageHeader kicker={t('kicker')} title={t('title')} />
      <PhotoFrame name="decor-recipes" alt="" eager className="h-[130px] rounded-[26px] border-2 border-line shadow-card sm:h-[170px]" sizes="(max-width: 1180px) 100vw, 1180px">
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 to-transparent p-5">
          <p className="m-0 max-w-[520px] font-display text-[clamp(18px,2.4vw,26px)] leading-tight text-white">{t('banner')}</p>
        </div>
      </PhotoFrame>
      <RecipesView matches={rankRecipes(recipes, (items ?? []) as PantryItem[], todayInChisinau())} />
    </>
  );
}
