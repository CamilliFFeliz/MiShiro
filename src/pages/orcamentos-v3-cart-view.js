import { formatarMoeda } from "../shared/formatters.js";
import { escapar } from "../shared/ui.js";
import { CATEGORY_OPTIONAL } from "../shared/stock-catalog.js";
import { calcularCustoUnitario } from "../services/estoque-service.js";
import { estadoOrcamento, quantidadeDisponivel, totalDoRegistro, resumoUnidade, formatarQuantidade } from "./orcamentos-v3-data.js";

export function renderizarItensCarrinho() {
  const alvo = document.querySelector("#listaMateriais");
  if (!alvo) return;
  const registros = Array.from(estadoOrcamento.carrinho.values()).filter((registro) => registro.quantidade > 0);
  if (!registros.length) {
    alvo.innerHTML = '<p class="ops-empty">O carrinho está vazio. Adicione itens do estoque quando necessário.</p>';
    return;
  }
  const materiais = registros.filter(({ item }) => item.categoria !== CATEGORY_OPTIONAL);
  const opcionais = registros.filter(({ item }) => item.categoria === CATEGORY_OPTIONAL);
  alvo.innerHTML = [grupo("Materiais", materiais), grupo("Opcionais", opcionais)].filter(Boolean).join("");
}

function grupo(titulo, registros) { return registros.length ? `<section class="ops-cart-group"><h3>${titulo}</h3>${registros.map(cardCarrinho).join("")}</section>` : ""; }

function cardCarrinho(registro) {
  const { item, quantidade } = registro;
  const invalido = estadoOrcamento.errosQuantidade?.has(item.id) ? " is-invalid" : "";
  return `<article class="ops-cart-row ${item.categoria === CATEGORY_OPTIONAL ? "ops-cart-row--optional" : ""}" data-cart-id="${escapar(item.id)}"><div><strong>${escapar(item.nome)}</strong><small>${escapar(item.categoria)} · ${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(resumoUnidade(item))}</small></div>${stepper(quantidade, quantidadeDisponivel(item), invalido)}<div class="ops-cart-row__actions"><strong class="ops-cart-row__subtotal">${formatarMoeda(totalDoRegistro(registro))}</strong><button type="button" class="button button-ghost ops-cart-remove" data-remove-item aria-label="Remover ${escapar(item.nome)}">Remover</button></div></article>`;
}

function stepper(quantidade, limite, invalido) { return `<div class="ops-stepper${invalido}"><button type="button" data-step="decrease" aria-label="Diminuir quantidade" ${quantidade <= 0 ? "disabled" : ""}>−</button><input data-step-input inputmode="numeric" pattern="[0-9]*" value="${formatarQuantidade(quantidade)}" aria-label="Quantidade selecionada" /><button type="button" data-step="increase" aria-label="Aumentar quantidade" ${quantidade >= limite ? "disabled" : ""}>+</button></div>`; }
