import { conectarEventosCarrinho } from "./budget-events-small.js";

if (document.documentElement.dataset.orcamentoEstoquePronto === "true") {
  conectarEventosCarrinho();
} else {
  document.addEventListener("orcamento:estoque-pronto", conectarEventosCarrinho, { once: true });
}
