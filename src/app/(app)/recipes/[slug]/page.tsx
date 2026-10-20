import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/PageHeader';
import { CookButton } from '@/components/CookButton';
import { PhotoFrame } from '@/components/PhotoFrame';
import { photoFor } from '@/lib/photos';
import { IngredientChip } from '@/components/RecipesView';
import { loadRecipes } from '@/lib/recipesData';
import { matchRecipe, type PantryItem } from '@/lib/recipes';
import { todayInChisinau } from '@/lib/reminders';
import { requireUser } from '@/lib/supabase/server';

export default async function RecipePage({ params }: PageProps<'/recipes/[slug]'>) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const [t, locale] = await Promise.all([getTranslations('recipes'), getLocale()]);
  const [[recipe], { data: items }] = await Promise.all([
    loadRecipes(supabase, locale, slug),
    supabase.from('fridge_items').select('id, name, category, expires_at').eq('status', 'active'),
  ]);
  if (!recipe) notFound();
  const photo = photoFor(recipe.slug);
  const match = matchRecipe(recipe, (items ?? []) as PantryItem[], todayInChisinau());

  return (
    <>
      <PageHeader kicker={t('meta', { minutes: recipe.minutes ?? 0, servings: recipe.servings ?? 0 })} title={recipe.title} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-6">
        <section className="card flex flex-col gap-4 rounded-[26px] p-[22px]">
          {photo ? (
            <figure className="m-0 flex flex-col gap-1.5">
              <PhotoFrame name={recipe.slug} alt={recipe.title} eager className="aspect-[4/3] rounded-[18px] border-2 border-line" sizes="(max-width: 700px) 100vw, 560px" />
              <figcaption className="text-xs text-muted">
                {t('photoBy')}{' '}
                <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline">
                  {photo.author} / Unsplash
                </a>
                {' · '}
                {t('photoSimilar')}
              </figcaption>
            </figure>
          ) : (
            <div className="stripes flex aspect-[4/3] items-center justify-center rounded-[18px] border-2 border-line text-[88px]">
              <span aria-hidden>{recipe.emoji ?? '🍽️'}</span>
            </div>
          )}
          <h2 className="m-0 font-display text-[19px] font-normal">{t('ingredients')}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {match.ingredients.map((i, idx) => (
              <li key={idx} className="flex flex-wrap items-center justify-between gap-2">
                <IngredientChip ingredient={i} />
                <span className="text-[13px] text-muted">{i.item ? t('youHave', { name: i.item.name }) : t('missing')}</span>
              </li>
            ))}
          </ul>
          <CookButton match={match} />
        </section>

        <section className="card flex flex-col gap-4 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('steps')}</h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3.5">
                <span className="flex-none font-pixel text-[30px] leading-none font-black">{idx + 1}</span>
                <span className="pt-1 text-[15px] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 border-t-2 border-track pt-3 text-[13px] text-muted">{t('draftNote')}</p>
        </section>
      </div>
      <Link href="/recipes" className="self-start text-sm font-semibold underline">
        ← {t('back')}
      </Link>
    </>
  );
}
