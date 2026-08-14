const CACHE_NAME = 'skillox-app-cache-v1';
const PDF_CACHE_NAME = 'skillox-pdf-cache-v1';

// Core assets to pre-cache instantly
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/signup.html',
    '/textbooks.html',
    '/styles.css',
    '/script.js',
    '/pdf-list.json'
];

// Install Event: Pre-cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[ServiceWorker] Pre-caching core assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== PDF_CACHE_NAME) {
                        console.log('[ServiceWorker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Network-First for APIs, Cache-First for PDFs and Static Assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip caching for API calls or non-GET requests
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
        return;
    }

    // PDF Caching Strategy: Cache-First, fallback to Network
    if (url.pathname.endsWith('.pdf')) {
        event.respondWith(
            caches.open(PDF_CACHE_NAME).then(async cache => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    console.log('[ServiceWorker] Serving PDF from Cache:', url.pathname);
                    return cachedResponse;
                }
                
                console.log('[ServiceWorker] Fetching PDF from Network:', url.pathname);
                return fetch(event.request).then(networkResponse => {
                    // Cache the new PDF for instant loading next time
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Default Strategy for HTML/CSS/JS: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const networkFetch = fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                // Ignore network errors on static assets if offline
            });
            
            // Return cached response immediately if available, while updating cache in background
            return cachedResponse || networkFetch;
        })
    );
});
