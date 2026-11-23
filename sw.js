// Service worker: makes Ritmo installable and lets it open without a connection.
// Network first, so a new version is picked up right away; the cache is the fallback.
const CACHE = 'ritmo-v7';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png', 'assets/badge-96.png',
  'js/app.js', 'js/store.js', 'js/engine.js', 'js/ui.js', 'js/icons.js', 'js/md.js', 'js/timer.js', 'js/stickers.js', 'js/charts.js',
  'js/config.js', 'js/push.js', 'js/backend-firebase.js', 'js/backend-demo.js', 'js/programs/index.js', 'js/programs/rugplan.js', 'js/content/theory.sealed.js',
  'js/views/today.js', 'js/views/gym.js', 'js/views/progress.js', 'js/views/theory.js', 'js/views/settings.js', 'js/views/info.js', 'js/views/tests.js', 'js/views/aftercheck.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});

// Daily notifications, sent by the scheduled task in ritmo-meldingen through Firebase Cloud
// Messaging. The message carries its text in data; the worker shows it.
self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = { body: event.data ? event.data.text() : '' }; }
  const d = p.data || p.notification || p;
  event.waitUntil(self.registration.showNotification(d.title || 'Ritmo', {
    body: d.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/badge-96.png',
    tag: d.tag || 'ritmo',
    renotify: true,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
