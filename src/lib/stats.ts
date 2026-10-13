import { addDays, parseISODate, startOfWeek, toISODate } from './dates';
import type { FridgeItem } from './types';

export type Period = 'week' | 'month';

export type ClosedItem = Pick<FridgeItem, 'status' | 'closed_at' | 'price_lei' | 'category' | 'name'>;

export interface Totals {
  eaten: number;
  wasted: number;
  /** lei of food that was eaten instead of thrown away */
  savedLei: number;
  /** lei of food that was thrown away */
  wastedLei: number;
  /** 0–1, share of closed items that were eaten; null when nothing was closed */
  eatenRate: number | null;
}

export interface Bucket extends Totals {
  /** first day of the bucket, YYYY-MM-DD */
  start: string;
}

function emptyTotals(): Totals {
  return { eaten: 0, wasted: 0, savedLei: 0, wastedLei: 0, eatenRate: null };
}

function add(t: Totals, item: ClosedItem) {
  const lei = item.price_lei ?? 0;
  if (item.status === 'eaten') {
    t.eaten += 1;
    t.savedLei += lei;
  } else if (item.status === 'wasted') {
    t.wasted += 1;
    t.wastedLei += lei;
  }
}

function finish<T extends Totals>(t: T): T {
  const closed = t.eaten + t.wasted;
  t.eatenRate = closed === 0 ? null : t.eaten / closed;
  t.savedLei = Math.round(t.savedLei * 100) / 100;
  t.wastedLei = Math.round(t.wastedLei * 100) / 100;
  return t;
}

export function totals(items: ClosedItem[]): Totals {
  const t = emptyTotals();
  for (const item of items) add(t, item);
  return finish(t);
}

function bucketStart(d: Date, period: Period): Date {
  return period === 'week' ? startOfWeek(d) : new Date(d.getFullYear(), d.getMonth(), 1);
}

function nextBucket(d: Date, period: Period): Date {
  return period === 'week' ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** The last `count` weeks or months (oldest first), including empty ones, ending with the current one. */
export function buckets(
  items: ClosedItem[],
  period: Period,
  count: number,
  today: Date = new Date(),
): Bucket[] {
  let start = bucketStart(today, period);
  for (let i = 1; i < count; i++) {
    start = period === 'week' ? addDays(start, -7) : new Date(start.getFullYear(), start.getMonth() - 1, 1);
  }

  const result: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let i = 0, d = start; i < count; i++, d = nextBucket(d, period)) {
    const b: Bucket = { start: toISODate(d), ...emptyTotals() };
    result.push(b);
    index.set(b.start, b);
  }

  for (const item of items) {
    if (!item.closed_at) continue;
    const key = toISODate(bucketStart(new Date(item.closed_at), period));
    const b = index.get(key);
    if (b) add(b, item);
  }
  return result.map(finish);
}

/** Earliest date that `buckets(…, period, count)` covers — use it to limit the database query. */
export function rangeStart(period: Period, count: number, today: Date = new Date()): Date {
  return parseISODate(buckets([], period, count, today)[0].start);
}
