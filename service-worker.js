const CACHE_NAME = "geek-nexus-shell-v21";
const APP_SHELL = [
  "/",
  "/company/",
  "/commercial/",
  "/zh/",
  "/zh/company/",
  "/zh/commercial/",
  "/styles.css?v=23",
  "/styles.css?v=scenes-1",
  "/assets/scenario-knowledge.svg",
  "/assets/scenario-service-en-v2.svg",
  "/assets/scenario-service-zh-v2.svg",
  "/assets/scenario-operations.svg",
  "/assets/process-discover.svg",
  "/assets/process-pilot.svg",
  "/assets/process-prove.svg",
  "/assets/process-scale.svg",
  "/founder-profile.css?v=1",
  "/assets/celia-shu-portrait.jpg",
  "/company/company.css?v=21",
  "/commercial/commercial.css?v=art-3",
  "/assets/engagement-call-v1.svg",
  "/assets/engagement-diagnosis-v1.svg",
  "/assets/engagement-project-v1.svg",
  "/site.js?v=2",
  "/manifest.webmanifest",
  "/assets/icon-192.png",
  "/assets/apple-touch-icon.png",
  "/assets/geek-nexus-logo-mark.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || fresh;
    })
  );
});
