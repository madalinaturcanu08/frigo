'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { QUEUE_EVENT, QUEUE_KEY, validOps, type OfflineOp } from './offlineQueue';

function subscribe(onChange: () => void) {
  window.addEventListener(QUEUE_EVENT, onChange);
  window.addEventListener('storage', onChange); // another tab changed it
  return () => {
    window.removeEventListener(QUEUE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function snapshot() {
  try {
    return localStorage.getItem(QUEUE_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

/** The changes waiting on this device, re-rendering whenever they change. */
export function useOfflineQueue(): OfflineOp[] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '[]');
  return useMemo(() => {
    try {
      return validOps(JSON.parse(raw));
    } catch {
      return [];
    }
  }, [raw]);
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
