const CACHE_NAME = "phillies-quest-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) =>
          cached || fetch(e.request).then((res) => {
            cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
  }
});

self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || "Phillies Story Quest", {
      body: data.body || "A new game recap is ready!",
      tag: "phillies-game",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
