import { describe, expect, it } from 'vitest';
import { MIN_HISTORY, wasteInsights, type HistoryItem } from '@/lib/insights';
import { noWasteStreak } from '@/lib/streak';

const today = new Date(2026, 9, 20);
const at = (m: number, d: number) => new Date(2026, m, d, 12).toISOString();
const item = (name: string, category: string, status: 'eaten' | 'wasted', closed_at = at(9, 10)): HistoryItem => ({
  name, category, status, closed_at, price_lei: null,
});

describe('noWasteStreak', () => {
  it('is null before any history', () => {
    expect(noWasteStreak([], null, today)).toBeNull();
  });
  it('counts days since the last thrown-away item and remembers the best gap', () => {
    const s = noWasteStreak([new Date(2026, 9, 1), new Date(2026, 9, 14)], new Date(2026, 8, 1), today);
    expect(s).toEqual({ current: 6, best: 30 }); // 1 Sep → 1 Oct was the longest
  });
  it('counts from the first activity when nothing was ever thrown away', () => {
    expect(noWasteStreak([], new Date(2026, 9, 12), today)).toEqual({ current: 8, best: 8 });
  });
});

describe('wasteInsights', () => {
  it('asks for more history first', () => {
    expect(wasteInsights([item('Lapte', 'dairy', 'eaten')], today)).toEqual([
      { kind: 'notEnoughData', tone: 'info', needed: MIN_HISTORY - 1 },
    ]);
  });

  it('spots a product that keeps being thrown away and the category wasted most', () => {
    const history = [
      item('Iaurt', 'dairy', 'wasted'),
      item('iaurt ', 'dairy', 'wasted'),
      item('Pâine', 'bread', 'wasted'),
      item('Mere', 'fruit', 'eaten'),
      item('Mere', 'fruit', 'eaten'),
      item('Pere', 'fruit', 'eaten'),
    ];
    const kinds = wasteInsights(history, today).map((i) => i.kind);
    expect(kinds).toEqual(['repeatWaste', 'topWaste', 'strongPoint']);
    expect(wasteInsights(history, today)[0]).toMatchObject({ name: 'Iaurt', count: 2 });
  });

  it('compares this month with last month', () => {
    const history = [
      item('a', 'other', 'wasted', at(8, 5)),
      item('b', 'other', 'wasted', at(8, 6)),
      item('c', 'other', 'wasted', at(8, 7)),
      item('d', 'other', 'wasted', at(8, 8)),
      item('e', 'other', 'wasted', at(9, 3)),
    ];
    expect(wasteInsights(history, today)).toContainEqual({ kind: 'lessThanLastMonth', tone: 'good', percent: 75 });
  });

  it('says when there is history but no clear pattern', () => {
    const history = [
      item('a', 'dairy', 'wasted'),
      item('b', 'cheese', 'wasted'),
      item('c', 'eggs', 'wasted'),
      item('d', 'fruit', 'eaten'),
      item('e', 'bread', 'eaten'),
    ];
    expect(wasteInsights(history, today)).toEqual([{ kind: 'noPattern', tone: 'info', wasted: 3, eaten: 2 }]);
  });

  it('celebrates a month with nothing thrown away', () => {
    const history = ['a', 'b', 'c', 'd', 'e'].map((n) => item(n, 'fruit', 'eaten'));
    expect(wasteInsights(history, today).map((i) => i.kind)).toEqual(['perfectMonth', 'strongPoint']);
  });
});
