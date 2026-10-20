'use client';

import Link from 'next/link';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { closeItems, reopenItems } from '@/app/actions/items';
import type { MatchedIngredient, RecipeMatch } from '@/lib/recipes';
import { photoFor } from '@/lib/photos';
import { PhotoFrame } from './PhotoFrame';
import { Toast } from './Toast';

const DOT = { fresh: 'bg-fresh', soon: 'bg-soon', expired: 'bg-expired' } as const;

export function IngredientChip({ ingredient }: { ingredient: MatchedIngredient }) {
  const t = useTranslations('recipes');
  const have = !!ingredient.item;
  return (
    <span
      title={ingredient.item ? t('youHave', { name: ingredient.item.name }) : t('missing')}
      className={`flex h-7 items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-xs font-semibold ${
        have ? 'border-line' : 'border-dashed border-line text-muted'
      }`}
    >
      <span className={`h-2 w-2 rounded-full border border-edge ${ingredient.state ? DOT[ingredient.state] : 'bg-track'}`} />
      {ingredient.label}
      {ingredient.optional && !have && <span className="font-normal opacity-70">· {t('optional')}</span>}
    </span>
  );
}

/** "I cooked this" with an Undo toast — marks the fridge items the recipe used as eaten. */
export function useCookRecipe() {
  const t = useTranslations('recipes');
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; ids?: string[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function show(message: string, ids?: string[]) {
    clearTimeout(timer.current);
    setToast({ message, ids });
    timer.current = setTimeout(() => setToast(null), 5000);
  }

  function cook(match: RecipeMatch, hide?: (ids: string[]) => void) {
    const ids = match.ingredients.flatMap((i) => (i.item ? [i.item.id] : []));
    if (ids.length === 0) return show(t('nothingToUse'));
    startTransition(async () => {
      hide?.(ids);
      await closeItems(ids, 'eaten');
    });
    show(t('cooked', { count: ids.length }), ids);
  }

  const toastEl = toast && (
    <Toast
      message={toast.message}
      action={
        toast.ids
          ? {
              label: t('undo'),
              onClick: () => {
                const ids = toast.ids!;
                setToast(null);
                startTransition(() => reopenItems(ids));
              },
            }
          : undefined
      }
    />
  );
  return { cook, toastEl };
}

export function RecipesView({ matches }: { matches: RecipeMatch[] }) {
  const t = useTranslations('recipes');
  const anySoon = matches.some((m) => m.soonCount > 0);
  const [onlySoon, setOnlySoon] = useState(anySoon);
  // Hide eaten items straight away; the server re-ranks once the update lands.
  const [usedIds, hideIds] = useOptimistic<string[], string[]>([], (current, ids) => [...current, ...ids]);
  const { cook, toastEl } = useCookRecipe();

  const visible = matches
    .map((m) => ({
      ...m,
      ingredients: m.ingredients.map((i) => (i.item && usedIds.includes(i.item.id) ? { ...i, item: null, state: null } : i)),
    }))
    .map((m) => ({ ...m, soonCount: m.ingredients.filter((i) => i.state === 'soon').length }))
    .filter((m) => !onlySoon || m.soonCount > 0);

  if (matches.length === 0) {
    return <div className="rounded-[26px] border-2 border-dashed border-line p-10 text-center text-[15px] text-muted">{t('none')}</div>;
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <button
        type="button"
        role="switch"
        aria-checked={onlySoon}
        onClick={() => setOnlySoon((v) => !v)}
        className="flex items-center gap-3 self-start rounded-full border-2 border-line bg-card py-2 pr-4 pl-2 text-left"
      >
        <span className={`relative h-7 w-[46px] flex-none rounded-full border-2 border-line ${onlySoon ? 'bg-lime' : 'bg-track'}`}>
          <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-ink transition-all ${onlySoon ? 'left-[20px]' : 'left-[2px]'}`} />
        </span>
        <span className="text-sm font-semibold">{t('onlySoon')}</span>
      </button>

      {visible.length === 0 ? (
        <div className="rounded-[26px] border-2 border-dashed border-line p-10 text-center text-[15px] text-muted">{t('nothingSoon')}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-[18px]">
          {visible.map((m) => {
            const usable = m.ingredients.some((i) => i.item);
            return (
              <article key={m.recipe.id} className="card flex flex-col overflow-hidden rounded-[26px]">
                <Link href={`/recipes/${m.recipe.slug}`} className="stripes relative flex aspect-[4/3] items-center justify-center border-b-2 border-line text-[64px]">
                  {photoFor(m.recipe.slug) ? (
                    <PhotoFrame name={m.recipe.slug} alt={m.recipe.title} className="absolute inset-0" sizes="(max-width: 640px) 100vw, 360px" />
                  ) : (
                    <span aria-hidden>{m.recipe.emoji ?? '🍽️'}</span>
                  )}
                  {m.soonCount > 0 && (
                    <span className="status-chip absolute top-3 left-3 z-10 bg-soon px-3 py-[5px] text-[11px]">{t('usesSoon', { count: m.soonCount })}</span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-3 px-[18px] pt-4 pb-[18px]">
                  <div className="flex flex-col gap-1">
                    <Link href={`/recipes/${m.recipe.slug}`} className="font-display text-[19px] leading-[1.15]">
                      {m.recipe.title}
                    </Link>
                    <div className="text-[13px] text-muted">
                      {t('meta', { minutes: m.recipe.minutes ?? 0, servings: m.recipe.servings ?? 0 })} ·{' '}
                      {t('have', { have: m.haveRequired, total: m.required })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.ingredients.map((i, idx) => (
                      <IngredientChip key={idx} ingredient={i} />
                    ))}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      disabled={!usable}
                      onClick={() => cook(m, hideIds)}
                      className="btn-lime h-[42px] min-h-0 flex-1 text-sm"
                    >
                      {t('cookedThis')}
                    </button>
                    <Link href={`/recipes/${m.recipe.slug}`} className="btn-ghost h-[42px] min-h-0 px-4 text-sm font-semibold">
                      {t('open')}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {toastEl}
    </div>
  );
}
