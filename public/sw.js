self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data || {}
      };
      event.waitUntil(
        self.registration.showNotification(payload.title, options)
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Worknode Alert', {
          body: text,
          icon: '/favicon.ico'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const noteId = event.notification.data?.noteId;
  const timerAlert = event.notification.data?.timerAlert;
  const chatId = event.notification.data?.chatId;
  
  if (chatId) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // Search for open chat-space page
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/chat-space') && 'focus' in client) {
            client.postMessage({ action: 'view-chat', chatId });
            return client.focus();
          }
        }
        // Redirect any active tab
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate('/chat-space?contactId=' + chatId);
            }
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/chat-space?contactId=' + chatId);
        }
      })
    );
    return;
  }
  
  if (!noteId) return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Search for any open personal-notes page
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/personal-notes') && 'focus' in client) {
          client.postMessage({ action: 'view-note', noteId, timerAlert });
          return client.focus();
        }
      }
      
      // Search for any app page
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.postMessage({ action: 'view-note', noteId, timerAlert });
          return client.focus();
        }
      }

      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/personal-notes?openNoteId=' + noteId);
      }
    })
  );
});
