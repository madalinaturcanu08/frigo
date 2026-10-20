import { describe, expect, it } from 'vitest';
import { closedIds, enqueue, validOps, type OfflineOp } from '@/lib/offlineQueue';

const now = new Date('2026-10-20T12:00:00Z');
const close = (itemId: string, outcome: 'eaten' | 'wasted', at = '2026-10-20T11:00:00Z'): OfflineOp => ({
  kind: 'close', opId: `${itemId}-${outcome}`, itemId, outcome, at,
});
const add = (name: string, at = '2026-10-20T11:00:00Z'): OfflineOp => ({
  kind: 'add', opId: name, at,
  item: { name, category: 'dairy', quantity: 1, unit: 'pcs', storage: 'fridge', price_lei: null, expires_at: null },
});

describe('enqueue', () => {
  it('keeps only the latest outcome when an item is closed twice', () => {
    const q = enqueue(enqueue([], close('a', 'eaten')), close('a', 'wasted'));
    expect(q).toEqual([close('a', 'wasted')]);
  });
  it('keeps adds in order', () => {
    expect(enqueue(enqueue([], add('Lapte')), add('Ouă')).map((o) => o.opId)).toEqual(['Lapte', 'Ouă']);
  });
});

describe('closedIds', () => {
  it('lists items closed offline', () => {
    expect([...closedIds([close('a', 'eaten'), add('x'), close('b', 'wasted')])]).toEqual(['a', 'b']);
  });
});

describe('validOps', () => {
  it('drops malformed, future and too-old changes', () => {
    const ops = [
      close('ok', 'eaten'),
      close('future', 'eaten', '2026-10-21T12:00:00Z'),
      close('old', 'eaten', '2026-09-01T12:00:00Z'),
      { kind: 'close', opId: 'x', itemId: 'y', outcome: 'maybe', at: '2026-10-20T11:00:00Z' },
      add('  '),
      add('Lapte'),
      'nonsense',
    ];
    expect(validOps(ops, now).map((o) => o.opId)).toEqual(['ok-eaten', 'Lapte']);
    expect(validOps('not an array', now)).toEqual([]);
  });
});
