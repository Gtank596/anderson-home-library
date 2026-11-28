'use strict';
const cacheName='anderson-library-shell-checkout1';
const home=new URL('index.html',self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch(home,{cache:'reload'});
  if (!response.ok) throw Error('Library unavailable');
  const html=await response.clone().text();
  const assets=[...html.matchAll(/(?:src|href)="([\w-]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m=>new Request(new URL(m[1],home),{cache:'reload'}));
  const cache=await caches.open(cacheName);
  await cache.addAll(assets);await cache.put(home,response);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('anderson-library-shell-')&&key!==cacheName)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  const isHome=[new URL(home).pathname,new URL(self.registration.scope).pathname].includes(url.pathname);
  if(req.mode==='navigate' && isHome){
    event.respondWith(fetch(req).catch(async()=> (await caches.open(cacheName)).match(home)));return;
  }
  if(/\.(?:css|js)$/.test(url.pathname))
    event.respondWith((async()=> (await (await caches.open(cacheName)).match(req))||fetch(req))());
});
