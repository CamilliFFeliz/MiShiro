import { mostrarStatus } from "../shared/ui.js";
import { CATEGORY_ALL } from "../shared/stock-catalog.js";
import { estadoOrcamento, definirQuantidade } from "./orcamentos-v3-data.js";
import { renderizarTudo } from "./budget-ui.js";

export function conectarEventosCarrinho() {
  document.querySelector("#budgetSearchInput")?.addEventListener("input", (e) => { estadoOrcamento.termo = e.target.value.toLowerCase().trim(); renderizarTudo(); });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => { estadoOrcamento.termo = ""; document.querySelector("#budgetSearchInput").value = ""; renderizarTudo(); });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (e) => { const b=e.target.closest("[data-category]"); if(b){estadoOrcamento.categoria=b.dataset.category||CATEGORY_ALL;renderizarTudo();} });
  document.querySelector("#stockPickerList")?.addEventListener("click", (e) => ajustar(e,"data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("click", (e) => ajustar(e,"data-cart-id"));
  document.querySelector("#stockPickerList")?.addEventListener("change", (e) => digitar(e,"data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("change", (e) => digitar(e,"data-cart-id"));
  document.querySelector("#formOrcamento")?.addEventListener("input", (e) => { if(e.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) renderizarTudo(); });
}
function ajustar(e,a){const b=e.target.closest("[data-step]");if(!b)return;const id=b.closest(`[${a}]`)?.getAttribute(a);mudar(id,(estadoOrcamento.carrinho.get(id)?.quantidade||0)+(b.dataset.step==="increase"?1:-1));}
function digitar(e,a){const c=e.target.closest("[data-step-input]");if(c)mudar(c.closest(`[${a}]`)?.getAttribute(a),c.value);}
function mudar(id,q){const item=estadoOrcamento.estoque.find((r)=>r.id===id)||estadoOrcamento.carrinho.get(id)?.item;if(!item)return;const r=definirQuantidade(item,q);if(!r.ok)mostrarStatus(document.querySelector("#statusOrcamento"),`A quantidade de ${item.nome} não pode superar o estoque disponível.`);renderizarTudo();}


window.setTimeout(conectarEventosCarrinho, 500);
