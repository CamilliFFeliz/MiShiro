import { formatarMoeda } from "../shared/formatters.js";
import { escapar } from "../shared/ui.js";
import { CATEGORY_ALL, CATEGORY_ORDER, getItemSpecification } from "../shared/stock-catalog.js";
import { calcularCustoUnitario } from "../services/estoque-service.js";
import { estadoOrcamento, quantidadeDisponivel, quantidadeSelecionada, resumoUnidade, formatarQuantidade } from "./orcamentos-v3-data.js";

export function renderizarFiltrosEstoque() {
  const alvo = document.querySelector("#budgetCategoryFilters");
  if (!alvo) return;
  alvo.innerHTML = CATEGORY_ORDER.map((categoria) => `<button type="button" class="ops-filter-chip ${categoria === estadoOrcamento.categoria ? "is-active" : ""}" data-category="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

export function renderizarEstoqueOrcamento() {
  const alvo = document.querySelector("#stockPickerList");
  if (!alvo) return;
  const lista = estadoOrcamento.estoque.filter((item) => {
    const texto = [item.nome, item.categoria, item.marca, item.linhaTipo, item.cor, getItemSpecification(item)].join(" ").toLowerCase();
    return (estadoOrcamento.categoria === CATEGORY_ALL || item.categoria === estadoOrcamento.categoria) && (!estadoOrcamento.termo || texto.includes(estadoOrcamento.termo));
  });
  alvo.innerHTML = lista.length ? lista.map(cardEstoque).join("") : '<p class="ops-empty">Nenhum item encontrado nesta busca.</p>';
}

function cardEstoque(item) {
  const selecionada = quantidadeSelecionada(item.id);
  const disponivel = quantidadeDisponivel(item);
  const invalido = estadoOrcamento.errosQuantidade?.has(item.id) ? " is-invalid" : "";
  return `<article class="ops-stock-item" data-stock-id="${escapar(item.id)}"><div class="ops-stock-item__title"><strong>${escapar(item.nome)}</strong><span class="ops-category-badge">${escapar(item.categoria)}</span></div><div class="ops-stock-item__meta"><span>${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(resumoUnidade(item))}</span><span>${escapar(getItemSpecification(item) || "Sem especificação adicional")}</span></div><div class="ops-stock-item__bottom"><div class="ops-stock-item__available"><span>Disponível</span><strong>${formatarQuantidade(disponivel)} ${escapar(resumoUnidade(item))}</strong></div>${stepper(selecionada, disponivel, invalido)}</div></article>`;
}

function stepper(quantidade, limite, invalido) { return `<div class="ops-stepper${invalido}"><button type="button" data-step="decrease" aria-label="Diminuir quantidade" ${quantidade <= 0 ? "disabled" : ""}>−</button><input data-step-input inputmode="numeric" pattern="[0-9]*" value="${formatarQuantidade(quantidade)}" aria-label="Quantidade selecionada" /><button type="button" data-step="increase" aria-label="Aumentar quantidade" ${quantidade >= limite ? "disabled" : ""}>+</button></div>`; }
