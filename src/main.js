import { initializeApp } from "./dom.js";
import { applyMiShiroBranding } from "./mishiro-brand.js";
import { applyMiShiroBrandV2 } from "./mishiro-brand-v2.js";
import { setupMiShiroPdfExports } from "./mishiro-pdf-tools.js";
import { setupDirectPdfExport } from "./mishiro-pdf-direct.js";
import { setupMiShiroExperienceLayer } from "./mishiro-ux.js";
import { setupStudioProLayer } from "./mishiro-studio-pro.js";
import { iniciarNavegacaoSegura } from "./mishiro-navegacao-segura.js";
import { iniciarAplicacaoMvc } from "./mvc/controladores/controlador-mvc.js";
import { registerServiceWorkerUpdateFlow } from "./pwa.js";

document.addEventListener("DOMContentLoaded", async () => {
  carregarEstiloMvc();
  await initializeApp();
  applyMiShiroBranding();
  applyMiShiroBrandV2();
  setupMiShiroPdfExports();
  setupDirectPdfExport();
  setupStudioProLayer();
  iniciarNavegacaoSegura();
  await iniciarAplicacaoMvc();
  setupMiShiroExperienceLayer();
  registerServiceWorkerUpdateFlow();
});

function carregarEstiloMvc() {
  if (document.getElementById("mishiro-mvc-css")) return;
  const folha = document.createElement("link");
  folha.id = "mishiro-mvc-css";
  folha.rel = "stylesheet";
  folha.href = "assets/css/mvc.css";
  document.head.append(folha);
}
