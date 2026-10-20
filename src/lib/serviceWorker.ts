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

const WARM_KEY = 'frigo_warmed_at';
const MAIN_PAGES = ['/', '/add', '/recipes', '/stats', '/settings'];

/**
 * Asks the service worker to save the main pages (and the current one) for offline use.
 * At most every 10 minutes per tab, so it doesn't make the server render pages for nothing.
 */
export function warmOfflinePages(registration: ServiceWorkerRegistration | undefined) {
  // Ask whichever worker is in charge — while a new version takes over, the old and new one can differ.
  const workers = new Set([registration?.active, navigator.serviceWorker.controller].filter(Boolean));
  if (workers.size === 0 || !navigator.onLine) return;
  try {
    const last = Number(sessionStorage.getItem(WARM_KEY) || 0);
    if (Date.now() - last < 2 * 60_000) return;
    sessionStorage.setItem(WARM_KEY, String(Date.now()));
  } catch {
    // storage blocked: warm anyway
  }
  for (const w of workers) w!.postMessage({ type: 'warm', urls: [...new Set([...MAIN_PAGES, location.pathname])] });
}

export const OFFLINE_PAGES_CACHE = 'frigo-pages-v2';

/** What is saved for offline use on this device: number of pages and when the newest was saved. */
export async function offlineStatus(): Promise<{ pages: string[]; savedAt: Date | null } | null> {
  if (typeof caches === 'undefined' || !navigator.serviceWorker?.controller) return null;
  const cache = await caches.open(OFFLINE_PAGES_CACHE);
  const requests = await cache.keys();
  let newest: Date | null = null;
  for (const r of requests) {
    const date = (await cache.match(r))?.headers.get('date');
    if (date && (!newest || new Date(date) > newest)) newest = new Date(date);
  }
  return { pages: requests.map((r) => new URL(r.url).pathname), savedAt: newest };
}
