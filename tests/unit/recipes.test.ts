import { describe, expect, it } from 'vitest';
import { ingredientMatches, matchRecipe, normalizeName, rankRecipes, type Recipe } from '@/lib/recipes';

const today = new Date(2026, 9, 19);
const ing = (label: string, category: string, keywords: string[] = [], optional = false) => ({ label, category, keywords, optional });
const item = (id: string, name: string, category: string, expires_at: string) => ({ id, name, category, expires_at });
const recipe = (slug: string, ingredients: Recipe['ingredients'], minutes = 30): Recipe => ({
  id: slug, slug, emoji: null, minutes, servings: 2, title: slug, steps: [], ingredients,
});

describe('normalizeName', () => {
  it('strips Romanian diacritics but keeps Cyrillic letters like й', () => {
    expect(normalizeName('Smântână Ș Țară')).toBe('smantana s tara');
    expect(normalizeName('Йогурт ёжик')).toBe('йогурт ежик');
  });
});

describe('ingredientMatches', () => {
  const milk = ing('lapte', 'dairy', ['lapte', 'молок', 'milk']);
  it('matches by the start of a word, in any language', () => {
    expect(ingredientMatches(milk, item('1', 'Lapte JLC 2.5%', 'dairy', '2026-10-20'))).toBe(true);
    expect(ingredientMatches(milk, item('2', 'Молоко', 'dairy', '2026-10-20'))).toBe(true);
    expect(ingredientMatches(milk, item('3', 'Iaurt', 'dairy', '2026-10-20'))).toBe(false);
  });
  it('does not match a keyword in the middle of a word', () => {
    expect(ingredientMatches(ing('unt', 'dairy', ['unt']), item('1', 'Mărunt', 'other', '2026-10-20'))).toBe(false);
  });
  it('falls back to the category when no keywords are given', () => {
    expect(ingredientMatches(ing('brânză', 'cheese'), item('1', 'Cașcaval', 'cheese', '2026-10-20'))).toBe(true);
  });
});

describe('matchRecipe', () => {
  const clatite = recipe('clatite', [ing('lapte', 'dairy', ['lapte']), ing('ouă', 'eggs'), ing('gem', 'sauces', [], true)]);

  it('skips expired food and counts the soon-expiring items it uses', () => {
    const m = matchRecipe(clatite, [
      item('old', 'Lapte vechi', 'dairy', '2026-10-17'), // expired
      item('milk', 'Lapte', 'dairy', '2026-10-20'), // soon
      item('eggs', 'Ouă', 'eggs', '2026-11-10'), // fresh
    ], today);
    expect(m.ingredients.map((i) => i.item?.id ?? null)).toEqual(['milk', 'eggs', null]);
    expect(m).toMatchObject({ soonCount: 1, haveRequired: 2, required: 2 });
  });

  it('uses each fridge item only once', () => {
    const r = recipe('double', [ing('brânză', 'cheese'), ing('brânză 2', 'cheese')]);
    const m = matchRecipe(r, [item('c', 'Telemea', 'cheese', '2026-10-25')], today);
    expect(m.haveRequired).toBe(1);
  });
});

describe('rankRecipes', () => {
  it('puts the recipe that rescues the most soon-expiring food first', () => {
    const items = [item('milk', 'Lapte', 'dairy', '2026-10-20'), item('apple', 'Mere', 'fruit', '2026-10-30')];
    const ranked = rankRecipes(
      [recipe('apples', [ing('mere', 'fruit', ['mere'])], 10), recipe('milk', [ing('lapte', 'dairy', ['lapte'])], 40)],
      items,
      today,
    );
    expect(ranked.map((m) => m.recipe.slug)).toEqual(['milk', 'apples']);
  });
});
