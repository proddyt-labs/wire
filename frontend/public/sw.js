self.addEventListener('push', (e) => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || '«·» wire', {
      body: d.body || 'Nova mensagem',
      icon: '/icons/icon-192.png',
      data: { url: d.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
