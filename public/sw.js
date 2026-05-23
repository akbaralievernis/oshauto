const CACHE_NAME = 'oshauto-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
];

// Установка Service Worker и кэширование базовых ресурсов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Активация немедленно
  self.skipWaiting();
});

// Очистка старых кэшей при активации новой версии
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват сетевых запросов (Network First с кэш-фоллбэком)
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы к Supabase API, OpenAI и WebSockets для корректной работы real-time
  if (
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('api.openai.com') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Если запрос успешен, клонируем ответ и сохраняем его в кэш (для статики)
        if (response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, пытаемся выдать ресурс из кэша
        console.log('[Service Worker] Offline mode - loading from cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Возвращаем пустую заглушку для отсутствующих картинок или страниц в оффлайне
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
