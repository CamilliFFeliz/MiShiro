import { montarLayout } from "../shared/layout.js";
import { chaveData, capitalizar, mesLongo, formatarData } from "../shared/formatters.js";
import { vazio, escapar, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarAgendamentos, agendarOrcamento, atualizarAgendamento, cancelarAgendamento, concluirAgendamento } from "../services/agenda-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../models/esquema-banco.js";

let dataAtual = new Date();
let selecionada = chaveData(new Date());
let agendamentos = [];
let orcamentosLista = [];
let orcamentos = new Map();
let agendamentosPorOrcamento = new Map();

montarLayout({ paginaAtual: "agenda", titulo: "Agenda", subtitulo: "Calendário" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  document.querySelector("#mesAnterior")?.addEventListener("click", () => mudarMes(-1));
  document.querySelector("#proximoMes")?.addEventListener("click", () => mudarMes(1));
  document.querySelector("#agendaForm")?.addEventListener("submit", salvarAgendaModal);
  document.querySelector("#fecharAgendaModal")?.addEventListener("click", fecharModal);
  document.querySelector("#listaParaAgendar")?.addEventListener("click", handleParaAgendarClick);
  document.querySelector("#listaEventos")?.addEventListener("click", handleEventoClick);
  await carregar();
  atualizarIcones();
}

async function carregar() {
  const dados = await Promise.all([listarAgendamentos(), listarOrcamentos()]);
  agendamentos = dados[0];
  orcamentosLista = dados[1];
  orcamentos = new Map(orcamentosLista.map((o) => [o.id, o]));
  agendamentosPorOrcamento = new Map(agendamentos.map((a) => [a.orcamentoId, a]));
  render();
}

function mudarMes(delta) {
  dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + delta, 1);
  selecionada = chaveData(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1));
  render();
}

