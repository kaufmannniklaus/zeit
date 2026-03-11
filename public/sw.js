self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const titel = data.titel || "Zeit – ARV Erinnerung";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "arv-notification",
    requireInteraction: true,
    actions: [
      { action: "pause", title: "Pause erfassen" },
      { action: "dismiss", title: "OK" },
    ],
  };

  event.waitUntil(self.registration.showNotification(titel, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "pause" || event.action === "") {
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes("/tages-tracker") && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow("/tages-tracker");
          }
        })
    );
  }
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
