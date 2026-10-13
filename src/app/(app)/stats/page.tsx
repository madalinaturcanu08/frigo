import { getFormatter, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/PageHeader';
import { StatsChart } from '@/components/StatsChart';
import { SkyHero } from '@/components/SkyHero';
import { requireUser } from '@/lib/supabase/server';
import { buckets, rangeStart, totals, type ClosedItem } from '@/lib/stats';
import { wastedByCategory } from '@/lib/waste';

const COUNT = 6;

export default async function StatsPage() {
  const { supabase } = await requireUser();
  const t = await getTranslations('stats');
  const ti = await getTranslations('item');
  const format = await getFormatter();

  const now = new Date();
  const since = rangeStart('month', COUNT, now);
  const { data } = await supabase
    .from('fridge_items')
    .select('status, closed_at, price_lei, category, name')
    .neq('status', 'active')
    .gte('closed_at', since.toISOString());
  const items = (data ?? []) as ClosedItem[];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = totals(items.filter((i) => i.closed_at && new Date(i.closed_at) >= monthStart));
  const topWaste = wastedByCategory(items);
  const lei = (n: number) => format.number(n, { maximumFractionDigits: n >= 100 ? 0 : 2 });

  const cards = [
    { label: t('itemsUsed'), value: String(month.eaten), unit: '', note: t('itemsUsedNote') },
    {
      label: t('usedInTime'),
      value: month.eatenRate === null ? '—' : String(Math.round(month.eatenRate * 100)),
      unit: month.eatenRate === null ? '' : '%',
      note: t('tossedNote', { count: month.wasted }),
    },
    { label: t('moneyLost'), value: lei(month.wastedLei), unit: 'lei', note: t('moneyLostNote') },
  ];

  return (
    <>
      <PageHeader kicker={format.dateTime(now, { month: 'long', year: 'numeric' })} title={t('title')} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <SkyHero className="min-h-[150px] rounded-3xl">
          <div className="flex flex-col gap-1.5 p-5">
            <div className="font-display text-[11px] tracking-[1px] text-hero-ink uppercase">{t('moneySaved')}</div>
            <div className="flex items-baseline gap-2 text-hero-ink">
              <div className="font-pixel text-[60px] leading-none font-black">{lei(month.savedLei)}</div>
              <div className="font-bold">lei</div>
            </div>
            <div className="text-[13px] text-hero-ink">{t('moneySavedNote')}</div>
          </div>
        </SkyHero>
        {cards.map((c) => (
          <div key={c.label} className="card flex min-h-[150px] flex-col gap-1.5 rounded-3xl p-5">
            <div className="kicker">{c.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="font-pixel text-[60px] leading-none font-black">{c.value}</div>
              <div className="font-bold">{c.unit}</div>
            </div>
            <div className="mt-auto text-[13px] text-muted">{c.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-4">
        <StatsChart weeks={buckets(items, 'week', COUNT, now)} months={buckets(items, 'month', COUNT, now)} />

        <div className="card flex flex-col gap-4 rounded-[26px] p-[22px]">
          <h2 className="m-0 font-display text-[19px] font-normal">{t('tossedMost')}</h2>
          {topWaste.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">{t('nothingTossed')}</p>
          ) : (
            topWaste.map((w) => (
              <div key={w.category} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <div>{ti(`category.${w.category}`)}</div>
                  <div className="text-muted">
                    {Math.round(w.share * 100)}% · {t('itemsCount', { count: w.count })}
                  </div>
                </div>
                <div className="h-3.5 overflow-hidden rounded-full border-[1.5px] border-line bg-track">
                  <div className="h-full bg-soon" style={{ width: `${w.share * 100}%` }} />
                </div>
              </div>
            ))
          )}
          <p className="mt-auto mb-0 text-[13px] text-muted">{t('tossedMostNote')}</p>
        </div>
      </div>
    </>
  );
}
