import { conectarPersistencia } from "./budget-persistence-small.js";

if (document.documentElement.dataset.orcamentoEstoquePronto === "true") {
  conectarPersistencia();
} else {
  document.addEventListener("orcamento:estoque-pronto", conectarPersistencia, { once: true });
}
