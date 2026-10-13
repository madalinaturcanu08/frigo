import type { ClosedItem } from './stats';

export interface CategoryShare {
  category: string;
  count: number;
  /** 0–1 share of all wasted items */
  share: number;
}

/** Categories ranked by how many items of them were thrown away. */
export function wastedByCategory(items: ClosedItem[], limit = 4): CategoryShare[] {
  const wasted = items.filter((i) => i.status === 'wasted');
  const counts = new Map<string, number>();
  for (const i of wasted) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count, share: count / wasted.length }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, limit);
}
