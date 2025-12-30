// Service Worker for Push Notifications - Nora App

// Listen for push events
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body || 'Tu as un objectif en attente',
    icon: data.icon || '/nora-icon.png',
    badge: data.badge || '/nora-badge.png',
    tag: data.tag || 'nora-notification',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir Nora'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nora', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If a window is already open, focus it
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event.notification.tag);
});

// Service Worker install
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Service Worker activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});
