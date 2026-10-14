import { describe, expect, it } from 'vitest';
import { itemsToUse, nameList, todayInChisinau } from '@/lib/reminders';

const today = new Date(2026, 9, 14);
const items = [
  { name: 'Mere', expires_at: '2026-10-30' },
  { name: 'Lapte', expires_at: '2026-10-14' },
  { name: 'Spanac', expires_at: '2026-10-12' },
  { name: 'Telemea', expires_at: '2026-10-16' },
  { name: 'Iaurt', expires_at: '2026-10-17' },
];

describe('itemsToUse', () => {
  it('keeps expired and use-soon items, soonest first', () => {
    expect(itemsToUse(items, today).map((i) => i.name)).toEqual(['Spanac', 'Lapte', 'Telemea']);
  });
});

describe('nameList', () => {
  it('lists up to 3 names and counts the rest', () => {
    expect(nameList(items)).toEqual({ names: 'Mere, Lapte, Spanac', rest: 2 });
    expect(nameList(items.slice(0, 2))).toEqual({ names: 'Mere, Lapte', rest: 0 });
  });
});

describe('todayInChisinau', () => {
  it('uses the Moldovan date even when UTC is still on the previous day', () => {
    // 22:30 UTC on 13 Oct is 01:30 on 14 Oct in Chișinău (UTC+3 in summer time)
    const d = todayInChisinau(new Date(Date.UTC(2026, 9, 13, 22, 30)));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 14]);
  });
});
