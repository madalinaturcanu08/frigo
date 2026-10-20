'use client';

import { useEffect } from 'react';
import { clearOfflinePages } from '@/lib/serviceWorker';

/** On the logged-out screens: drop pages kept for offline use, so they never show the previous user's data. */
export function ClearOfflineCache() {
  useEffect(() => {
    clearOfflinePages();
    try {
      localStorage.removeItem('frigo_offline_queue_v1');
    } catch {
      // storage blocked: nothing to clear
    }
  }, []);
  return null;
}
