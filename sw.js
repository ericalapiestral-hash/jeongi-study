/* 서비스 워커 — 오프라인에서도 공부할 수 있게 모든 파일을 캐시 */
var CACHE = 'jeongi-study-v9';
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
  './icon-maskable.svg'
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

/* 네트워크 우선, 실패하면 캐시 (오프라인 대응) */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy).catch(function () { }); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match('./index.html');
      });
    })
  );
});
