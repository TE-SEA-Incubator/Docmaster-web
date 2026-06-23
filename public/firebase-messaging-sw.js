importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCZYThMaudgXaLgz_2NiPgFX36kNf3TXYM",
  authDomain: "docmaster-ad853.firebaseapp.com",
  projectId: "docmaster-ad853",
  storageBucket: "docmaster-ad853.firebasestorage.app",
  messagingSenderId: "805201822235",
  appId: "1:805201822235:web:5b9e31957185fd46376ebe",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification.title || "DocMaster";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: "/src/assets/images/docmaster-icon.png",
    badge: "/src/assets/images/docmaster-icon.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes("docmaster") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/dashboard");
      }
    })
  );
});
