/**
 * Service Worker para CalculadoraTattoo
 * 
 * Estratégia de Cache: Stale-While-Revalidate
 * - Serve do cache enquanto revalida em background
 * - Funciona 100% offline
 * - Atualiza dados quando online
 */

const CACHE_NAME = 'calculadora-tattoo-v1';
const RUNTIME_CACHE = 'calculadora-tattoo-runtime';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/responsive.css',
  '/js/main.js',
  '/js/core/Database.js',
  '/js/core/Storage.js',
  '/js/core/ReactiveState.js',
  '/js/core/EventBus.js',
  '/js/core/Logger.js',
  '/icons/favicon.svg'
];

const EXTERNAL_RESOURCES = [
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// ============================================
// Service Worker Lifecycle Events
// ============================================

/**
 * Install Event
 * Prepara o cache com recursos estáticos
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS)
          .catch((error) => {
            console.warn('[SW] Some assets failed to cache:', error);
            // Continua mesmo se alguns assets falharem
            return Promise.resolve();
          });
      })
      .then(() => {
        console.log('[SW] Install complete, skipping wait');
        return self.skipWaiting();
      })
  );
});

/**
 * Activate Event
 * Limpa caches antigos
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================
// Fetch Event Handler
// ============================================

/**
 * Fetch Event
 * Implementa Stale-While-Revalidate + Network-First para APIs
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar navegação para páginas externas
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Estratégia: Stale-While-Revalidate para recursos estáticos
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Retorna cache imediatamente
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              // Atualiza cache em background
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch(() => response); // Fallback para cache em caso de erro

          // Retorna cache se disponível, senão aguarda rede
          return response || fetchPromise;
        })
        .catch(() => {
          // Último recurso: página offline
          return caches.match('/offline.html')
            .then((response) => response || new Response(
              '<h1>Offline</h1><p>Você está offline. Tente novamente quando a conexão voltar.</p>',
              { headers: { 'Content-Type': 'text/html' } }
            ));
        })
    );
    return;
  }

  // Estratégia: Network-First com fallback para cache (APIs)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Tenta cache como fallback
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Resposta offline genérica
              return new Response(
                JSON.stringify({ offline: true, message: 'Você está offline' }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Estratégia padrão: Cache-First
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((response) => {
            // Não cacheia responses ruins
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Resposta offline padrão
            return new Response(
              'Recurso não disponível offline',
              { status: 503, statusText: 'Service Unavailable' }
            );
          });
      })
  );
});

// ============================================
// Helper Functions
// ============================================

/**
 * Verifica se a URL é um recurso estático
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.svg', '.jpg', '.jpeg', '.webp', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Verifica se é uma requisição de API
 */
function isApiRequest(url) {
  return url.pathname.includes('/api/') || 
         url.origin === 'https://firebaseio.com' ||
         url.hostname.includes('firebase');
}

// ============================================
// Background Sync (para sincronização futura)
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      syncDataWithCloud()
        .then(() => {
          console.log('[SW] Data sync completed');
        })
        .catch((error) => {
          console.error('[SW] Data sync failed:', error);
          // Retry será feito pelo sistema
          return Promise.reject(error);
        })
    );
  }
});

async function syncDataWithCloud() {
  try {
    // Notificar clientes que sincronização está em andamento
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'sync-started' });
    });

    // Aqui implementar sincronização real com Firebase
    // Por enquanto, apenas aguarda um segundo
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Notificar conclusão
    clients.forEach((client) => {
      client.postMessage({ type: 'sync-completed' });
    });
  } catch (error) {
    console.error('[SW] Sync error:', error);
    throw error;
  }
}

// ============================================
// Push Notifications (opcional)
// ============================================

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova notificação',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.customData || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'CalculadoraTattoo', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clients) => {
        // Procura por cliente existente
        for (let i = 0; i < clients.length; i++) {
          if (clients[i].url === '/' && 'focus' in clients[i]) {
            return clients[i].focus();
          }
        }
        // Se não encontrar, abre nova janela
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

// ============================================
// Message Handler
// ============================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              return caches.delete(cacheName);
            })
          );
        })
      );
      break;

    case 'SYNC_DATA':
      event.waitUntil(syncDataWithCloud());
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

console.log('[SW] Service Worker script loaded');
