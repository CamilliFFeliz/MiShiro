import { mostrarStatus } from "../shared/ui.js";
import { CATEGORY_ALL } from "../shared/stock-catalog.js";
import { estadoOrcamento, definirQuantidade } from "./orcamentos-v3-data.js";
import { renderizarTudo } from "./budget-ui.js";

export function conectarEventosCarrinho() {
  document.querySelector("#budgetSearchInput")?.addEventListener("input", (evento) => {
    estadoOrcamento.termo = evento.target.value.toLowerCase().trim();
    renderizarTudo();
  });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => {
    estadoOrcamento.termo = "";
    document.querySelector("#budgetSearchInput").value = "";
    renderizarTudo();
  });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-category]");
    if (!botao) return;
    estadoOrcamento.categoria = botao.dataset.category || CATEGORY_ALL;
    renderizarTudo();
  });
  document.querySelector("#stockPickerList")?.addEventListener("click", (evento) => ajustar(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("click", (evento) => ajustar(evento, "data-cart-id"));
  document.querySelector("#stockPickerList")?.addEventListener("change", (evento) => digitar(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("change", (evento) => digitar(evento, "data-cart-id"));
  document.querySelector("#formOrcamento")?.addEventListener("input", (evento) => {
    if (evento.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) renderizarTudo();
  });
}

function ajustar(evento, atributo) {
  const linha = evento.target.closest(`[${atributo}]`);
  if (!linha) return;

  if (evento.target.closest("[data-cart-remove]")) {
    mudar(linha.getAttribute(atributo), 0);
    return;
  }

  const botao = evento.target.closest("[data-step]");
  if (!botao) return;
  const id = linha.getAttribute(atributo);
  const atual = estadoOrcamento.carrinho.get(id)?.quantidade || 0;
  mudar(id, atual + (botao.dataset.step === "increase" ? 1 : -1));
}

function digitar(evento, atributo) {
  const campo = evento.target.closest("[data-step-input]");
  if (!campo) return;
  const id = campo.closest(`[${atributo}]`)?.getAttribute(atributo);
  mudar(id, campo.value);
}

function mudar(id, quantidade) {
  const item = estadoOrcamento.estoque.find((registro) => registro.id === id) || estadoOrcamento.carrinho.get(id)?.item;
  if (!item) return;

  const resultado = definirQuantidade(item, quantidade);
  if (!resultado.ok) {
    mostrarStatus(document.querySelector("#statusOrcamento"), `A quantidade de ${item.nome} não pode superar o estoque disponível.`);
  }
  renderizarTudo();
}
