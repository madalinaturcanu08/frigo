import 'server-only';
import { isLocale, DEFAULT_LOCALE } from '@/i18n/config';
import type { Recipe } from './recipes';
import type { createClient } from './supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

const COLUMNS =
  'id, slug, emoji, minutes, servings, title_ro, title_ru, title_en, steps_ro, steps_ru, steps_en, ' +
  'recipe_ingredients (position, category, keyword, optional, label_ro, label_ru, label_en)';

interface Row {
  id: string;
  slug: string;
  emoji: string | null;
  minutes: number | null;
  servings: number | null;
  [key: string]: unknown;
  recipe_ingredients: { position: number; category: string | null; keyword: string | null; optional: boolean; [key: string]: unknown }[];
}

function toRecipe(row: Row, lang: 'ro' | 'ru' | 'en'): Recipe {
  const text = (key: string) => String(row[`${key}_${lang}`] ?? row[`${key}_ro`] ?? '');
  return {
    id: row.id,
    slug: row.slug,
    emoji: row.emoji,
    minutes: row.minutes,
    servings: row.servings,
    title: text('title'),
    steps: text('steps').split('\n').filter(Boolean),
    ingredients: [...row.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        label: String(i[`label_${lang}`] ?? i.label_ro ?? i.keyword ?? ''),
        category: i.category ?? 'other',
        keywords: i.keyword ? i.keyword.split(',').map((k) => k.trim()).filter(Boolean) : [],
        optional: i.optional,
      })),
  };
}

/** All recipes, with titles, steps and ingredient names in the user's language. */
export async function loadRecipes(supabase: Supabase, locale: string, slug?: string): Promise<Recipe[]> {
  const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
  let query = supabase.from('recipes').select(COLUMNS);
  if (slug) query = query.eq('slug', slug);
  const { data, error } = await query;
  if (error) console.error('[recipes]', error.message);
  return ((data ?? []) as unknown as Row[]).filter((r) => r.slug).map((r) => toRecipe(r, lang));
}
