/* 서비스 워커 — 오프라인에서도 공부할 수 있게 모든 파일을 캐시 (안드로이드·아이폰 공통) */
var CACHE = 'jeongi-study-v10';
var FILES = [
  './',
  './index.html',
  './style.css?v=9',
  './data.js',
  './lessons.js',
  './formulas.js',
  './dojo-data.js',
  './app.js',
  './lab.js',
  './boss.js',
  './codex.js',
  './dojo.js',
  './fun.js',
  './more.js',
  './journey.js',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './apple-touch-icon-167.png',
  './apple-touch-icon-152.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FILES.map(function (f) {
        return c.add(f).catch(function () { /* 일부 실패해도 설치는 진행 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 캐시 우선 + 뒤에서 갱신 (오프라인에서 확실히 뜨게 — iOS Safari 대응)
   네트워크 우선은 지하철처럼 "연결은 되는데 안 되는" 상황에서 오래 멈추므로 캐시 우선으로 둔다. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // 외부 요청은 건드리지 않음

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy).catch(function () { }); });
        }
        return res;
      }).catch(function () {
        // 오프라인: 캐시에 없으면 첫 화면이라도 돌려준다
        return cached || caches.match('./index.html');
      });
      return cached || net;
    })
  );
});
