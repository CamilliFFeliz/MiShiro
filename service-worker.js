const CACHE_NAME = "mishiro-static-v29-fluxos-operacionais";
const RUNTIME_CACHE_NAME = "mishiro-runtime-v29-fluxos-operacionais";
const APP_CACHE_PREFIXES = ["calculadora-tattoo-", "mishiro-orcamentos-", "mishiro-static-", "mishiro-runtime-"];
const CURRENT_CACHE_NAMES = [CACHE_NAME, RUNTIME_CACHE_NAME];
const APP_SHELL_URL = "./index.html";
const LUCIDE_CDN_URL = "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js";
const JSPDF_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const EXTERNAL_ASSET_URLS = [LUCIDE_CDN_URL, JSPDF_CDN_URL];
const APP_ASSETS = [
  "./",
  APP_SHELL_URL,
  "./pages/dashboard.html",
  "./pages/orcamentos.html",
  "./pages/estoque.html",
  "./pages/agenda.html",
  "./pages/pipeline.html",
  "./pages/relatorios.html",
  "./pages/backup.html",
  "./pages/configuracoes.html",
  "./assets/css/base.css",
  "./assets/css/tokens.css",
  "./assets/css/layout.css",
  "./assets/css/components.css",
  "./assets/css/dashboard.css",
  "./assets/css/orcamentos.css",
  "./assets/css/estoque.css",
  "./assets/css/agenda.css",
  "./assets/css/pipeline.css",
  "./assets/css/relatorios.css",
  "./assets/css/backup.css",
  "./assets/css/configuracoes.css",
  "./assets/favicon/favicon.svg",
  "./img/mishiro-logo-claro.jpg",
  "./img/mishiro-logo-escuro.jpg",
  "./img/mishiro-simbolo-claro.jpg",
  "./img/mishiro-simbolo-escuro.jpg.jpg",
  "./src/shared/layout.js",
  "./src/shared/storage.js",
  "./src/shared/formatters.js",
  "./src/shared/ui.js",
  "./src/shared/stock-catalog.js",
  "./src/shared/reference-stock.js",
  "./src/pages/dashboard.js",
  "./src/pages/orcamentos.js",
  "./src/pages/estoque.js",
  "./src/pages/agenda.js",
  "./src/pages/pipeline.js",
  "./src/pages/relatorios.js",
  "./src/pages/backup.js",
  "./src/pages/configuracoes.js",
  "./src/services/estoque-service.js",
  "./src/services/orcamentos-service.js",
  "./src/services/agenda-service.js",
  "./src/services/backup-service.js",
  "./src/models/banco-local.js",
  "./src/models/esquema-banco.js",
  "./src/mvc/modelos/esquema-banco.js",
  "./src/mvc/modelos/banco-local.js",
  "./src/mvc/modelos/backup-local.js",
  "./src/mvc/servicos/servico-estoque.js",
  "./src/mvc/servicos/servico-orcamentos.js",
  "./src/mvc/servicos/servico-agendamentos.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => { event.waitUntil(cacheApplicationShell().finally(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => { event.waitUntil(deleteOldCaches().then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET") return; event.respondWith(handleRequest(event.request)); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });

async function cacheApplicationShell() { const cache = await caches.open(CACHE_NAME); await cache.addAll(APP_ASSETS); await Promise.all(EXTERNAL_ASSET_URLS.map(cacheExternalAsset)); }
async function cacheExternalAsset(assetUrl) { try { const response = await fetch(assetUrl, { mode: "cors" }); if (response?.ok) { const cache = await caches.open(RUNTIME_CACHE_NAME); await cache.put(assetUrl, response); } } catch {} }
async function deleteOldCaches() { const cacheNames = await caches.keys(); await Promise.all(cacheNames.filter((cacheName) => APP_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))).filter((cacheName) => !CURRENT_CACHE_NAMES.includes(cacheName)).map((cacheName) => caches.delete(cacheName))); }
async function handleRequest(request) { if (request.mode === "navigate") return getNavigationResponse(request); const requestUrl = new URL(request.url); if (requestUrl.origin !== self.location.origin) return getExternalAssetResponse(request, requestUrl); return getLocalAssetResponse(request); }
async function getExternalAssetResponse(request, requestUrl) { if (!EXTERNAL_ASSET_URLS.includes(requestUrl.href)) return fetch(request); const cachedResponse = await caches.match(request); try { const networkResponse = await fetch(request); if (networkResponse?.ok) { const cache = await caches.open(RUNTIME_CACHE_NAME); await cache.put(request, networkResponse.clone()); return networkResponse; } } catch {} return cachedResponse || fetch(request); }
async function getNavigationResponse(request) { try { const networkResponse = await fetch(request); if (networkResponse?.ok) { const cache = await caches.open(CACHE_NAME); await cache.put(request, networkResponse.clone()); } return networkResponse; } catch { const cachedResponse = await caches.match(request) || await caches.match(APP_SHELL_URL); return cachedResponse || Response.error(); } }
async function getLocalAssetResponse(request) { const cachedResponse = await caches.match(request); try { const networkResponse = await fetch(request); if (networkResponse?.ok) { const cache = await caches.open(CACHE_NAME); await cache.put(request, networkResponse.clone()); return networkResponse; } } catch {} return cachedResponse || Response.error(); }
