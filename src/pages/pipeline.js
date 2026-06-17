import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData } from "../shared/formatters.js";
import { vazio, escapar, mostrarStatus } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { listarOrcamentos, marcarOrcamentoComoExportado, aceitarOrcamento, recusarOrcamento } from "../services/orcamentos-service.js";
import { agendarOrcamento, listarAgendamentos } from "../services/agenda-service.js";

const COLUNAS = [
  [STATUS_ORCAMENTO.rascunho, "Rascunhos"],
  [STATUS_ORCAMENTO.aguardandoCliente, "Aguardando cliente"],
  [STATUS_ORCAMENTO.aceito, "Aceitos / agendar"],
  [STATUS_ORCAMENTO.agendado, "Agendados"],
  [STATUS_ORCAMENTO.estoqueDescontado, "Estoque descontado"],
  [STATUS_ORCAMENTO.concluido, "Concluídos"],
  [STATUS_ORCAMENTO.recusado, "Recusados"]
];

let agendamentosPorOrcamento = new Map();
montarLayout({ paginaAtual: "pipeline", titulo: "Pipeline", subtitulo: "Orçamentos" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  await render();
}

async function render() {
  const [orcamentos, agendamentos] = await Promise.all([listarOrcamentos(), listarAgendamentos()]);
  agendamentosPorOrcamento = new Map(agendamentos.map((agendamento) => [agendamento.orcamentoId, agendamento]));
  document.querySelector("#pipelineBoard").innerHTML = COLUNAS.map(([status, titulo]) => {
    const lista = orcamentos.filter((orcamento) => orcamento.status === status);
    return `<section class="pipeline-column"><header><h2>${titulo}</h2><span class="pipeline-count">${lista.length}</span></header>${lista.length ? lista.map(card).join("") : vazio("Sem registros.")}</section>`;
  }).join("");
  bind();
}

function card(orcamento) {
  const agendamento = agendamentosPorOrcamento.get(orcamento.id);
  return `<article class="pipeline-card" data-orcamento-card="${orcamento.id}">
    <strong>${escapar(orcamento.nome)}</strong>
    <span>${escapar(orcamento.clienteNomeSnapshot || "Cliente não informado")} · ${formatarMoeda(orcamento.valorFinalSnapshot)}</span>
    ${agendamento ? `<p class="pipeline-date">Agendado para ${formatarData(agendamento.data)} · ${escapar(agendamento.horaInicio || "")}</p>` : ""}
    ${acoes(orcamento)}
  </article>`;
}

function acoes(orcamento) {
  if (orcamento.status === STATUS_ORCAMENTO.rascunho) {
    return `<div class="action-row"><button class="button button-secondary" data-acao="exportar" data-id="${orcamento.id}" type="button">Marcar enviado</button></div>`;
  }

  if (orcamento.status === STATUS_ORCAMENTO.aguardandoCliente) {
    return `<div class="action-row"><button class="button button-secondary" data-acao="aceitar" data-id="${orcamento.id}" type="button">Cliente aceitou</button><button class="button button-ghost" data-acao="recusar" data-id="${orcamento.id}" type="button">Cliente recusou</button></div>`;
  }

  if (orcamento.status === STATUS_ORCAMENTO.aceito) {
    return `<form class="schedule-form" data-agendar-form="${orcamento.id}">
      <label><span>Data</span><input type="date" name="data" required /></label>
      <label><span>Início</span><input type="time" name="horaInicio" required /></label>
      <label><span>Fim</span><input type="time" name="horaFim" /></label>
      <label class="schedule-notes"><span>Observações</span><input name="observacoes" placeholder="Ex: sinal pago, levar referência" /></label>
      <button class="button button-primary" type="submit">Agendar sessão</button>
    </form>`;
  }

  return "";
}

function bind() {
  document.querySelectorAll("[data-acao]").forEach((botao) => botao.addEventListener("click", async () => {
    try {
      if (botao.dataset.acao === "exportar") await marcarOrcamentoComoExportado(botao.dataset.id);
      if (botao.dataset.acao === "aceitar") await aceitarOrcamento(botao.dataset.id);
      if (botao.dataset.acao === "recusar") await recusarOrcamento(botao.dataset.id, prompt("Motivo da recusa", "") || "");
      await render();
    } catch (erro) {
      alert(erro.message || "Não foi possível atualizar o orçamento.");
    }
  }));

  document.querySelectorAll("[data-agendar-form]").forEach((form) => form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = new FormData(form);
    try {
      await agendarOrcamento(form.dataset.agendarForm, {
        data: dados.get("data"),
        horaInicio: dados.get("horaInicio"),
        horaFim: dados.get("horaFim"),
        observacoes: dados.get("observacoes")
      });
      await render();
    } catch (erro) {
      alert(erro.message || "Não foi possível agendar este orçamento.");
    }
  }));
}
