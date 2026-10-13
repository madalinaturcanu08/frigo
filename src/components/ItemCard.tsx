'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CATEGORY_EMOJI } from '@/lib/categories';
import { daysLeft, expiryState } from '@/lib/expiry';
import type { FridgeItem } from '@/lib/types';

export type ItemCardData = Pick<
  FridgeItem,
  'id' | 'name' | 'category' | 'quantity' | 'unit' | 'storage' | 'expires_at' | 'expiry_estimated'
>;

const STATE_BG = { expired: 'bg-expired', soon: 'bg-soon', fresh: 'bg-fresh' } as const;

/** Bar length: a full bar means two weeks or more left. */
function freshnessPct(left: number) {
  return `${Math.max(4, Math.min(100, (left / 14) * 100))}%`;
}

export function ItemCard({
  item,
  onClose,
  preview = false,
}: {
  item: ItemCardData;
  onClose?: (outcome: 'eaten' | 'wasted') => void;
  preview?: boolean;
}) {
  const t = useTranslations('item');
  const left = daysLeft(item.expires_at);
  const state = expiryState(item.expires_at);

  const big = String(Math.abs(left));
  const small = left < 0 ? t('daysAgo', { count: -left }) : left === 0 ? t('today') : t('daysLeft', { count: left });

  const body = (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="stripes flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full border-2 border-line text-2xl"
      >
        {CATEGORY_EMOJI[item.category]}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate text-[17px] font-bold">{item.name}</div>
        <div className="truncate text-[13px] text-muted">
          {item.unit === 'pcs' ? `×${item.quantity}` : `${item.quantity} ${t(`units.${item.unit}`)}`} · {t(`storage.${item.storage}`)}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end" title={item.expiry_estimated ? t('estimatedHint') : undefined}>
        <div className="font-pixel text-[30px] leading-none font-black">{big}</div>
        <div className="text-xs font-semibold text-muted">
          {small}
          {item.expiry_estimated && ' ~'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="card flex flex-col gap-3.5 rounded-[22px] p-3.5">
      {preview ? (
        body
      ) : (
        <Link href={`/items/${item.id}`} className="rounded-xl" aria-label={t('edit', { name: item.name })}>
          {body}
        </Link>
      )}
      <div className="h-[7px] overflow-hidden rounded-full bg-track">
        <div className={`h-full rounded-full ${STATE_BG[state]}`} style={{ width: freshnessPct(left) }} />
      </div>
      {onClose && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onClose('eaten')}
            className="h-9 flex-1 rounded-full border-2 border-line text-[13px] font-semibold hover:bg-lime hover:text-[#121212]"
          >
            {t('usedIt')}
          </button>
          <button
            type="button"
            onClick={() => onClose('wasted')}
            className="h-9 flex-1 rounded-full border-2 border-line text-[13px] font-semibold text-muted hover:text-ink"
          >
            {t('tossed')}
          </button>
        </div>
      )}
      {preview && (
        <div className={`status-chip self-start px-3 py-[5px] text-[11px] ${STATE_BG[state]}`}>{t(`state.${state}`)}</div>
      )}
    </div>
  );
}
