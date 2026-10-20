'use client';

import { useTranslations } from 'next-intl';
import type { RecipeMatch } from '@/lib/recipes';
import { useCookRecipe } from './RecipesView';

export function CookButton({ match }: { match: RecipeMatch }) {
  const t = useTranslations('recipes');
  const { cook, toastEl } = useCookRecipe();
  const usable = match.ingredients.some((i) => i.item);
  return (
    <>
      <button type="button" disabled={!usable} onClick={() => cook(match)} className="btn-lime">
        {t('cookedThis')}
      </button>
      <p className="m-0 text-[13px] text-muted">{t(usable ? 'cookHint' : 'nothingToUse')}</p>
      {toastEl}
    </>
  );
}
