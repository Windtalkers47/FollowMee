/**
 * FollowMee Service Worker
 * 
 * Handles push notifications and background sync
 * NEW-PUSH: Browser Push Notification Service Worker
 */

const CACHE_NAME = 'followmee-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/icons/badge-72.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache authenticated API traffic or mutations. The service worker is
  // intentionally only an app-shell/static-asset cache.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/api'
  ) {
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(request.destination);
  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'FollowMee',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'FollowMee';
  const options = {
    body: data.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    data: data.data || {},
    tag: data.tag || 'followmee-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - open app when user clicks notification
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event);
  event.notification.close();

  const candidate = event.notification.data?.url;
  const urlToOpen = typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\')
    ? candidate
    : '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync (for offline support)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Fetch unread notifications when back online
  try {
    const response = await fetch('/api/notifications?unreadOnly=true');
    if (response.ok) {
      const data = await response.json();
      console.log('[ServiceWorker] Synced notifications:', data);
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});
