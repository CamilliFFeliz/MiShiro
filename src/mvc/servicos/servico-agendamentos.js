import { converterRequisicao, executarTransacao, obterPorId, obterPorIndice, obterTodos } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, obterDataIso, STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../modelos/esquema-banco.js";

const STATUS_ATIVOS = new Set([STATUS_AGENDAMENTO.agendado, STATUS_AGENDAMENTO.confirmado]);

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
  validarDadosAgenda(dados);
  let agendamento = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.agendamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (orcamento.status !== STATUS_ORCAMENTO.aceito) throw new Error("Apenas orçamentos em 'Para Agendar' podem receber uma nova data.");

    const agora = obterDataIso();
    const existente = await converterRequisicao(lojas[LOJAS.agendamentos].index("porOrcamento").get(orcamentoId));
    if (existente && ![STATUS_AGENDAMENTO.remarcado].includes(existente.status)) throw new Error("Este orçamento já possui um agendamento ativo ou encerrado.");

    const historico = [...(existente?.historico || [])];
    if (existente?.data) historico.push(criarHistorico("nova_data_definida", "Nova data registrada", resumoEvento(existente), dados.responsavel));
    else historico.push(criarHistorico("agendado", dados.observacoes || "", null, dados.responsavel));

    agendamento = {
      ...(existente || {}),
      id: existente?.id || criarIdentificador("agendamento"),
      orcamentoId,
      clienteId: orcamento.clienteId || null,
      data: dados.data,
      horaInicio: dados.horaInicio || dados.startTime,
      horaFim: dados.horaFim || dados.endTime,
      cor: dados.cor || "#8B5CF6",
      status: STATUS_AGENDAMENTO.agendado,
      observacoes: dados.observacoes ?? dados.notes ?? "",
      motivoCancelamento: "",
      motivoReagendamento: "",
      historico,
      criadoEm: existente?.criadoEm || agora,
      atualizadoEm: agora
    };

    await converterRequisicao(lojas[LOJAS.agendamentos].put(agendamento));
    await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.agendado,
      agendadoEm: agora,
      reagendamentoPendenteEm: null,
      historicoAgendamentos: adicionarHistoricoOrcamento(orcamento, "agendado", "Sessão agendada", resumoEvento(agendamento), agora, dados.responsavel),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return agendamento;
}

