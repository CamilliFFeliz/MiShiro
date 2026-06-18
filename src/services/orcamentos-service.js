import { converterRequisicao, executarTransacao, obterPorId, obterPorIndice, obterTodos } from "../models/banco-local.js";
import { criarIdentificador, LOJAS, normalizarNumero, obterDataIso, STATUS_ORCAMENTO, TIPO_MOVIMENTO_ESTOQUE } from "../models/esquema-banco.js";
import { criarMovimentoEstoque } from "./estoque-service.js";

const DIAS_RETENCAO_RECUSADOS = 10;
const STATUS_NAO_EDITAVEIS = new Set([STATUS_ORCAMENTO.concluido, STATUS_ORCAMENTO.cancelado, STATUS_ORCAMENTO.recusado]);

export async function listarOrcamentos() {
  const registros = await obterTodos(LOJAS.orcamentos);
  return registros.map(normalizarOrcamentoLegado);
}

export async function listarOrcamentosPorStatus(status) {
  const registros = await obterPorIndice(LOJAS.orcamentos, "porStatus", status);
  return registros.map(normalizarOrcamentoLegado);
}

export async function obterOrcamento(orcamentoId) {
  const registro = await obterPorId(LOJAS.orcamentos, orcamentoId);
  return registro ? normalizarOrcamentoLegado(registro) : null;
}

export async function listarItensOrcamento(orcamentoId) {
  return obterPorIndice(LOJAS.itensOrcamento, "porOrcamento", orcamentoId);
}

export async function criarOrcamento(dados = {}, itens = []) {
  validarCamposObrigatorios(dados);
  const agora = obterDataIso();
  const orcamento = recalcularFinanceiro(montarOrcamento(dados, {}, agora), itens);
  await gravarOrcamentoComItens(orcamento, itens, { substituirItens: false });
  return orcamento;
}

export async function atualizarOrcamento(orcamentoId, dados = {}, itens = []) {
  const atual = await obterOrcamento(orcamentoId);
  if (!atual) throw new Error("Orçamento não encontrado para edição.");
  if (STATUS_NAO_EDITAVEIS.has(atual.status) && dados.status !== atual.status) throw new Error("Este orçamento está encerrado e não pode voltar para um status ativo sem uma reabertura explícita.");
  validarCamposObrigatorios({ ...atual, ...dados });
  const montado = montarOrcamento({ ...dados, id: orcamentoId, status: dados.status || atual.status, criadoEm: atual.criadoEm }, atual, obterDataIso());
  const orcamento = recalcularFinanceiro(montado, itens);
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

export async function enviarParaAprovacao(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aguardandoCliente, (orcamento, agora) => {
    validarCamposObrigatorios(orcamento);
    if ([STATUS_ORCAMENTO.recusado, STATUS_ORCAMENTO.cancelado, STATUS_ORCAMENTO.concluido].includes(orcamento.status)) throw new Error("Um orçamento encerrado não pode ser enviado para aprovação.");
    return { aguardandoClienteEm: agora };
  });
}

export async function marcarOrcamentoComoExportado(orcamentoId) {
  return enviarParaAprovacao(orcamentoId);
}

export async function aceitarOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.aceito, (orcamento, agora) => {
    if (orcamento.status !== STATUS_ORCAMENTO.aguardandoCliente) throw new Error("Somente propostas aguardando aprovação podem ser aprovadas.");
    return { aceitoEm: agora, motivoRecusa: "" };
  });
}

export async function recusarOrcamento(orcamentoId, motivo = "") {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.recusado, (orcamento, agora) => {
    if (orcamento.status !== STATUS_ORCAMENTO.aguardandoCliente) throw new Error("Somente propostas aguardando aprovação podem ser reprovadas.");
    return { recusadoEm: agora, motivoRecusa: String(motivo || "") };
  });
}

export async function concluirOrcamento(orcamentoId) {
  return atualizarStatusOrcamento(orcamentoId, STATUS_ORCAMENTO.concluido, () => ({ concluidoEm: obterDataIso() }));
}

