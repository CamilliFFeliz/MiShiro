const CACHE_NAME = "mishiro-clean-v2";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg",
  "./pages/orcamentos.html", "./pages/estoque.html", "./pages/agenda.html", "./pages/relatorios.html", "./pages/backup.html", "./pages/configuracoes.html",
  "./assets/css/base.css", "./assets/css/tokens.css", "./assets/css/layout.css", "./assets/css/components.css", "./assets/css/dashboard.css", "./assets/css/orcamentos.css", "./assets/css/operations-budget.css", "./assets/css/estoque.css", "./assets/css/agenda.css", "./assets/css/relatorios.css", "./assets/css/backup.css", "./assets/css/configuracoes.css", "./assets/css/studio-workflow.css", "./assets/css/pro-ui.css", "./assets/css/pro-polish.css", "./assets/css/app-refinements.css", "./assets/css/theme-audit.css",
  "./src/shared/layout.js", "./src/shared/formatters.js", "./src/shared/ui.js", "./src/shared/stock-catalog.js", "./src/shared/reference-stock.js", "./src/shared/pdf-theme.js",
  "./src/models/banco-local.js", "./src/models/esquema-banco.js",
  "./src/services/estoque-service.js", "./src/services/orcamentos-service.js", "./src/services/agenda-service.js",
  "./src/pages/dashboard.js", "./src/pages/orcamentos.js", "./src/pages/estoque.js", "./src/pages/agenda.js", "./src/pages/relatorios.js", "./src/pages/backup.js", "./src/pages/configuracoes.js"
];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).finally(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET") return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => cached || Response.error()))); });