function render() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());
  const dias = Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
  const prefixoMes = `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const ativos = agendamentos.filter((a) => a.status !== STATUS_AGENDAMENTO.cancelado);
  const mesEventos = ativos.filter((a) => a.data?.startsWith(prefixoMes));
  const diaEventos = ativos.filter((a) => a.data === selecionada);
  const canceladosMes = agendamentos.filter((a) => a.data?.startsWith(prefixoMes) && a.status === STATUS_AGENDAMENTO.cancelado);
  const paraAgendar = obterOrcamentosParaAgendar();
  document.querySelector("#mesAtual").textContent = capitalizar(mesLongo.format(dataAtual));
  document.querySelector("#totalMes").textContent = mesEventos.length;
  document.querySelector("#totalDia").textContent = diaEventos.length;
  document.querySelector("#totalParaAgendar").textContent = paraAgendar.length;
  document.querySelector("#totalCanceladosMes").textContent = canceladosMes.length;
  document.querySelector("#calendario").innerHTML = dias.map((dia) => diaHtml(dia, mes, ativos)).join("");
  document.querySelectorAll("[data-dia]").forEach((botao) => botao.addEventListener("click", () => { selecionada = botao.dataset.dia; render(); }));
  renderEventos(diaEventos.length ? diaEventos : mesEventos, diaEventos.length > 0);
  renderPipelineResumo();
  renderParaAgendar(paraAgendar);
}

function diaHtml(dia, mes, ativos) {
  const chave = chaveData(dia);
  const eventos = ativos.filter((a) => a.data === chave);
  return `<button class="calendar-day ${dia.getMonth() !== mes ? "is-muted" : ""} ${chave === selecionada ? "is-active" : ""} ${chave === chaveData(new Date()) ? "is-today" : ""}" type="button" data-dia="${chave}"><strong>${dia.getDate()}</strong>${eventos.length ? `<span class="day-count">${eventos.length}</span>` : ""}</button>`;
}

function renderEventos(lista, filtradoPorDia) {
  document.querySelector("#tituloEventos").textContent = filtradoPorDia ? `Eventos de ${formatarData(selecionada)}` : "Eventos do mês";
  document.querySelector("#listaEventos").innerHTML = lista.length ? lista.map((a) => {
    const o = orcamentos.get(a.orcamentoId);
    return `<article class="note-card agenda-event-card"><strong>${formatarData(a.data)} ${escapar(a.horaInicio || "")}</strong><span>${escapar(o?.clienteNomeSnapshot || "Cliente")} · ${escapar(o?.nome || "Orçamento")} · ${escapar(a.status)}</span><div class="action-row"><button class="button button-secondary" type="button" data-edit-agenda="${a.id}">Alterar</button><button class="button button-ghost" type="button" data-cancel-agenda="${a.id}">Cancelar</button><button class="button button-secondary" type="button" data-complete-agenda="${a.id}">Concluir</button></div></article>`;
  }).join("") : vazio("Nenhum agendamento encontrado.");
}

function renderPipelineResumo() {
  const status = [STATUS_ORCAMENTO.aguardandoCliente, STATUS_ORCAMENTO.aceito, STATUS_ORCAMENTO.agendado, STATUS_ORCAMENTO.concluido, STATUS_ORCAMENTO.recusado];
  document.querySelector("#pipelineResumo").innerHTML = status.map((s) => `<article><span>${escapar(rotuloStatus(s))}</span><strong>${orcamentosLista.filter((o) => o.status === s).length}</strong></article>`).join("");
}

function renderParaAgendar(lista) {
  document.querySelector("#listaParaAgendar").innerHTML = lista.length ? lista.map((o) => `<article class="note-card"><strong>${escapar(o.nome)}</strong><span>${escapar(o.clienteNomeSnapshot || "Cliente não informado")}</span><button class="button button-primary" type="button" data-schedule-budget="${o.id}">Agendar</button></article>`).join("") : vazio("Nenhum orçamento aceito aguardando agendamento.");
}

function obterOrcamentosParaAgendar() {
  return orcamentosLista.filter((orcamento) => {
    if (orcamento.status !== STATUS_ORCAMENTO.aceito) return false;
    const agendamento = agendamentosPorOrcamento.get(orcamento.id);
    return !agendamento || agendamento.status === STATUS_AGENDAMENTO.cancelado;
  });
}

function handleParaAgendarClick(evento) {
  const botao = evento.target.closest("[data-schedule-budget]");
  if (botao) abrirModalAgendamento({ orcamentoId: botao.dataset.scheduleBudget });
}

async function handleEventoClick(evento) {
  const editar = evento.target.closest("[data-edit-agenda]");
  const cancelar = evento.target.closest("[data-cancel-agenda]");
  const concluir = evento.target.closest("[data-complete-agenda]");
  if (editar) return abrirModalAgendamento({ agendamentoId: editar.dataset.editAgenda });
  if (cancelar) {
    const motivo = prompt("Motivo do cancelamento", "") || "Sem motivo informado";
    await cancelarAgendamento(cancelar.dataset.cancelAgenda, motivo);
    await carregar();
  }
  if (concluir) { await concluirAgendamento(concluir.dataset.completeAgenda); await carregar(); }
}

function abrirModalAgendamento({ orcamentoId = "", agendamentoId = "" }) {
  const agendamento = agendamentoId ? agendamentos.find((a) => a.id === agendamentoId) : null;
  document.querySelector("#agendaId").value = agendamento?.id || "";
  document.querySelector("#agendaOrcamentoId").value = agendamento?.orcamentoId || orcamentoId;
  document.querySelector("#agendaData").value = agendamento?.data || selecionada;
  document.querySelector("#agendaHoraInicio").value = agendamento?.horaInicio || "";
  document.querySelector("#agendaHoraFim").value = agendamento?.horaFim || "";
  document.querySelector("#agendaObservacoes").value = agendamento?.observacoes || "";
  document.querySelector("#agendaModalLabel").textContent = agendamento ? "Alterar agenda" : "Agendar orçamento";
  document.querySelector("#agendaModal")?.showModal?.();
}

function fecharModal() { document.querySelector("#agendaModal")?.close?.(); }

async function salvarAgendaModal(evento) {
  evento.preventDefault();
  const dados = { data: value("#agendaData"), horaInicio: value("#agendaHoraInicio"), horaFim: value("#agendaHoraFim"), observacoes: value("#agendaObservacoes") };
  const agendamentoId = value("#agendaId");
  if (agendamentoId) await atualizarAgendamento(agendamentoId, dados);
  else await agendarOrcamento(value("#agendaOrcamentoId"), dados);
  fecharModal();
  await carregar();
}

function rotuloStatus(status) {
  return ({ aguardando_cliente: "Aguardando", aceito: "Para agendar", agendado: "Agendados", concluido: "Concluídos", recusado: "Recusados" })[status] || status;
}

function value(selector) { return document.querySelector(selector)?.value || ""; }
