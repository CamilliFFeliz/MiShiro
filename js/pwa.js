const APP_CACHE_PREFIX = "calculadora-tattoo-";
const CURRENT_CACHE_NAMES = [
  "calculadora-tattoo-v5.7.0",
  "calculadora-tattoo-runtime-v5.7.0"
];

let hasReloadedForUpdate = false;

export function registerServiceWorkerUpdateFlow() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("service-worker.js")
    .then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(newWorker);
          }
        });
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(registration.waiting);
      }
    })
    .catch(() => {});

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloadedForUpdate) {
      return;
    }

    hasReloadedForUpdate = true;
    window.location.reload();
  });
}

function showUpdateToast(waitingWorker) {
  const existingToast = document.querySelector("#appUpdateToast");

  if (existingToast) {
    return;
  }

  const toast = document.createElement("button");
  toast.id = "appUpdateToast";
  toast.className = "app-update-toast";
  toast.type = "button";
  toast.textContent = "Nova versão disponível. Clique para atualizar.";
  toast.addEventListener("click", async () => {
    await clearOutdatedAppCaches();
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  });
  document.body.append(toast);
}

async function clearOutdatedAppCaches() {
  if (!("caches" in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX) && !CURRENT_CACHE_NAMES.includes(cacheName))
      .map((cacheName) => caches.delete(cacheName))
  );
}
