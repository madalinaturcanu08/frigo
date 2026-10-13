import { describe, expect, it } from 'vitest';
import { buckets, rangeStart, totals, type ClosedItem } from '@/lib/stats';
import { wastedByCategory } from '@/lib/waste';

const item = (status: 'eaten' | 'wasted', closed: Date, price: number | null = null): ClosedItem => ({
  status,
  closed_at: closed.toISOString(),
  price_lei: price,
  category: 'dairy',
  name: 'Lapte',
});

const today = new Date(2026, 9, 14); // Wednesday 14 Oct 2026

describe('totals', () => {
  it('sums counts and lei, ignoring missing prices', () => {
    const t = totals([
      item('eaten', today, 18.5),
      item('eaten', today, null),
      item('wasted', today, 12.1),
      item('eaten', today, 0.2),
    ]);
    expect(t).toEqual({ eaten: 3, wasted: 1, savedLei: 18.7, wastedLei: 12.1, eatenRate: 0.75 });
  });
  it('has no eaten rate when nothing was closed', () => {
    expect(totals([]).eatenRate).toBeNull();
  });
});

describe('buckets', () => {
  it('groups by Monday-based weeks and keeps empty weeks', () => {
    const result = buckets(
      [
        item('eaten', new Date(2026, 9, 12, 9), 10), // Mon this week
        item('wasted', new Date(2026, 9, 11, 22), 5), // Sun last week
        item('eaten', new Date(2026, 8, 1), 99), // too old, ignored
      ],
      'week',
      3,
      today,
    );
    expect(result.map((b) => b.start)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
    expect(result[0]).toMatchObject({ eaten: 0, wasted: 0, eatenRate: null });
    expect(result[1]).toMatchObject({ wasted: 1, wastedLei: 5 });
    expect(result[2]).toMatchObject({ eaten: 1, savedLei: 10, eatenRate: 1 });
  });

  it('groups by calendar month across a year boundary', () => {
    const result = buckets([item('eaten', new Date(2027, 0, 31))], 'month', 3, new Date(2027, 1, 2));
    expect(result.map((b) => b.start)).toEqual(['2026-12-01', '2027-01-01', '2027-02-01']);
    expect(result[1].eaten).toBe(1);
  });

  it('rangeStart matches the first bucket', () => {
    expect(rangeStart('week', 8, today).getDate()).toBe(24); // Mon 24 Aug 2026
  });
});

describe('wastedByCategory', () => {
  it('ranks categories by wasted count and ignores eaten items', () => {
    const at = new Date(2026, 9, 1);
    const result = wastedByCategory([
      { ...item('wasted', at), category: 'bread' },
      { ...item('wasted', at), category: 'dairy' },
      { ...item('wasted', at), category: 'bread' },
      { ...item('eaten', at), category: 'fruit' },
    ]);
    expect(result).toEqual([
      { category: 'bread', count: 2, share: 2 / 3 },
      { category: 'dairy', count: 1, share: 1 / 3 },
    ]);
  });
});
