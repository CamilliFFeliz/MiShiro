import { initializeApp } from "./dom.js";
import { applyMiShiroBranding } from "./mishiro-brand.js";
import { setupMiShiroPdfExports } from "./mishiro-pdf-tools.js";
import { registerServiceWorkerUpdateFlow } from "./pwa.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  applyMiShiroBranding();
  setupMiShiroPdfExports();
  registerServiceWorkerUpdateFlow();
});
