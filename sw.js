const CACHE='mujigaebansa-budget-v20';
const ASSETS=['./','index.html','style.css?v=20','app.js?v=20','manifest.json','icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put('index.html',x));return r}).catch(()=>caches.match('index.html')));
  }else{
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x))}return r}).catch(()=>caches.match(e.request)));
  }
});
