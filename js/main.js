import { initializeApp } from "./dom.js";
import { registerServiceWorkerUpdateFlow } from "./pwa.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  registerServiceWorkerUpdateFlow();
});
