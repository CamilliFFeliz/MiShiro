const CACHE_NAME = "mishiro-clean-v5-refatoracao-visual";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./pages/orcamentos.html",
  "./pages/estoque.html",
  "./pages/agenda.html",
  "./pages/relatorios.html",
  "./pages/backup.html",
  "./pages/configuracoes.html",
  "./assets/css/base.css",
  "./assets/css/tokens.css",
  "./assets/css/layout.css",
  "./assets/css/components.css",
  "./assets/css/dashboard.css",
  "./assets/css/orcamentos.css",
  "./assets/css/studio-workflow.css",
  "./assets/css/operations-budget.css",
  "./assets/css/estoque.css",
  "./assets/css/agenda.css",
  "./assets/css/relatorios.css",
  "./assets/css/backup.css",
  "./assets/css/configuracoes.css",
  "./assets/css/app-clean.css",
  "./src/shared/layout.js",
  "./src/shared/formatters.js",
  "./src/shared/ui.js",
  "./src/shared/stock-catalog.js",
  "./src/shared/reference-stock.js",
  "./src/shared/pdf-theme.js",
  "./src/models/banco-local.js",
  "./src/models/esquema-banco.js",
  "./src/services/estoque-service.js",
  "./src/services/orcamentos-service.js",
  "./src/services/agenda-service.js",
  "./src/services/backup-service.js",
  "./src/mvc/servicos/servico-estoque.js",
  "./src/mvc/servicos/servico-orcamentos.js",
  "./src/mvc/servicos/servico-agendamentos.js",
  "./src/pages/dashboard.js",
  "./src/pages/orcamentos.js",
  "./src/pages/estoque.js",
  "./src/pages/agenda.js",
  "./src/pages/relatorios.js",
  "./src/pages/backup.js",
  "./src/pages/configuracoes.js",
  "./img/mishiro-logo-claro.jpg",
  "./img/mishiro-logo-escuro.jpg",
  "./img/mishiro-simbolo-claro.jpg",
  "./img/mishiro-simbolo-escuro.jpg.jpg"
];

self.addEventListener("install", function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(ASSETS);
  }).finally(function() {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function(event) {
  event.waitUntil(caches.keys().then(function(names) {
    return Promise.all(names.filter(function(name) {
      return name !== CACHE_NAME;
    }).map(function(name) {
      return caches.delete(name);
    }));
  }).then(function() {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(function(cached) {
    if (cached) return cached;
    return fetch(event.request).then(function(response) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function() {
      return cached || Response.error();
    });
  }));
});
