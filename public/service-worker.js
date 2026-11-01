const CACHE = 'ameertech-data-hub-stage3-v1';
const CORE = ['/', '/index.html', '/account.html', '/styles.css', '/account.css', '/app.js', '/account.js', '/api-config.js', '/manifest.json', '/icon.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => { const url=new URL(event.request.url); if(event.request.method!=='GET'||url.pathname.startsWith('/api/'))return; event.respondWith(fetch(event.request).then(response=>{if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/')))); });
