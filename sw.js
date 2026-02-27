const CACHE_NAME = 'avaplayer-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png'
];

// نصب Service Worker و کش کردن فایل‌های اصلی
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// استراتژی کش: Network First با fallback به کش
self.addEventListener('fetch', (event) => {
  // برای فایل‌های صوتی از استراتژی Cache First استفاده می‌کنیم
  if (event.request.url.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  } 
  // برای سایر منابع از استراتژی Network First استفاده می‌کنیم
  else {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // کش کردن منابع جدید
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // اگر آفلاین بودیم، از کش استفاده کن
          return caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }
            // اگر در کش نبود، صفحه آفلاین رو نشون بده
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
        })
    );
  }
});

// همگام‌سازی در پس‌زمینه (برای آپدیت‌ها)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-playlists') {
    event.waitUntil(syncPlaylists());
  }
});

// دریافت نوتیفیکیشن
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: 'icon-192.png',
    badge: 'icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'باز کردن'
      },
      {
        action: 'close',
        title: 'بستن'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('آواپلیر', options)
  );
});

// کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// تابع همگام‌سازی پلی‌لیست‌ها
async function syncPlaylists() {
  const cache = await caches.open(CACHE_NAME);
  // اینجا می‌تونید منطق همگام‌سازی پلی‌لیست‌ها رو پیاده کنید
}