export async function atualizarAgendamento(id, dados = {}) {
  const atual = await obterAgendamentoPorId(id);
  if (!atual) throw new Error("Agendamento não encontrado.");
  if (!STATUS_ATIVOS.has(atual.status)) throw new Error("Somente agendamentos ativos podem ser alterados.");
  validarDadosAgenda({ ...atual, ...dados });

  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const registro = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(registro.orcamentoId));
    const agora = obterDataIso();
    atualizado = {
      ...registro,
      data: dados.data || registro.data,
      horaInicio: dados.horaInicio || dados.startTime || registro.horaInicio,
      horaFim: dados.horaFim || dados.endTime || registro.horaFim,
      cor: dados.cor || registro.cor || "#8B5CF6",
      observacoes: dados.observacoes ?? dados.notes ?? registro.observacoes,
      historico: [...(registro.historico || []), criarHistorico("dados_alterados", dados.observacoes || "", resumoEvento(registro), dados.responsavel)],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      historicoAgendamentos: adicionarHistoricoOrcamento(orcamento, "dados_alterados", "Dados do agendamento atualizados", resumoEvento(atualizado), agora, dados.responsavel),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function solicitarReagendamento(id, motivo = "", responsavel = "Equipe do estúdio") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    if (!STATUS_ATIVOS.has(atual.status)) throw new Error("Apenas agendamentos ativos podem ser reagendados.");
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.remarcado,
      reagendadoEm: agora,
      motivoReagendamento: String(motivo || ""),
      historico: [...(atual.historico || []), criarHistorico("reagendado", motivo, resumoEvento(atual), responsavel)],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.aceito,
      reagendamentoPendenteEm: agora,
      historicoAgendamentos: adicionarHistoricoOrcamento(orcamento, "reagendado", motivo || "Nova data pendente", resumoEvento(atual), agora, responsavel),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function reagendarAgendamento(id, dados = {}) {
  const agendamento = await obterAgendamentoPorId(id);
  if (!agendamento) throw new Error("Agendamento não encontrado.");
  await solicitarReagendamento(id, dados.motivoReagendamento || "Reagendado pelo calendário", dados.responsavel);
  return agendarOrcamento(agendamento.orcamentoId, dados);
}

export async function cancelarAgendamento(id, motivo = "", responsavel = "Equipe do estúdio") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    if (!STATUS_ATIVOS.has(atual.status)) throw new Error("Somente agendamentos ativos podem ser cancelados.");
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.cancelado,
      motivoCancelamento: String(motivo || ""),
      canceladoEm: agora,
      historico: [...(atual.historico || []), criarHistorico("cancelado", motivo, resumoEvento(atual), responsavel)],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.cancelado,
      canceladoEm: agora,
      motivoCancelamento: atualizado.motivoCancelamento,
      historicoAgendamentos: adicionarHistoricoOrcamento(orcamento, "cancelado", atualizado.motivoCancelamento || "Sessão cancelada", resumoEvento(atual), agora, responsavel),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

export async function concluirAgendamento(id, responsavel = "Equipe do estúdio") {
  let atualizado = null;
  await executarTransacao([LOJAS.agendamentos, LOJAS.orcamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const atual = await converterRequisicao(lojas[LOJAS.agendamentos].get(id));
    if (!atual) throw new Error("Agendamento não encontrado.");
    if (!STATUS_ATIVOS.has(atual.status)) throw new Error("Somente agendamentos ativos podem ser concluídos.");
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(atual.orcamentoId));
    const agora = obterDataIso();
    atualizado = {
      ...atual,
      status: STATUS_AGENDAMENTO.concluido,
      concluidoEm: agora,
      historico: [...(atual.historico || []), criarHistorico("concluido", "Sessão concluída", resumoEvento(atual), responsavel)],
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(atualizado));
    if (orcamento) await converterRequisicao(lojas[LOJAS.orcamentos].put({
      ...orcamento,
      status: STATUS_ORCAMENTO.concluido,
      concluidoEm: agora,
      historicoAgendamentos: adicionarHistoricoOrcamento(orcamento, "concluido", "Sessão concluída", resumoEvento(atualizado), agora, responsavel),
      atualizadoEm: agora
    }));
    await marcarBancoAlterado(lojas);
  });
  return atualizado;
}

function validarDadosAgenda(dados) {
  if (!String(dados.data || "").trim()) throw new Error("Informe a data do agendamento.");
  if (!String(dados.horaInicio || dados.startTime || "").trim()) throw new Error("Informe a hora de início.");
  if (!String(dados.horaFim || dados.endTime || "").trim()) throw new Error("Informe a hora final.");
}

function criarHistorico(acao, observacao = "", evento = null, responsavel = "Equipe do estúdio") {
  return { acao, observacao: String(observacao || ""), evento, responsavel: responsavel || "Equipe do estúdio", data: obterDataIso() };
}

function resumoEvento(evento) {
  return {
    data: evento?.data || "",
    horaInicio: evento?.horaInicio || "",
    horaFim: evento?.horaFim || "",
    cor: evento?.cor || "#8B5CF6",
    status: evento?.status || STATUS_AGENDAMENTO.agendado
  };
}

function adicionarHistoricoOrcamento(orcamento, acao, motivo, evento, data, responsavel = "Equipe do estúdio") {
  return [...(orcamento.historicoAgendamentos || []), { acao, motivo: String(motivo || ""), evento, responsavel: responsavel || "Equipe do estúdio", data }];
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
