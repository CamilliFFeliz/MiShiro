const CACHE_NAME = "mishiro-orcamentos-static-v11-agenda-calendario";
const RUNTIME_CACHE_NAME = "mishiro-orcamentos-runtime-v11-agenda-calendario";
const APP_CACHE_PREFIXES = ["calculadora-tattoo-", "mishiro-orcamentos-"];
const CURRENT_CACHE_NAMES = [CACHE_NAME, RUNTIME_CACHE_NAME];
const APP_SHELL_URL = "./index.html";
const LUCIDE_CDN_URL = "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js";
const HTML2PDF_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
const EXTERNAL_ASSET_URLS = [LUCIDE_CDN_URL, HTML2PDF_CDN_URL];
const APP_ASSETS = [
  "./",
  APP_SHELL_URL,
  "./style.css",
  "./mishiro.css",
  "./mishiro-pdf-tools.css",
  "./mishiro-ux.css",
  "./mishiro-studio-pro.css",
  "./mvc-mishiro.css",
  "./js/main.js",
  "./js/mishiro-brand.js",
  "./js/mishiro-brand-v2.js",
  "./js/mishiro-pdf-tools.js",
  "./js/mishiro-pdf-direct.js",
  "./js/mishiro-ux.js",
  "./js/mishiro-studio-pro.js",
  "./js/mvc/modelos/esquema-banco.js",
  "./js/mvc/modelos/banco-local.js",
  "./js/mvc/modelos/backup-local.js",
  "./js/mvc/servicos/servico-estoque.js",
  "./js/mvc/servicos/servico-orcamentos.js",
  "./js/mvc/servicos/servico-agendamentos.js",
  "./js/mvc/controladores/controlador-mvc.js",
  "./js/dom.js",
  "./js/state.js",
  "./js/budget.js",
  "./js/inventory.js",
  "./js/pdf.js",
  "./js/pwa.js",
  "./js/utils.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/mishiro.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell().finally(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(handleRequest(event.request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_ASSETS);
  await Promise.all(EXTERNAL_ASSET_URLS.map(cacheExternalAsset));
}

async function cacheExternalAsset(assetUrl) {
  try {
    const response = await fetch(assetUrl, { mode: "cors" });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      await cache.put(assetUrl, response);
    }
  } catch {}
}

async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.filter((cacheName) => APP_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))).filter((cacheName) => !CURRENT_CACHE_NAMES.includes(cacheName)).map((cacheName) => caches.delete(cacheName)));
}

async function handleRequest(request) {
  if (request.mode === "navigate") return getNavigationResponse(request);
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return getExternalAssetResponse(request, requestUrl);
  return getLocalAssetResponse(request);
}

async function getExternalAssetResponse(request, requestUrl) {
  if (!EXTERNAL_ASSET_URLS.includes(requestUrl.href)) return fetch(request);
  const cachedResponse = await caches.match(request);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch {}
  return cachedResponse || fetch(request);
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

async function getLocalAssetResponse(request) {
  const cachedResponse = await caches.match(request);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch {}
  return cachedResponse || Response.error();
}
