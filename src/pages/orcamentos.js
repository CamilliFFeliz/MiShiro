import { iniciarOrcamentos } from "./budget-main.js";
import { conectarEventosCarrinho } from "./budget-events.js";
import { conectarPersistencia } from "./budget-persistence.js";
import { conectarPdf } from "./budget-pdf.js";
import { atualizarIcones, mostrarStatus } from "../shared/ui.js";

async function iniciarPaginaOrcamentos() {
  try {
    await iniciarOrcamentos();
    conectarEventosCarrinho();
    await conectarPersistencia();
    conectarPdf();
    atualizarIcones();
  } catch (erro) {
    mostrarStatus(document.querySelector("#statusOrcamento"), erro.message || "Não foi possível iniciar o orçamento.");
  }
}

iniciarPaginaOrcamentos();
