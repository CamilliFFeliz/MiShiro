import { converterRequisicao, executarTransacao, obterPorId, obterPorIndice, obterTodos } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, normalizarNumero, obterDataIso, STATUS_ORCAMENTO, TIPO_MOVIMENTO_ESTOQUE } from "../modelos/esquema-banco.js";
import { criarMovimentoEstoque } from "./servico-estoque.js";

const DIAS_RETENCAO_RECUSADOS = 10;

export async function listarOrcamentos() {
  return obterTodos(LOJAS.orcamentos);
}

export async function listarOrcamentosPorStatus(status) {
  return obterPorIndice(LOJAS.orcamentos, "porStatus", status);
}

export async function obterOrcamento(orcamentoId) {
  return obterPorId(LOJAS.orcamentos, orcamentoId);
}

export async function listarItensOrcamento(orcamentoId) {
  return obterPorIndice(LOJAS.itensOrcamento, "porOrcamento", orcamentoId);
}

export async function criarOrcamento(dados = {}, itens = []) {
  const agora = obterDataIso();
  const orcamento = montarOrcamento(dados, {}, agora);
  await gravarOrcamentoComItens(orcamento, itens, { substituirItens: false });
  return orcamento;
}

export async function atualizarOrcamento(orcamentoId, dados = {}, itens = []) {
  const atual = await obterOrcamento(orcamentoId);
  if (!atual) throw new Error("Orçamento não encontrado para edição.");
  const orcamento = montarOrcamento({ ...dados, id: orcamentoId, status: dados.status || atual.status, criadoEm: atual.criadoEm }, atual, obterDataIso());
  await gravarOrcamentoComItens(orcamento, itens, { substituirItens: true });
  return orcamento;
}

export async function excluirOrcamento(orcamentoId) {
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.agendamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    const itens = await converterRequisicao(lojas[LOJAS.itensOrcamento].index("porOrcamento").getAll(orcamentoId));
    const agendamento = await converterRequisicao(lojas[LOJAS.agendamentos].index("porOrcamento").get(orcamentoId));
    for (const item of itens) await converterRequisicao(lojas[LOJAS.itensOrcamento].delete(item.id));
    if (agendamento) await converterRequisicao(lojas[LOJAS.agendamentos].delete(agendamento.id));
    await converterRequisicao(lojas[LOJAS.orcamentos].delete(orcamentoId));
    await marcarBancoAlterado(lojas);
  });
  return true;
}

export async function limparOrcamentosRecusadosExpirados(referencia = new Date()) {
  const limite = new Date(referencia.getTime() - DIAS_RETENCAO_RECUSADOS * 24 * 60 * 60 * 1000).getTime();
  const recusados = await listarOrcamentosPorStatus(STATUS_ORCAMENTO.recusado);
  const expirados = recusados.filter((orcamento) => {
    const data = new Date(orcamento.recusadoEm || orcamento.atualizadoEm || orcamento.criadoEm || 0).getTime();
    return Number.isFinite(data) && data <= limite;
  });
  await Promise.all(expirados.map((orcamento) => excluirOrcamento(orcamento.id)));
  return expirados.length;
}

export async function marcarOrcamentoComoExportado(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aguardandoCliente, { exportadoEm: obterDataIso(), aguardandoClienteEm: obterDataIso() });
}

export async function enviarParaAprovacao(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aguardandoCliente, { aguardandoClienteEm: obterDataIso() });
}

export async function aceitarOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aceito, { aceitoEm: obterDataIso() });
}

export async function recusarOrcamento(orcamentoId, motivo = "") {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.recusado, { recusadoEm: obterDataIso(), motivoRecusa: String(motivo || "") });
}

export async function concluirOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.concluido, { concluidoEm: obterDataIso() });
}

export async function descontarEstoqueDoOrcamento(orcamentoId) {
  let orcamentoAtualizado = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.itensEstoque, LOJAS.movimentosEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (!([STATUS_ORCAMENTO.agendado, STATUS_ORCAMENTO.concluido].includes(orcamento.status))) throw new Error("Agende ou conclua a sessão antes de descontar o estoque.");
    if (orcamento.estoqueDescontadoEm) throw new Error("Este orçamento já teve estoque descontado.");
    const itens = await converterRequisicao(lojas[LOJAS.itensOrcamento].index("porOrcamento").getAll(orcamentoId));
    const lista = [];
    for (const itemOrcamento of itens) {
      const itemEstoque = await converterRequisicao(lojas[LOJAS.itensEstoque].get(itemOrcamento.itemEstoqueId));
      if (!itemEstoque || itemOrcamento.categoriaSnapshot === "Opcional") continue;
      const atual = normalizarNumero(itemEstoque.quantidadeAtual);
      const usado = normalizarNumero(itemOrcamento.quantidadeUsada);
      if (atual < usado) throw new Error(`Estoque insuficiente para ${itemEstoque.nome}.`);
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

async function gravarOrcamentoComItens(orcamento, itens, { substituirItens }) {
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    if (substituirItens) {
      const existentes = await converterRequisicao(lojas[LOJAS.itensOrcamento].index("porOrcamento").getAll(orcamento.id));
      for (const item of existentes) await converterRequisicao(lojas[LOJAS.itensOrcamento].delete(item.id));
    }
    await converterRequisicao(lojas[LOJAS.orcamentos].put(orcamento));
    for (const item of itens) {
      await converterRequisicao(lojas[LOJAS.itensOrcamento].put({ ...item, id: item.id || criarIdentificador("item-orcamento"), orcamentoId: orcamento.id }));
    }
    await marcarBancoAlterado(lojas);
  });
}