export async function descontarEstoqueDoOrcamento(orcamentoId) {
  let orcamentoAtualizado = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.itensEstoque, LOJAS.movimentosEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (![STATUS_ORCAMENTO.agendado, STATUS_ORCAMENTO.concluido].includes(orcamento.status)) throw new Error("Agende ou conclua a sessão antes de descontar o estoque.");
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
      await converterRequisicao(lojas[LOJAS.movimentosEstoque].put(criarMovimentoEstoque({ itemEstoqueId: registro.itemEstoque.id, orcamentoId, tipo: TIPO_MOVIMENTO_ESTOQUE.usoOrcamento, quantidade: registro.usado, quantidadeAnterior: registro.atual, quantidadeNova: novo, motivo: "Uso em orçamento concluído" })));
    }

    orcamentoAtualizado = { ...orcamento, status: STATUS_ORCAMENTO.estoqueDescontado, estoqueDescontadoEm: obterDataIso(), atualizadoEm: obterDataIso() };
    await converterRequisicao(lojas[LOJAS.orcamentos].put(orcamentoAtualizado));
    await marcarBancoAlterado(lojas);
  });
  return orcamentoAtualizado;
}

async function gravarOrcamentoComItens(orcamento, itens, { substituirItens }) {
  await executarTransacao([LOJAS.orcamentos, LOJAS.itensOrcamento, LOJAS.itensEstoque, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const itensValidos = itens.filter((item) => normalizarNumero(item.quantidadeUsada) > 0);
    for (const item of itensValidos) {
      const estoque = await converterRequisicao(lojas[LOJAS.itensEstoque].get(item.itemEstoqueId));
      if (!estoque) continue;
      if (normalizarNumero(item.quantidadeUsada) > normalizarNumero(estoque.quantidadeAtual)) throw new Error(`A quantidade de ${item.nomeItemSnapshot || estoque.nome} é maior que o estoque disponível.`);
    }

    if (substituirItens) {
      const existentes = await converterRequisicao(lojas[LOJAS.itensOrcamento].index("porOrcamento").getAll(orcamento.id));
      for (const item of existentes) await converterRequisicao(lojas[LOJAS.itensOrcamento].delete(item.id));
    }

    await converterRequisicao(lojas[LOJAS.orcamentos].put(orcamento));
    for (const item of itensValidos) {
      await converterRequisicao(lojas[LOJAS.itensOrcamento].put({ ...item, id: item.id || criarIdentificador("item-orcamento"), orcamentoId: orcamento.id }));
    }
    await marcarBancoAlterado(lojas);
  });
}

