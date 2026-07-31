// 넘기기 앱 서비스워커 — 오프라인 완전 작동을 위한 캐싱
// 개인정보 관련 네트워크 요청 없음 — 이 앱은 서버와 통신하지 않습니다.

const CACHE_NAME = 'panic-app-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 음악 파일(6곡, 총 약 27MB)은 최초 설치 시 전부 미리 캐싱한다.
// 발작 상황에서 "재생 안 됨"이 없도록, 1회 접속 시 전곡을 오프라인 저장소에 내려받는다.
const MUSIC_CACHE = 'panic-app-music-v1';
const MUSIC_ASSETS = [
  './assets/music/low-1.mp3',
  './assets/music/low-2.mp3',
  './assets/music/nature-1.mp3',
  './assets/music/nature-2.mp3',
  './assets/music/synth-1.mp3',
  './assets/music/synth-2.mp3'
];

// 파일 하나가 실패해도(네트워크 순단 등) 전체 설치가 죽지 않도록 개별 처리.
async function precacheMusic() {
  const cache = await caches.open(MUSIC_CACHE);
  await Promise.all(
    MUSIC_ASSETS.map(async (path) => {
      try {
        const existing = await cache.match(path);
        if (existing) return; // 이미 받은 곡은 재다운로드하지 않음
        const response = await fetch(path);
        if (response.ok) await cache.put(path, response.clone());
      } catch (e) {
        // 여기서 실패한 곡은 다음 접속(activate) 시 재시도됨
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
      precacheMusic()
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== MUSIC_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
      precacheMusic() // 설치 시 실패했던 곡이 있으면 재시도
    ])
  );
  self.clients.claim();
});

// 페이지(index.html)에서 다운로드 진행률을 물어볼 때 응답 — 오프라인 준비 완료 여부 UI 표시용
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_MUSIC_CACHE') {
    caches.open(MUSIC_CACHE).then(async (cache) => {
      const keys = await cache.keys();
      event.source.postMessage({
        type: 'MUSIC_CACHE_STATUS',
        cachedCount: keys.length,
        totalCount: MUSIC_ASSETS.length,
        ready: keys.length >= MUSIC_ASSETS.length
      });
    });
  }
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
