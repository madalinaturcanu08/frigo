export const CATEGORIES = [
  'dairy',
  'cheese',
  'eggs',
  'meat',
  'fish',
  'vegetables',
  'fruit',
  'bread',
  'leftovers',
  'sauces',
  'drinks',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  dairy: '🥛',
  cheese: '🧀',
  eggs: '🥚',
  meat: '🍗',
  fish: '🐟',
  vegetables: '🥕',
  fruit: '🍎',
  bread: '🍞',
  leftovers: '🍲',
  sauces: '🥫',
  drinks: '🧃',
  other: '📦',
};

export const UNITS = ['pcs', 'g', 'kg', 'ml', 'l', 'pack'] as const;
export type Unit = (typeof UNITS)[number];

export const STORAGES = ['fridge', 'freezer', 'pantry'] as const;
export type Storage = (typeof STORAGES)[number];

export interface ShelfLifeRow {
  category: string;
  storage: Storage;
  days: number;
}

/** Fallback when the shelf_life table has no row for a category/storage pair. */
export const DEFAULT_SHELF_DAYS = 5;

/** Shelf-life days for a category in a storage place; falls back to the fridge row, then the default. */
export function lookupShelfDays(rows: ShelfLifeRow[], category: string, storage: Storage): number {
  return (
    rows.find((r) => r.category === category && r.storage === storage)?.days ??
    rows.find((r) => r.category === category && r.storage === 'fridge')?.days ??
    DEFAULT_SHELF_DAYS
  );
}

const includes = (list: readonly string[], v: unknown): boolean => typeof v === 'string' && list.includes(v);
export const isCategory = (v: unknown): v is Category => includes(CATEGORIES, v);
export const isUnit = (v: unknown): v is Unit => includes(UNITS, v);
export const isStorage = (v: unknown): v is Storage => includes(STORAGES, v);
