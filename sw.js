// Service Worker: speichert die ganze App beim ersten Besuch, danach läuft sie ohne Netz.
// Der Block zwischen den Marken wird von tools/precache.mjs erzeugt (node tools/precache.mjs).

// >>> precache
const VERSION = '91cd2af59a';
const ASSETS = [
  './',
  './assets/audio/glocke.mp3',
  './assets/audio/gong.mp3',
  './assets/audio/hahn.mp3',
  './assets/audio/nacht-1.mp3',
  './assets/audio/nacht-2.mp3',
  './assets/audio/sieg.mp3',
  './assets/audio/tag-1.mp3',
  './assets/audio/tag-2.mp3',
  './assets/audio/tod.mp3',
  './assets/audio/wolf.mp3',
  './assets/css/app.css',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/icon.svg',
  './assets/portraits/actor.webp',
  './assets/portraits/angel.webp',
  './assets/portraits/arsonist.webp',
  './assets/portraits/bear.webp',
  './assets/portraits/bigwolf.webp',
  './assets/portraits/brothers.webp',
  './assets/portraits/captain.webp',
  './assets/portraits/cupid.webp',
  './assets/portraits/elder.webp',
  './assets/portraits/fox.webp',
  './assets/portraits/girl.webp',
  './assets/portraits/greis.webp',
  './assets/portraits/guard.webp',
  './assets/portraits/hunter.webp',
  './assets/portraits/idiot.webp',
  './assets/portraits/judge.svg',
  './assets/portraits/knight.webp',
  './assets/portraits/maid.webp',
  './assets/portraits/medium.webp',
  './assets/portraits/piper.webp',
  './assets/portraits/puresoul.webp',
  './assets/portraits/raven.webp',
  './assets/portraits/scapegoat.webp',
  './assets/portraits/seer.webp',
  './assets/portraits/sisters.webp',
  './assets/portraits/thief.webp',
  './assets/portraits/urwolf.webp',
  './assets/portraits/villager.webp',
  './assets/portraits/whitewolf.webp',
  './assets/portraits/wildchild.webp',
  './assets/portraits/witch.webp',
  './assets/portraits/wolf.webp',
  './assets/portraits/wolfdog.webp',
  './index.html',
  './manifest.webmanifest',
  './src/audio-files.js',
  './src/audio.js',
  './src/engine/events.js',
  './src/engine/game.js',
  './src/engine/roles.js',
  './src/engine/town.js',
  './src/main.js',
  './src/store-ref.js',
  './src/store.js',
  './src/ui/art.js',
  './src/ui/cards.js',
  './src/ui/core.js',
  './src/ui/diagnose.js',
  './src/ui/game.js',
  './src/ui/home.js',
  './src/ui/icons.js',
  './src/ui/install.js',
  './src/ui/lock.js',
  './src/ui/modals.js',
  './src/ui/pages.js',
  './src/ui/protocol.js',
  './src/ui/saves.js',
  './src/ui/scene.js',
  './src/ui/setup.js',
  './src/ui/town.js',
  './src/viewport.js',
];
// <<< precache

const CACHE_PREFIX = 'werwolf-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data === 'STATUS' && event.ports[0]) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = (await cache.keys()).length;
        event.ports[0].postMessage({ version: VERSION, expected: ASSETS.length, cached });
      })(),
    );
  }
});

/** Safari und Chrome laden Audio stückweise (Range). Aus dem Speicher muss dann ein 206 mit dem passenden Ausschnitt kommen. */
async function rangeResponse(request, hit) {
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  if (!m) return hit;
  const buf = await hit.arrayBuffer(), size = buf.byteLength;
  let start = m[1] ? Number(m[1]) : 0, end = m[2] ? Number(m[2]) : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return request.headers.has('range') ? rangeResponse(request, hit) : hit;
      try {
        return await fetch(request);
      } catch (err) {
        if (request.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
