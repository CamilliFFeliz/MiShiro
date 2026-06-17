import { converterRequisicao, executarTransacao, obterPorId, obterPorIndice, obterTodos, salvarRegistro } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, normalizarNumero, obterDataIso, STATUS_ORCAMENTO, TIPO_MOVIMENTO_ESTOQUE } from "../modelos/esquema-banco.js";
import { criarMovimentoEstoque } from "./servico-estoque.js";

export async function listarOrcamentos() {
  return obterTodos(LOJAS.orcamentos);
}

export async function listarOrcamentosPorStatus(status) {
  return obterPorIndice(LOJAS.orcamentos, "porStatus", status);
}

export async function obterOrcamento(orcamentoId) {
  return obterPorId(LOJAS.orcamentos, orcamentoId);
}

export async function criarOrcamento(dados = {}, itens = []) {
  const agora = obterDataIso();
  const orcamento = { id: dados.id || criarIdentificador("orcamento"), nome: dados.nome || "Orçamento", clienteId: dados.clienteId || null, clienteNomeSnapshot: dados.clienteNomeSnapshot || "", status: dados.status || STATUS_ORCAMENTO.rascunho, valorHora: normalizarNumero(dados.valorHora), duracaoSessao: normalizarNumero(dados.duracaoSessao), percentualMargemLucro: normalizarNumero(dados.percentualMargemLucro), percentualDesconto: normalizarNumero(dados.percentualDesconto), custoMaterialSnapshot: normalizarNumero(dados.custoMaterialSnapshot), custoMaoObraSnapshot: normalizarNumero(dados.custoMaoObraSnapshot), valorFinalSnapshot: normalizarNumero(dados.valorFinalSnapshot), imagemReferencia: dados.imagemReferencia || "", tamanhoTatuagem: dados.tamanhoTatuagem || "", coresTatuagem: dados.coresTatuagem || "", observacoesCliente: dados.observacoesCliente || "", exportadoEm: null, aguardandoClienteEm: null, aceitoEm: null, recusadoEm: null, motivoRecusa: "", agendadoEm: null, estoqueDescontadoEm: null, estoqueDesfeitoEm: null, concluidoEm: null, arquivadoEm: null, criadoEm: dados.criadoEm || agora, atualizadoEm: agora };
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    await converterRequisicao(lojas[LOJAS.orcamentos].put(orcamento));
    for (const item of itens) await converterRequisicao(lojas[LOJAS.itensOrcamento].put({ ...item, id: item.id || criarIdentificador("item-orcamento"), orcamentoId: orcamento.id }));
    await marcarBancoAlterado(lojas);
  });
  return orcamento;
}

export async function marcarOrcamentoComoExportado(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aguardandoCliente, { exportadoEm: obterDataIso(), aguardandoClienteEm: obterDataIso() });
}

export async function aceitarOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aceito, { aceitoEm: obterDataIso() });
}

export async function recusarOrcamento(orcamentoId, motivo = "") {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.recusado, { recusadoEm: obterDataIso(), motivoRecusa: motivo });
}

export async function concluirOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.concluido, { concluidoEm: obterDataIso() });
}

export async function descontarEstoqueDoOrcamento(orcamentoId) {
  let orcamentoAtualizado = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.itensEstoque, LOJAS.movimentosEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (orcamento.status !== STATUS_ORCAMENTO.agendado) throw new Error("Agende antes de descontar estoque.");
    if (orcamento.estoqueDescontadoEm) throw new Error("Este orçamento já teve estoque descontado.");
    const itens = await converterRequisicao(lojas[LOJAS.itensOrcamento].index("porOrcamento").getAll(orcamentoId));
    if (!itens.length) throw new Error("Orçamento sem itens.");
    const lista = [];
    for (const itemOrcamento of itens) {
      const itemEstoque = await converterRequisicao(lojas[LOJAS.itensEstoque].get(itemOrcamento.itemEstoqueId));
      if (!itemEstoque) throw new Error("Item de estoque não encontrado.");
      const atual = normalizarNumero(itemEstoque.quantidadeAtual);
      const usado = normalizarNumero(itemOrcamento.quantidadeUsada);
      if (atual < usado) throw new Error("Estoque insuficiente.");
      lista.push({ itemEstoque, usado, atual });
    }
    for (const registro of lista) {
      const novo = registro.atual - registro.usado;
      await converterRequisicao(lojas[LOJAS.itensEstoque].put({ ...registro.itemEstoque, quantidadeAtual: novo, atualizadoEm: obterDataIso() }));
      await converterRequisicao(lojas[LOJAS.movimentosEstoque].put(criarMovimentoEstoque({ itemEstoqueId: registro.itemEstoque.id, orcamentoId, tipo: TIPO_MOVIMENTO_ESTOQUE.usoOrcamento, quantidade: registro.usado, quantidadeAnterior: registro.atual, quantidadeNova: novo, motivo: "Uso em orçamento agendado" })));
    }
    orcamentoAtualizado = { ...orcamento, status: STATUS_ORCAMENTO.estoqueDescontado, estoqueDescontadoEm: obterDataIso(), atualizadoEm: obterDataIso() };
    await converterRequisicao(lojas[LOJAS.orcamentos].put(orcamentoAtualizado));
    await marcarBancoAlterado(lojas);
  });
  return orcamentoAtualizado;
}

async function atualizarStatusOrcamento(orcamentoId, status, extras = {}) {
  const orcamento = await obterOrcamento(orcamentoId);
  if (!orcamento) throw new Error("Orçamento não encontrado.");
  const atualizado = { ...orcamento, ...extras, status, atualizadoEm: obterDataIso() };
  await salvarRegistro(LOJAS.orcamentos, atualizado);
  return atualizado;
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
