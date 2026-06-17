import { initializeApp } from "./dom.js";
import { applyMiShiroBranding } from "./mishiro-brand.js";
import { applyMiShiroBrandV2 } from "./mishiro-brand-v2.js";
import { setupMiShiroPdfExports } from "./mishiro-pdf-tools.js";
import { setupDirectPdfExport } from "./mishiro-pdf-direct.js";
import { setupMiShiroExperienceLayer } from "./mishiro-ux.js";
import { setupStudioProLayer } from "./mishiro-studio-pro.js";
import { iniciarNavegacaoSegura } from "./mishiro-navegacao-segura.js";
import { iniciarTelaOrcamento } from "./mishiro-orcamento.js";
import { organizarBackupJson } from "./mishiro-backup-json.js";
import { iniciarAplicacaoMvc } from "./mvc/controladores/controlador-mvc.js";
import { registerServiceWorkerUpdateFlow } from "./pwa.js";

document.addEventListener("DOMContentLoaded", async () => {
  carregarEstiloMvc();
  await executarEtapa("inicialização principal", initializeApp);
  executarEtapa("identidade visual", applyMiShiroBranding);
  executarEtapa("identidade visual avançada", applyMiShiroBrandV2);
  executarEtapa("exportação PDF", setupMiShiroPdfExports);
  executarEtapa("exportação PDF direta", setupDirectPdfExport);
  executarEtapa("modo estúdio pro", setupStudioProLayer);
  executarEtapa("navegação segura", iniciarNavegacaoSegura);
  executarEtapa("tela de orçamento", iniciarTelaOrcamento);
  await executarEtapa("módulos MVC", iniciarAplicacaoMvc);
  executarEtapa("organização do backup JSON", organizarBackupJson);
  executarEtapa("experiência visual", setupMiShiroExperienceLayer);
  executarEtapa("service worker", registerServiceWorkerUpdateFlow);
});

async function executarEtapa(nome, acao) {
  try {
    return await acao();
  } catch (erro) {
    console.error(`MiShiro: erro na etapa ${nome}`, erro);
    return null;
  }
}

function carregarEstiloMvc() {
  if (document.getElementById("mishiro-mvc-css")) return;
  const folha = document.createElement("link");
  folha.id = "mishiro-mvc-css";
  folha.rel = "stylesheet";
  folha.href = "assets/css/mvc.css";
  document.head.append(folha);
}
