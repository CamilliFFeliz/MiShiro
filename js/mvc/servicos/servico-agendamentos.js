import { converterRequisicao, executarTransacao, obterPorIndice, obterTodos } from "../modelos/banco-local.js";
import { criarIdentificador, LOJAS, obterDataIso, STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../modelos/esquema-banco.js";

export async function listarAgendamentos() {
  return obterTodos(LOJAS.agendamentos);
}

export async function listarAgendamentosPorData(data) {
  return obterPorIndice(LOJAS.agendamentos, "porData", data);
}

export async function agendarOrcamento(orcamentoId, dados = {}) {
  let agendamento = null;
  await executarTransacao([LOJAS.orcamentos, LOJAS.agendamentos, LOJAS.metadadosBackup], "readwrite", async ({ lojas }) => {
    const orcamento = await converterRequisicao(lojas[LOJAS.orcamentos].get(orcamentoId));
    if (!orcamento) throw new Error("Orçamento não encontrado.");
    if (orcamento.status !== STATUS_ORCAMENTO.aceito) throw new Error("Apenas orçamento aceito pode ser agendado.");
    const agora = obterDataIso();
    agendamento = {
      id: criarIdentificador("agendamento"),
      orcamentoId,
      clienteId: orcamento.clienteId || null,
      data: dados.data || "",
      horaInicio: dados.horaInicio || dados.startTime || "",
      horaFim: dados.horaFim || dados.endTime || "",
      status: STATUS_AGENDAMENTO.agendado,
      observacoes: dados.observacoes || dados.notes || "",
      criadoEm: agora,
      atualizadoEm: agora
    };
    await converterRequisicao(lojas[LOJAS.agendamentos].put(agendamento));
    await converterRequisicao(lojas[LOJAS.orcamentos].put({ ...orcamento, status: STATUS_ORCAMENTO.agendado, agendadoEm: agora, atualizadoEm: agora }));
    await marcarBancoAlterado(lojas);
  });
  return agendamento;
}

async function marcarBancoAlterado(lojas) {
  const atual = await converterRequisicao(lojas[LOJAS.metadadosBackup].get("principal")) || { id: "principal" };
  await converterRequisicao(lojas[LOJAS.metadadosBackup].put({ ...atual, bancoAlteradoEm: obterDataIso(), atualizadoEm: obterDataIso() }));
}
