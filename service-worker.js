const CACHE_NAME = "mishiro-orcamentos-static-v20-roxo-360a75";
const RUNTIME_CACHE_NAME = "mishiro-orcamentos-runtime-v20-roxo-360a75";
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
  "./assets/css/base.css",
  "./assets/css/identidade.css",
  "./assets/css/pdf.css",
  "./assets/css/experiencia.css",
  "./assets/css/estudio-pro.css",
  "./assets/css/mvc.css",
  "./assets/css/tema-mishiro.css",
  "./assets/css/logos-img.css",
  "./assets/css/polimento-mobile.css",
  "./assets/favicon/favicon.svg",
  "./img/mishiro-logo-claro.jpg",
  "./img/mishiro-logo-escuro.jpg",
  "./img/mishiro-simbolo-claro.jpg",
  "./img/mishiro-simbolo-escuro.jpg.jpg",
  "./assets/brand/mishiro-logo-clara.svg",
  "./assets/brand/mishiro-logo-escura.svg",
  "./assets/brand/mishiro-simbolo-claro.svg",
  "./assets/brand/mishiro-simbolo-escuro.svg",
  "./js/main.js",
  "./src/main.js",
  "./src/mishiro-brand.js",
  "./src/mishiro-brand-v2.js",
  "./src/mishiro-pdf-tools.js",
  "./src/mishiro-pdf-direct.js",
  "./src/mishiro-ux.js",
  "./src/mishiro-studio-pro.js",
  "./src/mvc/modelos/esquema-banco.js",
  "./src/mvc/modelos/banco-local.js",
  "./src/mvc/modelos/backup-local.js",
  "./src/mvc/servicos/servico-estoque.js",
  "./src/mvc/servicos/servico-orcamentos.js",
  "./src/mvc/servicos/servico-agendamentos.js",
  "./src/mvc/controladores/controlador-mvc.js",
  "./src/dom.js",
  "./src/state.js",
  "./src/budget.js",
  "./src/inventory.js",
  "./src/pdf.js",
  "./src/pwa.js",
  "./src/utils.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/mishiro.svg",
  "./assets/icons/mishiro.svg"
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
