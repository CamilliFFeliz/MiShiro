const CACHE_NAME = "calculadora-tattoo-cache-v12";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

/**
 * Prepara o cache estatico do PWA.
 * @param {ExtendableEvent} event Evento de instalacao do service worker.
 * @returns {void}
 */
function handleInstall(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
}

/**
 * Remove caches antigos e assume controle das abas abertas.
 * @param {ExtendableEvent} event Evento de ativacao do service worker.
 * @returns {void}
 */
function handleActivate(event) {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
}

/**
 * Responde requisicoes GET da mesma origem com estrategia cache-first.
 * @param {FetchEvent} event Evento de rede interceptado.
 * @returns {void}
 */
function handleFetch(event) {
  if (!isCacheableRequest(event.request)) {
    return;
  }

  event.respondWith(respondFromCacheFirst(event.request));
}

/**
 * Verifica se a requisicao deve passar pelo cache do PWA.
 * @param {Request} request Requisicao recebida.
 * @returns {boolean} Verdadeiro quando a requisicao e cacheavel.
 */
function isCacheableRequest(request) {
  return request.method === "GET" && new URL(request.url).origin === self.location.origin;
}

/**
 * Retorna uma resposta do cache ou busca na rede e atualiza o cache.
 * @param {Request} request Requisicao cacheavel.
 * @returns {Promise<Response>} Resposta do cache ou da rede.
 */
function respondFromCacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      return cachedResponse;
    }

    return fetch(request).then((networkResponse) => {
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
      return networkResponse;
    });
  });
}

self.addEventListener("install", handleInstall);
self.addEventListener("activate", handleActivate);
self.addEventListener("fetch", handleFetch);
