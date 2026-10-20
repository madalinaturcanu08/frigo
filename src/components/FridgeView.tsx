'use client';

import Link from 'next/link';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { closeItem, reopenItem } from '@/app/actions/items';
import { SOON_DAYS, expiryState, sortByExpiry, type ExpiryState } from '@/lib/expiry';
import { itemsToUse, nameList } from '@/lib/reminders';
import { closedIds, newOpId, pushOp, readQueue, writeQueue } from '@/lib/offlineQueue';
import { useOfflineQueue } from '@/lib/useOfflineQueue';
import { ItemCard, type ItemCardData } from './ItemCard';
import { SkyHero } from './SkyHero';
import { Toast } from './Toast';

type Filter = 'all' | ExpiryState;
const GROUPS: ExpiryState[] = ['expired', 'soon', 'fresh'];
const DOT: Record<Filter, string> = { all: 'bg-lime', soon: 'bg-soon', expired: 'bg-expired', fresh: 'bg-fresh' };
const CHIP: Record<ExpiryState, string> = { expired: 'bg-expired', soon: 'bg-soon', fresh: 'bg-fresh' };

export function FridgeView({ items }: { items: ItemCardData[] }) {
  const t = useTranslations('fridge');
  const tb = useTranslations('banner');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<{ message: string; undoId?: string } | null>(null);
  const [, startTransition] = useTransition();
  const [visible, hide] = useOptimistic(items, (list, id: string) => list.filter((i) => i.id !== id));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flash(message: string, undoId?: string) {
    clearTimeout(timer.current);
    setToast({ message, undoId });
    timer.current = setTimeout(() => setToast(null), 4000);
  }

  function close(item: ItemCardData, outcome: 'eaten' | 'wasted') {
    const message = t(outcome === 'eaten' ? 'savedToast' : 'tossedToast', { name: item.name });
    if (!navigator.onLine) {
      // Offline: remember it on the device; it is sent (with this time) once the connection is back.
      pushOp({ kind: 'close', opId: newOpId(), itemId: item.id, outcome, at: new Date().toISOString() });
      return flash(message, item.id);
    }
    startTransition(async () => {
      hide(item.id);
      await closeItem(item.id, outcome);
    });
    flash(message, item.id);
  }

  function undo(id: string) {
    setToast(null);
    const queued = readQueue();
    if (queued.some((op) => op.kind === 'close' && op.itemId === id)) {
      writeQueue(queued.filter((op) => !(op.kind === 'close' && op.itemId === id)));
      return;
    }
    startTransition(() => reopenItem(id));
  }

  const queue = useOfflineQueue();
  const closedOffline = closedIds(queue);
  const addedOffline = queue.flatMap((op) => (op.kind === 'add' ? [op] : []));
  const sorted = sortByExpiry(visible.filter((i) => !closedOffline.has(i.id)));
  const byState = (s: ExpiryState) => sorted.filter((i) => expiryState(i.expires_at) === s);
  const counts = { all: sorted.length, soon: byState('soon').length, expired: byState('expired').length, fresh: byState('fresh').length };
  const needYou = counts.soon + counts.expired;
  const reminder = nameList(itemsToUse(sorted));

  return (
    <div className="flex flex-col gap-[26px]">
      {needYou > 0 && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-[20px] border-2 border-edge bg-soon px-4 py-3 text-[#121212] shadow-card"
        >
          <span aria-hidden className="text-xl">
            🔔
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-[11px] tracking-[1px] uppercase">{tb('label')}</span>
            <span className="truncate text-[15px] font-semibold">
              {reminder.rest > 0 ? tb('more', { names: reminder.names, count: reminder.rest }) : reminder.names}
            </span>
          </span>
        </div>
      )}

      <SkyHero className="min-h-[230px]">
        <div className="flex flex-col gap-[18px] px-[30px] py-7 max-sm:px-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="font-pixel text-[110px] leading-[0.82] font-black text-hero-ink max-sm:text-[86px]">
              {String(needYou).padStart(2, '0')}
            </div>
            <div className="pb-1.5 font-display text-[clamp(22px,2.6vw,30px)] leading-[1.05] whitespace-pre-line text-hero-ink">
              {t('heroLine', { count: needYou })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {needYou > 0 ? (
              <>
                <Link href="/recipes" className="btn-lime">
                  {t('cookCta')}
                </Link>
                <Link href="/add" className="btn-ghost">
                  {t('addShort')}
                </Link>
              </>
            ) : (
              <>
                <Link href="/add" className="btn-lime">
                  {t('addCta')}
                </Link>
                <Link href="/recipes" className="btn-ghost">
                  {t('recipesCta')}
                </Link>
              </>
            )}
          </div>
        </div>
      </SkyHero>

      {addedOffline.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 self-start rounded-full border-2 border-line bg-track px-3.5 py-1.5 font-display text-xs font-normal tracking-[1px] uppercase">
            {t('addedOffline')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {addedOffline.map((op) => (
              <span key={op.opId} className="pill cursor-default border-dashed">
                {op.item.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-[26px] border-2 border-dashed border-line p-10 text-center text-[15px] text-muted">
          {t('empty')}{' '}
          <Link href="/add" className="font-semibold text-ink underline">
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('filterLabel')}>
            {(['all', 'soon', 'expired', 'fresh'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                onClick={() => setFilter(f)}
                className={`pill ${filter === f ? 'is-on' : ''}`}
              >
                <span className={`h-[9px] w-[9px] rounded-full border border-edge ${DOT[f]}`} />
                <span>{t(`filter.${f}`)}</span>
                <span className="opacity-60">{counts[f]}</span>
              </button>
            ))}
          </div>

          {GROUPS.filter((g) => filter === 'all' || filter === g).map((g) => {
            const list = byState(g);
            if (list.length === 0) return null;
            return (
              <section key={g} className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <h2 className={`status-chip m-0 font-normal ${CHIP[g]}`}>
                    {t(`filter.${g}`)} · {list.length}
                  </h2>
                  <div className="text-sm text-muted">{t(`note.${g}`, { days: SOON_DAYS })}</div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
                  {list.map((item) => (
                    <ItemCard key={item.id} item={item} onClose={(o) => close(item, o)} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {toast && (
        <Toast
          message={toast.message}
          action={toast.undoId ? { label: t('undo'), onClick: () => undo(toast.undoId!) } : undefined}
        />
      )}
    </div>
  );
}
