'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CATEGORY_EMOJI, type Category } from '@/lib/categories';
import { celebrate } from '@/lib/celebrate';
import { daysLeft, expiryState } from '@/lib/expiry';
import type { FridgeItem } from '@/lib/types';

export type ItemCardData = Pick<
  FridgeItem,
  'id' | 'name' | 'category' | 'quantity' | 'unit' | 'storage' | 'expires_at' | 'expiry_estimated'
>;

/** A colour per category for the round icon (hue in OKLCH), mixed with the card colour so it works in both themes. */
const CATEGORY_HUE: Record<Category, number> = {
  dairy: 240,
  cheese: 90,
  eggs: 70,
  meat: 15,
  fish: 210,
  vegetables: 140,
  fruit: 40,
  bread: 60,
  leftovers: 300,
  sauces: 25,
  drinks: 330,
  other: 260,
};
export const categoryTint = (c: Category) =>
  `color-mix(in oklch, oklch(0.8 ${c === 'other' ? 0.03 : 0.14} ${CATEGORY_HUE[c]}) 45%, var(--card))`;

const STATE_BG = { expired: 'bg-expired', soon: 'bg-soon', fresh: 'bg-fresh' } as const;

/** Bar length: a full bar means two weeks or more left. */
function freshnessPct(left: number) {
  return `${Math.max(4, Math.min(100, (left / 14) * 100))}%`;
}

export function ItemCard({
  item,
  onClose,
  preview = false,
  index = 0,
}: {
  item: ItemCardData;
  onClose?: (outcome: 'eaten' | 'wasted') => void;
  preview?: boolean;
  /** position in the list, so the cards slide in one after another */
  index?: number;
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
        className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full border-2 border-line text-2xl"
        style={{ background: categoryTint(item.category) }}
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
    <div className="card rise flex flex-col gap-3.5 rounded-[22px] p-3.5" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
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
            onClick={(e) => {
              celebrate(e.currentTarget);
              onClose('eaten');
            }}
            className="h-9 flex-1 rounded-full border-2 border-line text-[13px] font-semibold hover:bg-lime hover:text-[#121212] active:scale-95"
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
