import { initializeApp } from "./dom.js";
import { applyMiShiroBranding } from "./mishiro-brand.js";
import { applyMiShiroBrandV2 } from "./mishiro-brand-v2.js";
import { setupMiShiroPdfExports } from "./mishiro-pdf-tools.js";
import { setupMiShiroExperienceLayer } from "./mishiro-ux.js";
import { registerServiceWorkerUpdateFlow } from "./pwa.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  applyMiShiroBranding();
  applyMiShiroBrandV2();
  setupMiShiroPdfExports();
  setupMiShiroExperienceLayer();
  registerServiceWorkerUpdateFlow();
});