function montarOrcamento(dados = {}, anterior = {}, agora = obterDataIso()) {
  const status = dados.status || anterior.status || STATUS_ORCAMENTO.rascunho;
  const imagensReferencia = Array.isArray(dados.imagensReferencia)
    ? dados.imagensReferencia.filter((referencia) => referencia?.dataUrl)
    : Array.isArray(anterior.imagensReferencia) ? anterior.imagensReferencia : [];

  return {
    ...anterior,
    id: dados.id || anterior.id || criarIdentificador("orcamento"),
    nome: dados.nome ?? anterior.nome ?? "",
    clienteId: dados.clienteId ?? anterior.clienteId ?? null,
    clienteNomeSnapshot: dados.clienteNomeSnapshot ?? anterior.clienteNomeSnapshot ?? "",
    clienteIdade: dados.clienteIdade ?? anterior.clienteIdade ?? "",
    clienteTelefone: dados.clienteTelefone ?? anterior.clienteTelefone ?? "",
    clienteEmail: dados.clienteEmail ?? anterior.clienteEmail ?? "",
    clienteAlergias: dados.clienteAlergias ?? anterior.clienteAlergias ?? "",
    clienteCuidados: dados.clienteCuidados ?? anterior.clienteCuidados ?? "",
    clienteObservacoes: dados.clienteObservacoes ?? anterior.clienteObservacoes ?? "",
    horarioPreferencial: dados.horarioPreferencial ?? anterior.horarioPreferencial ?? "",
    status: normalizarStatusLegado(status),
    valorHora: normalizarNumero(dados.valorHora ?? anterior.valorHora),
    duracaoSessao: normalizarNumero(dados.duracaoSessao ?? anterior.duracaoSessao),
    percentualMargemLucro: normalizarNumero(dados.percentualMargemLucro ?? anterior.percentualMargemLucro),
    percentualDesconto: normalizarNumero(dados.percentualDesconto ?? anterior.percentualDesconto),
    custoMaterialSnapshot: normalizarNumero(dados.custoMaterialSnapshot ?? anterior.custoMaterialSnapshot),
    custoMaoObraSnapshot: normalizarNumero(dados.custoMaoObraSnapshot ?? anterior.custoMaoObraSnapshot),
    subtotalSnapshot: normalizarNumero(dados.subtotalSnapshot ?? anterior.subtotalSnapshot),
    descontoValorSnapshot: normalizarNumero(dados.descontoValorSnapshot ?? anterior.descontoValorSnapshot),
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
    aguardandoClienteEm: status === STATUS_ORCAMENTO.aguardandoCliente ? (anterior.aguardandoClienteEm || agora) : anterior.aguardandoClienteEm || null,
    aceitoEm: anterior.aceitoEm || null,
    recusadoEm: anterior.recusadoEm || null,
    motivoRecusa: anterior.motivoRecusa || "",
    agendadoEm: anterior.agendadoEm || null,
    canceladoEm: anterior.canceladoEm || null,
    motivoCancelamento: anterior.motivoCancelamento || "",
    concluidoEm: anterior.concluidoEm || null,
    historicoAgendamentos: Array.isArray(anterior.historicoAgendamentos) ? anterior.historicoAgendamentos : [],
    estoqueDescontadoEm: anterior.estoqueDescontadoEm || null,
    estoqueDesfeitoEm: anterior.estoqueDesfeitoEm || null,
    arquivadoEm: anterior.arquivadoEm || null,
    criadoEm: dados.criadoEm || anterior.criadoEm || agora,
    atualizadoEm: agora
  };
}

function recalcularFinanceiro(orcamento, itens) {
  const material = arredondar(itens.reduce((total, item) => total + normalizarNumero(item.subtotalSnapshot), 0));
  const maoObra = arredondar(normalizarNumero(orcamento.valorHora) * normalizarNumero(orcamento.duracaoSessao));
  const subtotal = arredondar(material + maoObra);
  const desconto = arredondar(subtotal * normalizarNumero(orcamento.percentualDesconto) / 100);
  const lucro = arredondar(subtotal * normalizarNumero(orcamento.percentualMargemLucro) / 100);
  return {
    ...orcamento,
    custoMaterialSnapshot: material,
    custoMaoObraSnapshot: maoObra,
    subtotalSnapshot: subtotal,
    descontoValorSnapshot: desconto,
    lucroValorSnapshot: lucro,
    valorFinalSnapshot: arredondar(Math.max(subtotal - desconto, 0))
  };
}

async function atualizarStatusOrcamento(orcamentoId, status, extrasFactory = () => ({})) {
  const orcamento = await obterOrcamento(orcamentoId);
  if (!orcamento) throw new Error("Orçamento não encontrado.");
  const agora = obterDataIso();
  const extras = extrasFactory(orcamento, agora);
  const atualizado = { ...orcamento, ...extras, status, atualizadoEm: agora };
  await executarTransacao([LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    await converterRequisicao(lojas[LOJAS.orcamentos].put(atualizado));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

function validarCamposObrigatorios(dados) {
  const erros = [];
  if (!String(dados.nome || "").trim()) erros.push("Nome do orçamento");
  if (!String(dados.clienteNomeSnapshot || "").trim()) erros.push("Nome do cliente");
  if (erros.length) throw new Error(`Preencha: ${erros.join(" e ")}.`);
}

function normalizarOrcamentoLegado(orcamento) {
  return { ...orcamento, status: normalizarStatusLegado(orcamento.status) };
}

function normalizarStatusLegado(status) {
  if (status === STATUS_ORCAMENTO.exportado) return STATUS_ORCAMENTO.aguardandoCliente;
  if (status === STATUS_ORCAMENTO.estoqueDescontado) return STATUS_ORCAMENTO.concluido;
  return status || STATUS_ORCAMENTO.rascunho;
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}

function arredondar(valor) {
  return Math.round((normalizarNumero(valor) + Number.EPSILON) * 100) / 100;
}
