const CACHE='mujigaebansa-budget-v17';
const ASSETS=['./','index.html','style.css?v=17','app.js?v=17','manifest.json','icon.svg'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, {cache:'no-store'})
        .then(res => {
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put('index.html',copy));
          return res;
        })
        .catch(()=>caches.match('index.html'))
    );
    return;
  }
  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(res=>{
        if(res && res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(event.request,copy));
        }
        return res;
      })
      .catch(()=>caches.match(event.request))
  );
});
