'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { offlineStatus } from '@/lib/serviceWorker';

type Status = Awaited<ReturnType<typeof offlineStatus>> | 'loading';

const PAGE_KEYS: Record<string, string> = { '/': 'fridge', '/add': 'add', '/recipes': 'recipes', '/stats': 'stats', '/settings': 'settings' };

/** Settings → Offline: which pages this device has saved, so you know offline will work before you need it. */
export function OfflineStatus() {
  const t = useTranslations('offline');
  const tn = useTranslations('nav');
  const format = useFormatter();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let alive = true;
    // Pages are saved in the background right after opening Frigo, so look again a few times.
    const check = () => offlineStatus().then((s) => alive && setStatus(s)).catch(() => alive && setStatus(null));
    check();
    const timers = [2000, 6000, 15000].map((ms) => setTimeout(check, ms));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  if (process.env.NODE_ENV !== 'production') return <p className="m-0 text-[15px] text-muted">{t('devOnly')}</p>;
  if (status === 'loading') return <p className="m-0 text-[15px] text-muted">…</p>;
  if (!status || status.pages.length === 0) return <p className="m-0 text-[15px]">{t('notSaved')}</p>;

  const names = status.pages.flatMap((p) => (PAGE_KEYS[p] ? [tn(PAGE_KEYS[p])] : []));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="h-2.5 w-2.5 rounded-full border border-edge bg-fresh" />
        {t('saved', { count: names.length })}
        {status.savedAt && <span className="font-normal text-muted">· {t('updated', { time: format.dateTime(status.savedAt, { hour: '2-digit', minute: '2-digit' }) })}</span>}
      </div>
      <p className="m-0 text-sm text-muted">{names.join(' · ')}</p>
      <p className="m-0 text-sm text-muted">{t('howTo')}</p>
    </div>
  );
}
