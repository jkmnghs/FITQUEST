// FitQuest Service Worker
const CACHE_NAME = 'fitquest-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  const options = {
    body: data.body || 'Time to train!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open FitQuest' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  e.waitUntil(self.registration.showNotification(data.title || 'FitQuest', options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('/'));
  }
});
