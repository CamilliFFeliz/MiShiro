import { formatarMoeda } from "../shared/formatters.js";
import { atualizarIcones } from "../shared/ui.js";
import { totaisItens, totaisFinanceiros } from "./orcamentos-v3-data.js";
import { renderizarFiltrosEstoque, renderizarEstoqueOrcamento } from "./orcamentos-v3-stock-view.js";
import { renderizarItensCarrinho } from "./orcamentos-v3-cart-view.js";

export function renderizarTudo() {
  renderizarFiltrosEstoque();
  renderizarEstoqueOrcamento();
  renderizarItensCarrinho();
  atualizarResumo();
  atualizarIcones();
}

export function atualizarResumo() {
  const total = totaisFinanceiros(valor("#valorHora"), valor("#duracaoSessao"), valor("#desconto"), valor("#margem"));
  const itens = totaisItens();
  texto("#totalMateriais", formatarMoeda(total.materiais));
  texto("#totalMaoObra", formatarMoeda(total.maoObra));
  texto("#subtotalOrcamento", formatarMoeda(total.subtotal));
  texto("#valorDesconto", formatarMoeda(total.descontoValor));
  texto("#valorFinal", formatarMoeda(total.valorFinal));
  texto("#cartTotalMateriais", formatarMoeda(itens.materiais));
  texto("#cartTotalOpcionais", formatarMoeda(itens.opcionais));
  texto("#cartTotalGeral", formatarMoeda(itens.geral));
  return total;
}

function valor(seletor) { return document.querySelector(seletor)?.value || ""; }
function texto(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.textContent = conteudo; }
