import { mostrarStatus } from "../shared/ui.js";
import { CATEGORY_ALL } from "../shared/stock-catalog.js";
import { estadoOrcamento, definirQuantidade, limitarCarrinhoAoEstoque } from "./orcamentos-v3-data.js";
import { atualizarEstoque } from "./budget-main.js";
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
  document.querySelector("#stockPickerList")?.addEventListener("click", (evento) => mudarPorBotao(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("click", (evento) => mudarPorBotao(evento, "data-cart-id"));
  document.querySelector("#stockPickerList")?.addEventListener("change", (evento) => mudarPorCampo(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("change", (evento) => mudarPorCampo(evento, "data-cart-id"));
  document.querySelector("#formOrcamento")?.addEventListener("input", (evento) => {
    if (evento.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) renderizarTudo();
  });
  window.addEventListener("focus", recarregarEstoque);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) recarregarEstoque(); });
}

async function recarregarEstoque() {
  await atualizarEstoque();
  limitarCarrinhoAoEstoque();
  renderizarTudo();
}

function mudarPorBotao(evento, atributo) {
  const botao = evento.target.closest("[data-step]");
  if (!botao) return;
  const id = botao.closest(`[${atributo}]`)?.getAttribute(atributo);
  const atual = estadoOrcamento.carrinho.get(id)?.quantidade || 0;
  mudarQuantidade(id, atual + (botao.dataset.step === "increase" ? 1 : -1));
}

function mudarPorCampo(evento, atributo) {
  const campo = evento.target.closest("[data-step-input]");
  if (!campo) return;
  const id = campo.closest(`[${atributo}]`)?.getAttribute(atributo);
  mudarQuantidade(id, campo.value);
}

function mudarQuantidade(id, quantidade) {
  const item = estadoOrcamento.estoque.find((registro) => registro.id === id) || estadoOrcamento.carrinho.get(id)?.item;
  if (!item) return;
  const resultado = definirQuantidade(item, quantidade);
  if (!resultado.ok) mostrar(`A quantidade de ${item.nome} não pode superar o estoque disponível.`);
  renderizarTudo();
}

function mostrar(mensagem) { mostrarStatus(document.querySelector("#statusOrcamento"), mensagem); }
