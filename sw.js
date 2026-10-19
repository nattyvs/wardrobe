// Wardrobe service worker: keeps the app working offline.
const CACHE = 'wardrobe-v1-30';
const SHELL = ['./','index.html','app.js','garments.js','sample.js','manifest.webmanifest','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','icons/favicon-64.png','fonts/Didot-Regular.woff','fonts/Jost-var.woff','fonts/Jost-Italic-var.woff'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // GitHub data and the forecast always go to the network
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request.url, {cache: 'no-cache'}).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