function montarOrcamento(dados = {}, anterior = {}, agora = obterDataIso()) {
  const statusPadrao = STATUS_ORCAMENTO.aguardandoCliente;
  const status = dados.status || anterior.status || statusPadrao;
  const valorHora = normalizarNumero(dados.valorHora ?? anterior.valorHora);
  const duracaoSessao = normalizarNumero(dados.duracaoSessao ?? anterior.duracaoSessao);
  const custoMaterialSnapshot = normalizarNumero(dados.custoMaterialSnapshot ?? anterior.custoMaterialSnapshot);
  const custoMaoObraSnapshot = normalizarNumero(dados.custoMaoObraSnapshot ?? anterior.custoMaoObraSnapshot);
  const subtotalSnapshot = normalizarNumero(dados.subtotalSnapshot ?? anterior.subtotalSnapshot ?? (custoMaterialSnapshot + custoMaoObraSnapshot));
  const descontoValorSnapshot = normalizarNumero(dados.descontoValorSnapshot ?? anterior.descontoValorSnapshot);
  const imagensReferencia = Array.isArray(dados.imagensReferencia)
    ? dados.imagensReferencia.filter((referencia) => referencia?.dataUrl)
    : Array.isArray(anterior.imagensReferencia) ? anterior.imagensReferencia : [];
  return {
    ...anterior,
    id: dados.id || anterior.id || criarIdentificador("orcamento"),
    nome: dados.nome ?? anterior.nome ?? "Orçamento",
    clienteId: dados.clienteId ?? anterior.clienteId ?? null,
    clienteNomeSnapshot: dados.clienteNomeSnapshot ?? anterior.clienteNomeSnapshot ?? "",
    clienteIdade: dados.clienteIdade ?? anterior.clienteIdade ?? "",
    clienteTelefone: dados.clienteTelefone ?? anterior.clienteTelefone ?? "",
    clienteEmail: dados.clienteEmail ?? anterior.clienteEmail ?? "",
    clienteAlergias: dados.clienteAlergias ?? anterior.clienteAlergias ?? "",
    clienteObservacoes: dados.clienteObservacoes ?? anterior.clienteObservacoes ?? "",
    horarioPreferencial: dados.horarioPreferencial ?? anterior.horarioPreferencial ?? "",
    status,
    valorHora,
    duracaoSessao,
    percentualMargemLucro: normalizarNumero(dados.percentualMargemLucro ?? anterior.percentualMargemLucro),
    percentualDesconto: normalizarNumero(dados.percentualDesconto ?? anterior.percentualDesconto),
    custoMaterialSnapshot,
    custoMaoObraSnapshot,
    subtotalSnapshot,
    descontoValorSnapshot,
    lucroValorSnapshot: normalizarNumero(dados.lucroValorSnapshot ?? anterior.lucroValorSnapshot),
    valorFinalSnapshot: normalizarNumero(dados.valorFinalSnapshot ?? anterior.valorFinalSnapshot),
    imagemReferencia: dados.imagemReferencia ?? anterior.imagemReferencia ?? imagensReferencia[0]?.dataUrl ?? "",
    imagensReferencia,
    tamanhoTatuagem: dados.tamanhoTatuagem ?? anterior.tamanhoTatuagem ?? "",
    localCorpo: dados.localCorpo ?? anterior.localCorpo ?? "",
    coresTatuagem: dados.coresTatuagem ?? anterior.coresTatuagem ?? "",
    complexidade: dados.complexidade ?? anterior.complexidade ?? "",
    observacoesCliente: dados.observacoesCliente ?? anterior.observacoesCliente ?? "",
    exportadoEm: anterior.exportadoEm || null,
    aguardandoClienteEm: anterior.aguardandoClienteEm || (status === STATUS_ORCAMENTO.aguardandoCliente ? agora : null),
    aceitoEm: anterior.aceitoEm || null,
    recusadoEm: anterior.recusadoEm || null,
    motivoRecusa: anterior.motivoRecusa || "",
    agendadoEm: anterior.agendadoEm || null,
    estoqueDescontadoEm: anterior.estoqueDescontadoEm || null,
    estoqueDesfeitoEm: anterior.estoqueDesfeitoEm || null,
    concluidoEm: anterior.concluidoEm || null,
    arquivadoEm: anterior.arquivadoEm || null,
    criadoEm: dados.criadoEm || anterior.criadoEm || agora,
    atualizadoEm: agora
  };
}

async function atualizarStatusOrcamento(orcamentoId, status, extras = {}) {
  const orcamento = await obterOrcamento(orcamentoId);
  if (!orcamento) throw new Error("Orçamento não encontrado.");
  const atualizado = { ...orcamento, ...extras, status, atualizadoEm: obterDataIso() };
  await executarTransacao([LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    await converterRequisicao(lojas[LOJAS.orcamentos].put(atualizado));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
