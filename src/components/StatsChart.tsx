'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseISODate } from '@/lib/dates';
import type { Bucket, Period } from '@/lib/stats';

const EDGE = '#121212';

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bucket & { label: string } }[] }) {
  const t = useTranslations('stats');
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="rounded-2xl border-2 border-line bg-card px-3.5 py-2.5 text-sm shadow-card">
      <div className="mb-1 font-bold">{b.label}</div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-[3px] border border-edge bg-fresh" />
        {t('used')}: <b>{b.eaten}</b>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-[3px] border border-edge bg-expired" />
        {t('tossed')}: <b>{b.wasted}</b>
      </div>
    </div>
  );
}

export function StatsChart({ weeks, months }: { weeks: Bucket[]; months: Bucket[] }) {
  const t = useTranslations('stats');
  const format = useFormatter();
  const [period, setPeriod] = useState<Period>('week');

  const data = (period === 'week' ? weeks : months).map((b, i, all) => ({
    ...b,
    label:
      i === all.length - 1
        ? t(period === 'week' ? 'thisWeek' : 'thisMonth')
        : format.dateTime(parseISODate(b.start), period === 'week' ? { day: 'numeric', month: 'short' } : { month: 'short' }),
  }));

  return (
    <div className="card flex flex-col gap-[18px] rounded-[26px] p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="m-0 font-display text-[19px] font-normal">{t(period === 'week' ? 'chartWeek' : 'chartMonth')}</h2>
        <div className="flex gap-0.5 rounded-full border-2 border-line p-[3px]" role="radiogroup" aria-label={t('period')}>
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={`h-8 rounded-full px-3.5 text-[13px] font-semibold ${period === p ? 'bg-ink text-bg' : ''}`}
            >
              {t(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3.5 text-[13px] font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] border border-edge bg-fresh" />
          {t('used')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] border border-edge bg-expired bg-[repeating-linear-gradient(45deg,transparent_0_2px,rgba(0,0,0,0.35)_2px_3px)]" />
          {t('tossed')}
        </div>
      </div>

      <div className="h-[220px]" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="22%">
            <defs>
              <pattern id="tossed-texture" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--expired)" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--track)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--line)', strokeWidth: 2 }}
              tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--track)', opacity: 0.6 }} />
            <Bar dataKey="eaten" stackId="a" fill="var(--fresh)" stroke={EDGE} strokeWidth={1.5} />
            <Bar dataKey="wasted" stackId="a" fill="url(#tossed-texture)" stroke={EDGE} strokeWidth={1.5} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-muted">{t('showTable')}</summary>
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-semibold">{t(period)}</th>
              <th className="py-1 font-semibold">{t('used')}</th>
              <th className="py-1 font-semibold">{t('tossed')}</th>
              <th className="py-1 font-semibold">{t('savedLei')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.start} className="border-t border-track">
                <td className="py-1">{b.label}</td>
                <td className="py-1">{b.eaten}</td>
                <td className="py-1">{b.wasted}</td>
                <td className="py-1">{format.number(b.savedLei, { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
