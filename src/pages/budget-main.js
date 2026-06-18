import { montarLayout } from "../shared/layout.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, garantirEstoqueInicial } from "../services/estoque-service.js";
import { estadoOrcamento } from "./orcamentos-v3-data.js";
import { renderizarFiltrosEstoque, renderizarEstoqueOrcamento } from "./orcamentos-v3-stock-view.js";
import { renderizarItensCarrinho } from "./orcamentos-v3-cart-view.js";
import { atualizarResumo } from "./budget-ui.js";

let inicializacao;

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta" });

export function iniciarOrcamentos() {
  if (inicializacao) return inicializacao;
  inicializacao = (async () => {
    await iniciarBancoLocal();
    await garantirEstoqueInicial();
    estadoOrcamento.estoque = (await listarItensEstoque()).filter((item) => !item.arquivadoEm);
    estadoOrcamento.errosQuantidade = new Set();
    renderizarFiltrosEstoque();
    renderizarEstoqueOrcamento();
    renderizarItensCarrinho();
    atualizarResumo();
  })();
  return inicializacao;
}
