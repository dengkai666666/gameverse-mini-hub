const CACHE_NAME = 'gameverse-v8';

const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './game-cards.css',
    './game-page.css',
    './script.js',
    './translations.js',
    './memory-game.js',
    './snake.html',
    './snake.js',
    './tic-tac-toe.html',
    './tic-tac-toe.js',
    './2048.html',
    './2048.css',
    './2048-anim.js',
    './flappy-bird.html',
    './flappy-bird.js',
    './solitaire.html',
    './solitaire.css',
    './solitaire.js',
    './favicon.svg',
    './site.webmanifest',
    './assets/gameverse-preview.webp',
    './vendor/fontawesome/css/icons.min.css',
    './vendor/fontawesome/webfonts/fa-solid-900-slim.woff2',
    './vendor/fontawesome/webfonts/fa-brands-400-slim.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key.startsWith('gameverse-') && key !== CACHE_NAME)
                .map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    const fetchAndCache = () => fetch(event.request).then(response => {
        if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
    });

    // 页面导航保持网络优先以确保内容新鲜；静态资源缓存优先并后台更新（stale-while-revalidate）
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetchAndCache().catch(async () =>
                (await caches.match(event.request)) || caches.match('./index.html')
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetchAndCache();
            if (cached) {
                network.catch(() => {});
                return cached;
            }
            return network.catch(() => Response.error());
        })
    );
});
