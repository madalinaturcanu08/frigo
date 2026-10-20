'use client';

/**
 * Registers /sw.js once for the whole app. In production the worker also keeps pages and files for offline
 * use (?cache=1); in development it only handles notifications, so it never serves stale code while coding.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const url = process.env.NODE_ENV === 'production' ? '/sw.js?cache=1' : '/sw.js';
  await navigator.serviceWorker.register(url);
  return navigator.serviceWorker.ready;
}

/** Forget cached pages — called on the logged-out screens so the next person can't see the last user's fridge. */
export function clearOfflinePages() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'clear-pages' });
}
