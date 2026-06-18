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
    if (![STATUS_ORCAMENTO.aceito, STATUS_ORCAMENTO.agendado].includes(orcamento.status)) throw new Error("Apenas orçamento aprovado pode ser agendado.");

    const agora = obterDataIso();
    const existente = await converterRequisicao(lojas[LOJAS.agendamentos].index("porOrcamento").get(orcamentoId));
    const historico = [...(existente?.historico || [])];
    if (existente?.data) historico.push(criarHistorico("novo_agendamento", "Nova data definida após reagendamento", resumirEvento(existente)));
    else historico.push(criarHistorico("agendado", dados.observacoes || dados.notes || ""));

    agendamento = {
      ...(existente || {}),
      id: existente?.id || criarIdentificador("agendamento"),
      orcamentoId,
      clienteId: orcamento.clienteId || null,
      data: dados.data || existente?.data || "",
      horaInicio: dados.horaInicio || dados.startTime || existente?.horaInicio || "",
      horaFim: dados.horaFim || dados.endTime || existente?.horaFim || "",
      cor: dados.cor || existente?.cor || "#8B5CF6",
      status: STATUS_AGENDAMENTO.agendado,
      observacoes: dados.observacoes ?? dados.notes ?? existente?.observacoes ?? "",
      motivoCancelamento: "",
      historico,
      criadoEm: existente?.criadoEm || agora,
      atualizadoEm: agora
    };

    const historicoOrcamento = registrarHistoricoOrcamento(orcamento, "agendado", "Sessão agendada", resumirEvento(agendamento), agora);
    await converterRequisicao(lojas[LOJAS.agendamentos].put(agendamento));
    await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.agendado,
      agendadoEm: agora,
      reagendamentoPendenteEm: null,
      historicoAgendamentos: historicoOrcamento,
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return agendamento;
}

export async function atualizarAgendamento(id, dados = {}) {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    const novoStatus = dados.status || STATUS_AGENDAMENTO.agendado;
    atualizado = {
      ...atual,
      data: dados.data || atual.data,
      horaInicio: dados.horaInicio || dados.startTime || atual.horaInicio,
      horaFim: dados.horaFim || dados.endTime || atual.horaFim,
      cor: dados.cor || atual.cor || "#8B5CF6",
      observacoes: dados.observacoes ?? dados.notes ?? atual.observacoes,
      status: novoStatus,
      historico: [...(atual.historico || []), criarHistorico("alterado", dados.observacoes || "", resumirEvento(atual))],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) {
      const statusOrcamento = novoStatus === STATUS_AGENDAMENTO.cancelado
        ? STATUS_ORCAMENTO.aceito
        : novoStatus === STATUS_AGENDAMENTO.concluido
          ? STATUS_ORCAMENTO.concluido
          : STATUS_ORCAMENTO.agendado;
      await converterRequisicao(lojas[LOJAS.orcamentos].put({
        ...orcamento,
        status: statusOrcamento,
        historicoAgendamentos: registrarHistoricoOrcamento(orcamento, novoStatus, "Dados do agendamento alterados", resumirEvento(atualizado), agora),
        atualizadoEm: agora,
        ...(statusOrcamento === STATUS_ORCAMENTO.concluido ? { concluidoEm: agora } : {})
      }));
    }
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function solicitarReagendamento(id, motivo = "") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.remarcado,
      reagendadoEm: agora,
      motivoReagendamento: String(motivo || ""),
      historico: [...(atual.historico || []), criarHistorico("reagendamento_solicitado", motivo, resumirEvento(atual))],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) {
      await converterRequisicao(lojas[LOJAS.orcamentos].put({
        ...orcamento,
        status: STATUS_ORCAMENTO.aceito,
        reagendamentoPendenteEm: agora,
        historicoAgendamentos: registrarHistoricoOrcamento(orcamento, "reagendado", motivo || "Nova data pendente", resumirEvento(atual), agora),
        atualizadoEm: agora
      }));
    }
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function reagendarAgendamento(id, dados = {}) {
  return atualizarAgendamento(id, { ...dados, status: STATUS_AGENDAMENTO.agendado });
}

export async function cancelarAgendamento(id, motivo = "") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.cancelado,
      motivoCancelamento: String(motivo || "Cancelado na agenda"),
      canceladoEm: agora,
      historico: [...(atual.historico || []), criarHistorico("cancelado", motivo, resumirEvento(atual))],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.aceito,
      canceladoEm: agora,
      motivoCancelamento: atualizado.motivoCancelamento,
      historicoAgendamentos: registrarHistoricoOrcamento(orcamento, "cancelado", atualizado.motivoCancelamento, resumirEvento(atual), agora),
      atualizadoEm: agora
    }));
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
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.concluido,
      concluidoEm: agora,
      historico: [...(atual.historico || []), criarHistorico("concluido", "", resumirEvento(atual))],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.concluido,
      concluidoEm: agora,
      historicoAgendamentos: registrarHistoricoOrcamento(orcamento, "concluido", "Sessão concluída", resumirEvento(atualizado), agora),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

function criarHistorico(acao, observacao = "", evento = null) {
  return { acao, observacao: String(observacao || ""), evento, data: obterDataIso() };
}

function resumirEvento(evento) {
  return {
    data: evento?.data || "",
    horaInicio: evento?.horaInicio || "",
    horaFim: evento?.horaFim || "",
    cor: evento?.cor || "#8B5CF6",
    status: evento?.status || STATUS_AGENDAMENTO.agendado
  };
}

function registrarHistoricoOrcamento(orcamento, acao, motivo, evento, data) {
  return [...(orcamento.historicoAgendamentos || []), { acao, motivo: String(motivo || ""), evento, data }];
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
