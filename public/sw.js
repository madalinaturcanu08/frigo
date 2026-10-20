// Frigo service worker.
// 1. Shows the daily reminder notification (always).
// 2. When registered as /sw.js?cache=1 (production only), keeps pages and files so Frigo opens offline:
//    pages are network-first (fresh when online, last copy when offline), built files and photos cache-first.
// No install prompt — Frigo stays a website.

const CACHING = new URL(self.location.href).searchParams.get('cache') === '1';
const PAGES = 'frigo-pages-v1';
const STATIC = 'frigo-static-v1';
const KEEP = [PAGES, STATIC];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n) || !CACHING).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Saves a fresh copy of the given pages. Needed because moving between tabs inside Frigo doesn't load
// whole pages, so without this only the very first page (if any) would be available offline.
async function warmPages(urls) {
  const cache = await caches.open(PAGES);
  await Promise.all(
    urls.map(async (path) => {
      const url = new URL(path, self.location.origin);
      if (url.origin !== self.location.origin) return;
      try {
        const response = await fetch(url, { credentials: 'same-origin', redirect: 'follow' });
        if (response.ok && !response.redirected) await cache.put(url.pathname, response);
      } catch {
        // offline or slow: keep the copy we already have
      }
    }),
  );
}

self.addEventListener('message', (event) => {
  // Sent from the logged-out screens: the next person must not see the last user's fridge offline.
  if (event.data?.type === 'clear-pages') event.waitUntil(caches.delete(PAGES));
  if (event.data?.type === 'warm' && CACHING && Array.isArray(event.data.urls)) {
    event.waitUntil(warmPages(event.data.urls.slice(0, 10)));
  }
});

function isStaticFile(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/photos/') ||
    url.pathname === '/icon'
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    // Only keep real pages, never redirects (e.g. to the login screen).
    if (response.ok && !response.redirected) (await caches.open(PAGES)).put(new URL(request.url).pathname, response.clone());
    return response;
  } catch {
    const cache = await caches.open(PAGES);
    return (
      (await cache.match(new URL(request.url).pathname, { ignoreVary: true })) ||
      (await cache.match('/', { ignoreVary: true })) ||
      new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
          '<title>Frigo</title><body style="font-family:system-ui;padding:2rem;text-align:center">' +
          '<h1>Frigo</h1><p>You are offline, and this page was not saved yet.</p>' +
          '<p><a href="/">Open the fridge</a> · Open Frigo once while online so it can work offline next time.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
      )
    );
  }
}

self.addEventListener('fetch', (event) => {
  if (!CACHING) return;
  const { request } = event;
  if (request.method !== 'GET') return; // server actions (POST) always go to the network
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  if (isStaticFile(url)) event.respondWith(cacheFirst(request));
  else if (request.mode === 'navigate') event.respondWith(networkFirstPage(request));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Frigo', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Frigo', {
      body: data.body || '',
      icon: '/icon',
      tag: 'frigo-daily', // a new reminder replaces yesterday's instead of piling up
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((w) => (w || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
