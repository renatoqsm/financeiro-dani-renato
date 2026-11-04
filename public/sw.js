const CACHE = "casa-public-v1";
const PUBLIC_FILES = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC_FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("casa-public-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache account data, authenticated API responses, or financial documents.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const response = await caches.match("/offline.html");
        // Static hosting may redirect .html URLs. A fresh response is required
        // when serving that document as the fallback for another navigation.
        return response
          ? new Response(response.body, {
              status: 200,
              headers: response.headers,
            })
          : new Response(
              "Sem conexão. Conecte-se à internet e tente novamente.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            );
      }),
    );
  } else if (PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(url.pathname)),
    );
  }
});
