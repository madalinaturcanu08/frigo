import { normalizeName } from './recipes';

export interface HistoryItem {
  name: string;
  category: string;
  status: 'eaten' | 'wasted' | 'active';
  closed_at: string | null;
  price_lei: number | null;
}

export type Insight =
  | { kind: 'topWaste'; tone: 'warn'; category: string; count: number; total: number }
  | { kind: 'repeatWaste'; tone: 'warn'; name: string; count: number }
  | { kind: 'strongPoint'; tone: 'good'; category: string; count: number }
  | { kind: 'lessThanLastMonth'; tone: 'good'; percent: number }
  | { kind: 'moreThanLastMonth'; tone: 'warn'; percent: number }
  | { kind: 'perfectMonth'; tone: 'good'; count: number }
  | { kind: 'notEnoughData'; tone: 'info'; needed: number }
  | { kind: 'noPattern'; tone: 'info'; wasted: number; eaten: number };

/** Below this many closed items, patterns would just be noise. */
export const MIN_HISTORY = 5;

const closed = (items: HistoryItem[]) => items.filter((i) => i.status === 'eaten' || i.status === 'wasted');

function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, { label: T; count: number }>();
  for (const item of items) {
    const k = key(item);
    const entry = map.get(k);
    if (entry) entry.count += 1;
    else map.set(k, { label: item, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function monthStart(d: Date, offset = 0) {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

/**
 * Personal patterns from the user's own eaten / thrown-away history — plain rules, no AI.
 * Returns at most `max` insights, most useful first: problems to fix, then things going well.
 */
export function wasteInsights(items: HistoryItem[], today: Date = new Date(), max = 3): Insight[] {
  const history = closed(items);
  if (history.length < MIN_HISTORY) return [{ kind: 'notEnoughData', tone: 'info', needed: MIN_HISTORY - history.length }];

  const wasted = history.filter((i) => i.status === 'wasted');
  const eaten = history.filter((i) => i.status === 'eaten');
  const out: Insight[] = [];

  // The same product keeps going in the bin ("your yogurt usually expires before you finish it").
  const repeat = countBy(wasted, (i) => normalizeName(i.name))[0];
  if (repeat && repeat.count >= 2) out.push({ kind: 'repeatWaste', tone: 'warn', name: repeat.label.name, count: repeat.count });

  // One category is most of the waste.
  const top = countBy(wasted, (i) => i.category)[0];
  if (top && top.count >= 2 && top.count / wasted.length >= 0.4) {
    out.push({ kind: 'topWaste', tone: 'warn', category: top.label.category, count: top.count, total: wasted.length });
  }

  // This month vs last month (counts, so it works without prices).
  const inMonth = (i: HistoryItem, offset: number) => {
    const t = i.closed_at ? new Date(i.closed_at) : null;
    return !!t && t >= monthStart(today, offset) && t < monthStart(today, offset + 1);
  };
  const wastedNow = wasted.filter((i) => inMonth(i, 0)).length;
  const wastedBefore = wasted.filter((i) => inMonth(i, -1)).length;
  const eatenNow = eaten.filter((i) => inMonth(i, 0)).length;
  if (wastedBefore >= 2 && wastedNow < wastedBefore) {
    out.push({ kind: 'lessThanLastMonth', tone: 'good', percent: Math.round((1 - wastedNow / wastedBefore) * 100) });
  } else if (wastedBefore >= 2 && wastedNow > wastedBefore) {
    out.push({ kind: 'moreThanLastMonth', tone: 'warn', percent: Math.round((wastedNow / wastedBefore - 1) * 100) });
  } else if (wastedNow === 0 && eatenNow >= 3) {
    out.push({ kind: 'perfectMonth', tone: 'good', count: eatenNow });
  }

  // A category the user always finishes.
  const wastedCats = new Set(wasted.map((i) => i.category));
  const strong = countBy(
    eaten.filter((i) => !wastedCats.has(i.category)),
    (i) => i.category,
  )[0];
  if (strong && strong.count >= 3) out.push({ kind: 'strongPoint', tone: 'good', category: strong.label.category, count: strong.count });

  // Problems first, then good news; keep one good card if there is any.
  const warn = out.filter((i) => i.tone === 'warn');
  const good = out.filter((i) => i.tone === 'good');
  const result = [...warn.slice(0, good.length ? max - 1 : max), ...good].slice(0, max);
  // Enough history but nothing stands out (e.g. waste spread over many categories): say so instead of nothing.
  return result.length ? result : [{ kind: 'noPattern', tone: 'info', wasted: wasted.length, eaten: eaten.length }];
}
