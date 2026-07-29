// 넘기기 앱 서비스워커 — 오프라인 완전 작동을 위한 캐싱
// 개인정보 관련 네트워크 요청 없음 — 이 앱은 서버와 통신하지 않습니다.

const CACHE_NAME = 'panic-app-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 음악 파일은 용량이 커서(스타일당 2곡×평균5MB, 총 6곡 약 30MB) 별도 캐시로 분리.
// 최초 설치 시 전체를 강제로 받지 않고, 사용자가 실제로 재생을 누른 곡만 캐시한다(런타임 캐싱).
const MUSIC_CACHE = 'panic-app-music-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== MUSIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 음악 파일: 최초 재생 시 캐시에 저장 → 이후 오프라인에서도 재생 가능
  if (url.pathname.includes('/assets/music/')) {
    event.respondWith(
      caches.open(MUSIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // 나머지 리소스: 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
