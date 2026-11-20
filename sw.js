// Service worker: makes Ritmo installable and lets it open without a connection.
// Network first, so a new version is picked up right away; the cache is the fallback.
const CACHE = 'ritmo-v4';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png',
  'js/app.js', 'js/store.js', 'js/engine.js', 'js/ui.js', 'js/icons.js', 'js/md.js', 'js/timer.js', 'js/stickers.js', 'js/charts.js',
  'js/config.js', 'js/backend-firebase.js', 'js/backend-demo.js', 'js/programs/index.js', 'js/programs/rugplan.js', 'js/content/theory.sealed.js',
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
