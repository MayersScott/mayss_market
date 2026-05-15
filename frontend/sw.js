self.addEventListener('push', function(event) {
    let data = { title: 'MAYSS', body: 'Новое уведомление' };
    if (event.data) {
        try { data = event.data.json(); } 
        catch(e) { data.body = event.data.text(); }
    }
    
    const options = {
        body: data.body,
        icon: 'https://img.icons8.com/ios-filled/50/3d5afe/m.png',
        badge: 'https://img.icons8.com/ios-filled/50/3d5afe/m.png',
        vibrate: [100, 50, 100],
        data: { url: '/#account?tab=orders' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
