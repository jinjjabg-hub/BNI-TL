// BNI 트래픽 라이트 — 오프라인용 서비스워커
var CACHE = 'tl-shell-v2';  // ← 버전 올릴 때마다 이 숫자만 +1 하면 즉시 갱신됩니다
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  // 구글시트 데이터 요청은 네트워크로 (앱이 localStorage에 자체 캐시함)
  if(url.hostname.indexOf('docs.google.com') >= 0) return;

  var isAppShell = url.origin === location.origin &&
    (e.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/'));

  if(isAppShell){
    // ★ 앱 화면(HTML)은 네트워크 우선 — 온라인이면 항상 최신 코드를 보여줌
    //    오프라인일 때만 저장된 마지막 버전으로 대체
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }

  // 그 외 자산(아이콘 등): 캐시 우선 + 백그라운드 갱신
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fetched = fetch(e.request).then(function(res){
        if(res && res.ok && url.origin === location.origin){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || fetched;
    })
  );
});
