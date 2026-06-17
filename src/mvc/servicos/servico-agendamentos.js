import { converterRequisicao, executarTransacao, obterPorId, obterPorIndice, obterTodos } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, obterDataIso, STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../modelos/esquema-banco.js";

export async function listarAgendamentos() {
  return obterTodos(LOJAS.agendamentos);
}

export async function obterAgendamentoPorId(id) {
  return obterPorId(LOJAS.agendamentos, id);
}

export async function listarAgendamentosPorData(data) {
  return obterPorIndice(LOJAS.agendamentos, "porData", data);
}

export async function listarAgendamentosPorPeriodo(dataInicio, dataFim) {
  const todos = await listarAgendamentos();
  return todos.filter((agendamento) => agendamento.data >= dataInicio && agendamento.data <= dataFim);
}

export async function agendarOrcamento(orcamentoId, dados = {}) {
  let agendamento = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.agendamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (![STATUS_ORCAMENTO.aceito, STATUS_ORCAMENTO.agendado].includes(orcamento.status)) throw new Error("Apenas orçamento aceito pode ser agendado.");
    const agora = obterDataIso();
    const existente = await converterRequisicao(lojas[LOJAS.agendamentos].index("porOrcamento").get(orcamentoId));
    const historico = [...(existente?.historico || []), criarHistorico(existente ? "remarcado" : "agendado", dados.observacoes || dados.notes || "")];
    agendamento = {
      ...(existente || {}),
      id: existente?.id || criarIdentificador("agendamento"),
      orcamentoId,
      clienteId: orcamento.clienteId || null,
      data: dados.data || existente?.data || "",
      horaInicio: dados.horaInicio || dados.startTime || existente?.horaInicio || "",
      horaFim: dados.horaFim || dados.endTime || existente?.horaFim || "",
      status: existente ? STATUS_AGENDAMENTO.remarcado : STATUS_AGENDAMENTO.agendado,
      observacoes: dados.observacoes || dados.notes || existente?.observacoes || "",
      motivoCancelamento: existente?.motivoCancelamento || "",
      historico,
      criadoEm: existente?.criadoEm || agora,
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(agendamento));
    await converterRequisicao(lojas[LOJAS.orcamentos].put({ ...orcamento, status: STATUS_ORCAMENTO.agendado, agendadoEm: agora, atualizadoEm: agora }));
    await marcarBancoAlterado(lojas);
  });
  return agendamento;
}

export async function atualizarAgendamento(id, dados = {}) {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      data: dados.data || atual.data,
      horaInicio: dados.horaInicio || dados.startTime || atual.horaInicio,
      horaFim: dados.horaFim || dados.endTime || atual.horaFim,
      observacoes: dados.observacoes ?? dados.notes ?? atual.observacoes,
      status: dados.status || STATUS_AGENDAMENTO.remarcado,
      historico: [...(atual.historico || []), criarHistorico("remarcado", dados.observacoes || "")],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function cancelarAgendamento(id, motivo = "") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    atualizado = { ...atual, status: STATUS_AGENDAMENTO.cancelado, motivoCancelamento: motivo, canceladoEm: agora, historico: [...(atual.historico || []), criarHistorico("cancelado", motivo)], atualizadoEm: agora };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({ ...orcamento, status: STATUS_ORCAMENTO.aceito, atualizadoEm: agora }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function concluirAgendamento(id) {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    atualizado = { ...atual, status: STATUS_AGENDAMENTO.concluido, concluidoEm: agora, historico: [...(atual.historico || []), criarHistorico("concluido", "")], atualizadoEm: agora };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({ ...orcamento, status: STATUS_ORCAMENTO.concluido, concluidoEm: agora, atualizadoEm: agora }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

function criarHistorico(acao, observacao = "") {
  return { acao, observacao, data: obterDataIso() };
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
