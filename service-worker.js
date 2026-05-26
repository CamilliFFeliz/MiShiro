const CACHE_NAME = "calculadora-tattoo-v5.3.0";
const APP_SHELL_URL = "./index.html";
const APP_ASSETS = [
  "./",
  APP_SHELL_URL,
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(handleRequest(event.request));
});

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_ASSETS);
}

async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName !== CACHE_NAME)
      .map((cacheName) => caches.delete(cacheName))
  );
}

async function handleRequest(request) {
  if (request.mode === "navigate") {
    return getNavigationResponse(request);
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return fetch(request);
  }

  return getCachedAssetResponse(request);
}

async function getNavigationResponse(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL_URL, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(APP_SHELL_URL);
    return cachedResponse || Response.error();
  }
}

async function getCachedAssetResponse(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const shellResponse = await caches.match(APP_SHELL_URL);
    return shellResponse || Response.error();
  }
}
