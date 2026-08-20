const CACHE="radio-tv-pwa-v5";
const ASSETS=["./","./index.html","./styles.css","./config.js","./app.js","./manifest.webmanifest","./icons/icon.svg"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;

  if(u.pathname.startsWith("/api/") || u.pathname.startsWith("/admin")) return;

  if(u.pathname==="/data/config.json"){
    e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match("/data/config.json")));
    return;
  }

  if(u.pathname==="/" || u.pathname.endsWith("/index.html") || u.pathname.endsWith("/app.js") || u.pathname.endsWith("/styles.css")){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request)));
    return;
  }

  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
  }).catch(()=>caches.match("./index.html"))));
});
