// Подключается к service worker через importScripts (см. workbox-config.js).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.warn('Unreadable push payload:', error);
  }

  // iOS требует показывать уведомление на каждый полученный push
  event.waitUntil(
    self.registration.showNotification(data.title || 'Отдых окончен! 🏋️‍♂️', {
      body: data.body || 'Пора делать следующий подход!',
      icon: '/icons/icon-192.png',
      tag: 'rest-timer',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      if (windows.length > 0) return windows[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
