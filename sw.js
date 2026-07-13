const CACHE_NAME = 'gameverse-v5';

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
    './vendor/fontawesome/css/all.min.css',
    './vendor/fontawesome/webfonts/fa-solid-900.woff2',
    './vendor/fontawesome/webfonts/fa-regular-400.woff2',
    './vendor/fontawesome/webfonts/fa-brands-400.woff2'
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

    event.respondWith(
        fetch(event.request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            return response;
        }).catch(async () => {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            if (event.request.mode === 'navigate') return caches.match('./index.html');
            return Response.error();
        })
    );
});
