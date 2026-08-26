// 공황패스 SOS 웹사이트 서비스워커 — 오프라인 작동을 위한 캐싱
// Android 앱은 이 파일을 사용하지 않고 번들에 포함된 자산으로 완전 오프라인 작동한다.

const CACHE_NAME = 'panic-app-v17';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './privacy_policy.html',
  './creator.html',
  './COPYRIGHT.txt',
  './assets/soo-water/soo-water_00-base_dark.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png'
];

// 음악 파일(6곡, 총 약 25MB)은 핵심 화면 준비 후 한 곡씩 오프라인 저장소에 내려받는다.
// 발작 상황에서 재생이 끊기지 않도록 이후 접속에서는 저장된 파일을 우선 사용한다.
const MUSIC_CACHE = 'panic-app-music-v1';
const MUSIC_ASSETS = [
  './assets/music/low-1.mp3',
  './assets/music/low-2.mp3',
  './assets/music/nature-1.mp3',
  './assets/music/nature-2.mp3',
  './assets/music/synth-1.mp3',
  './assets/music/synth-2.mp3'
];
let musicCacheJob = null;

// 음악은 서비스워커 설치를 막지 않고, 첫 화면이 열린 뒤 순차적으로 저장한다.
// 파일 하나가 실패해도 다음 접속에서 해당 파일만 다시 시도한다.
async function precacheMusic() {
  const cache = await caches.open(MUSIC_CACHE);
  for (const path of MUSIC_ASSETS) {
    try {
      const existing = await cache.match(path);
      if (!existing) {
        const response = await fetch(path);
        if (response.ok) await cache.put(path, response.clone());
      }
    } catch (e) {
      // 느리거나 끊긴 네트워크에서는 다음 접속 때 이어서 받는다.
    }
    await broadcastMusicStatus();
  }
}

async function getMusicStatus() {
  const cache = await caches.open(MUSIC_CACHE);
  const keys = await cache.keys();
  const cachedUrls = new Set(keys.map((request) => request.url));
  const cachedCount = MUSIC_ASSETS.filter((path) =>
    [...cachedUrls].some((url) => url.endsWith(path.replace('./', '/')))
  ).length;
  return {
    type: 'MUSIC_CACHE_STATUS',
    cachedCount,
    totalCount: MUSIC_ASSETS.length,
    ready: cachedCount >= MUSIC_ASSETS.length
  };
}

async function broadcastMusicStatus() {
  const status = await getMusicStatus();
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(status));
}

function startMusicCache() {
  if (!musicCacheJob) {
    musicCacheJob = precacheMusic().finally(() => {
      musicCacheJob = null;
    });
  }
  return musicCacheJob;
}

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

// 페이지(index.html)에서 다운로드 진행률을 물어볼 때 응답 — 오프라인 준비 완료 여부 UI 표시용
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_MUSIC_CACHE') {
    event.waitUntil(getMusicStatus().then((status) => event.source?.postMessage(status)));
  }
  if (event.data && event.data.type === 'START_MUSIC_CACHE') {
    event.waitUntil(startMusicCache());
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

  // 문서 이동은 네트워크 우선, 실패하면 저장된 홈 화면을 제공한다.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 나머지 리소스: 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
