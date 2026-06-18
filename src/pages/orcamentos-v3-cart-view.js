import { formatarMoeda } from "../shared/formatters.js";
import { escapar } from "../shared/ui.js";
import { CATEGORY_OPTIONAL } from "../shared/stock-catalog.js";
import { calcularCustoUnitario } from "../services/estoque-service.js";
import { estadoOrcamento, quantidadeDisponivel, totalDoRegistro, resumoUnidade, formatarQuantidade } from "./orcamentos-v3-data.js";

export function renderizarItensCarrinho() {
  const alvo = document.querySelector("#listaMateriais");
  if (!alvo) return;
  const registros = Array.from(estadoOrcamento.carrinho.values()).filter((registro) => registro.quantidade > 0);
  alvo.innerHTML = registros.length ? registros.map(cardCarrinho).join("") : '<p class="ops-empty">O carrinho está vazio. Adicione itens do estoque quando necessário.</p>';
}

function cardCarrinho(registro) {
  const { item, quantidade } = registro;
  const opcional = item.categoria === CATEGORY_OPTIONAL;
  return `<article class="ops-cart-row ${opcional ? "ops-cart-row--optional" : ""}" data-cart-id="${escapar(item.id)}"><div><strong>${escapar(item.nome)}</strong><small>${escapar(item.categoria)}${opcional ? " · opcional" : ""} · ${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(resumoUnidade(item))}</small></div>${stepper(quantidade, quantidadeDisponivel(item))}<strong class="ops-cart-row__subtotal">${formatarMoeda(totalDoRegistro(registro))}</strong></article>`;
}

function stepper(quantidade, limite) {
  return `<div class="ops-stepper"><button type="button" data-step="decrease" aria-label="Diminuir quantidade" ${quantidade <= 0 ? "disabled" : ""}>−</button><input data-step-input inputmode="numeric" value="${formatarQuantidade(quantidade)}" aria-label="Quantidade selecionada" /><button type="button" data-step="increase" aria-label="Aumentar quantidade" ${quantidade >= limite ? "disabled" : ""}>+</button></div>`;
}
