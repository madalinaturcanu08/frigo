'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { syncOffline } from '@/app/actions/items';
import { readQueue, writeQueue } from '@/lib/offlineQueue';
import { useOfflineQueue, useOnline } from '@/lib/useOfflineQueue';
import { registerServiceWorker } from '@/lib/serviceWorker';

/**
 * Shows when Frigo is offline or has changes waiting, and sends them as soon as the connection is back.
 * Also registers the service worker that keeps pages readable offline.
 */
export function OfflineSync() {
  const t = useTranslations('offline');
  const router = useRouter();
  const queue = useOfflineQueue();
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    registerServiceWorker().catch(() => {});
  }, []);

  useEffect(() => {
    if (!online || queue.length === 0 || busy.current) return;
    busy.current = true;
    const sending = readQueue();
    Promise.resolve()
      .then(() => setSyncing(true))
      .then(() => syncOffline(sending))
      .then(({ done }) => {
        const finished = new Set(done);
        // keep anything queued while we were syncing, plus whatever didn't make it
        writeQueue(readQueue().filter((op) => !finished.has(op.opId)));
        router.refresh();
      })
      .catch(() => {}) // still unreachable: try again on the next "online" event
      .finally(() => {
        busy.current = false;
        setSyncing(false);
      });
  }, [online, queue, router]);

  if (online && queue.length === 0) return null;

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-[20px] border-2 px-4 py-3 text-sm font-semibold ${
        online ? 'border-line bg-card' : 'border-edge bg-ink text-bg'
      }`}
    >
      <span aria-hidden className="text-lg">
        {online ? '↻' : '⚡'}
      </span>
      <span>
        {online
          ? syncing
            ? t('syncing', { count: queue.length })
            : t('waiting', { count: queue.length })
          : t('offline', { count: queue.length })}
      </span>
    </div>
  );
}
