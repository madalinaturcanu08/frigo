import { describe, expect, it } from 'vitest';
import { daysLeft, estimateExpiry, expiryState, sortByExpiry } from '@/lib/expiry';

const today = new Date(2026, 9, 13); // 13 Oct 2026

describe('expiryState', () => {
  it('is expired the day after the expiry date', () => {
    expect(expiryState('2026-10-12', today)).toBe('expired');
  });
  it('is "use soon" today, tomorrow and in 2 days', () => {
    expect(expiryState('2026-10-13', today)).toBe('soon');
    expect(expiryState('2026-10-14', today)).toBe('soon');
    expect(expiryState('2026-10-15', today)).toBe('soon');
  });
  it('is fresh from 3 days on', () => {
    expect(expiryState('2026-10-16', today)).toBe('fresh');
  });
});

describe('daysLeft', () => {
  it('counts across a month boundary and DST change', () => {
    expect(daysLeft('2026-11-02', today)).toBe(20);
  });
});

describe('estimateExpiry', () => {
  it('adds shelf-life days to the day the item was added', () => {
    expect(estimateExpiry(7, today)).toBe('2026-10-20');
    expect(estimateExpiry(30, new Date(2026, 11, 15))).toBe('2027-01-14');
  });
});

describe('sortByExpiry', () => {
  it('puts the soonest first and does not mutate the input', () => {
    const items = [
      { name: 'b', expires_at: '2026-10-20' },
      { name: 'a', expires_at: '2026-10-14' },
      { name: 'c', expires_at: '2026-10-14' },
    ];
    expect(sortByExpiry(items).map((i) => i.name)).toEqual(['a', 'c', 'b']);
    expect(items[0].name).toBe('b');
  });
});
