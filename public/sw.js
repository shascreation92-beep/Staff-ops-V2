self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const noteId = event.notification.data?.noteId;
  const timerAlert = event.notification.data?.timerAlert;
  
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
