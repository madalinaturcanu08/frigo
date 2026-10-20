import { daysLeft, expiryState, sortByExpiry, type ExpiryState } from './expiry';

export interface RecipeIngredient {
  label: string;
  category: string;
  /** name stems; when present, only items whose name starts a word with one of them match */
  keywords: string[];
  optional: boolean;
}

export interface Recipe {
  id: string;
  slug: string;
  emoji: string | null;
  minutes: number | null;
  servings: number | null;
  title: string;
  steps: string[];
  ingredients: RecipeIngredient[];
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  expires_at: string;
}

export interface MatchedIngredient extends RecipeIngredient {
  item: PantryItem | null;
  state: ExpiryState | null;
}

export interface RecipeMatch {
  recipe: Recipe;
  ingredients: MatchedIngredient[];
  /** fridge items this recipe would use that expire within the "use soon" window */
  soonCount: number;
  haveRequired: number;
  required: number;
}

/** Lowercase, "ё" → "е", and Latin letters without diacritics (ă â î ș ț → a a i s t). Cyrillic stays intact. */
export function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFC')
    .trim();
}

export function ingredientMatches(ingredient: RecipeIngredient, item: PantryItem): boolean {
  if (ingredient.keywords.length === 0) return item.category === ingredient.category;
  const name = normalizeName(item.name);
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return ingredient.keywords.some((raw) => {
    const k = normalizeName(raw);
    return k.includes(' ') ? name.includes(k) : words.some((w) => w.startsWith(k));
  });
}

/**
 * Which fridge items a recipe would use. Expired food is never suggested for cooking (food safety — the user
 * decides about it on the Fridge page). Each item is used once, soonest-expiring first, required ingredients first.
 */
export function matchRecipe(recipe: Recipe, items: PantryItem[], today: Date = new Date()): RecipeMatch {
  const usable = sortByExpiry(items.filter((i) => daysLeft(i.expires_at, today) >= 0));
  const used = new Set<string>();
  const order = recipe.ingredients.map((ing, index) => ({ ing, index })).sort((a, b) => Number(a.ing.optional) - Number(b.ing.optional));
  const matched: MatchedIngredient[] = recipe.ingredients.map((ing) => ({ ...ing, item: null, state: null }));

  for (const { ing, index } of order) {
    const item = usable.find((i) => !used.has(i.id) && ingredientMatches(ing, i));
    if (item) {
      used.add(item.id);
      matched[index] = { ...ing, item, state: expiryState(item.expires_at, today) };
    }
  }

  const required = recipe.ingredients.filter((i) => !i.optional).length;
  return {
    recipe,
    ingredients: matched,
    soonCount: matched.filter((m) => m.state === 'soon').length,
    haveRequired: matched.filter((m) => !m.optional && m.item).length,
    required,
  };
}

/** Recipes that rescue the most soon-expiring food first, then the ones you have most ingredients for. */
export function rankRecipes(recipes: Recipe[], items: PantryItem[], today: Date = new Date()): RecipeMatch[] {
  const coverage = (m: RecipeMatch) => (m.required === 0 ? 1 : m.haveRequired / m.required);
  return recipes
    .map((r) => matchRecipe(r, items, today))
    .sort(
      (a, b) =>
        b.soonCount - a.soonCount ||
        coverage(b) - coverage(a) ||
        (a.recipe.minutes ?? 999) - (b.recipe.minutes ?? 999) ||
        a.recipe.title.localeCompare(b.recipe.title),
    );
}
