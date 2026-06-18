import { montarLayout } from "../shared/layout.js";
import { chaveData, capitalizar, mesLongo, formatarData, formatarMoeda } from "../shared/formatters.js";
import { escapar, vazio, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarAgendamentos, agendarOrcamento, reagendarAgendamento, solicitarReagendamento, cancelarAgendamento, concluirAgendamento } from "../services/agenda-service.js";
import { listarOrcamentos, listarItensOrcamento, aceitarOrcamento, recusarOrcamento, excluirOrcamento, limparOrcamentosRecusadosExpirados } from "../services/orcamentos-service.js";
import { STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../models/esquema-banco.js";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const COLUNAS = [
  { titulo: "Aguardando", status: [STATUS_ORCAMENTO.aguardandoCliente] },
  { titulo: "Para Agendar", status: [STATUS_ORCAMENTO.aceito] },
  { titulo: "Agendado", status: [STATUS_ORCAMENTO.agendado] },
  { titulo: "Concluído", status: [STATUS_ORCAMENTO.concluido, STATUS_ORCAMENTO.estoqueDescontado] },
  { titulo: "Recusados", status: [STATUS_ORCAMENTO.recusado] }
];
let dataAtual = new Date();
let selecionada = chaveData(new Date());
let agendamentos = [];
let orcamentos = [];
let orcamentosPorId = new Map();

montarLayout({ paginaAtual: "agenda", titulo: "Agenda", subtitulo: "Pipeline" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  vincularEventos();
  await carregar();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#mesAnterior")?.addEventListener("click", () => mudarMes(-1));
  document.querySelector("#proximoMes")?.addEventListener("click", () => mudarMes(1));
  document.querySelector("#agendaForm")?.addEventListener("submit", salvarAgendamento);
  document.querySelector("#agendaHoraInicio")?.addEventListener("change", calcularFim);
  document.addEventListener("click", tratarClique);
}

async function carregar() {
  await limparOrcamentosRecusadosExpirados();
  [agendamentos, orcamentos] = await Promise.all([listarAgendamentos(), listarOrcamentos()]);
  orcamentosPorId = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  renderizar();
}

function mudarMes(delta) {
  dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + delta, 1);
  selecionada = chaveData(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1));
  renderizar();
}

function renderizar() {
  document.querySelector("#mesAtual").textContent = capitalizar(mesLongo.format(dataAtual));
  document.querySelector("#semanaCalendario").innerHTML = DIAS.map((dia) => `<span class="calendar-week-label">${dia}</span>`).join("");
  renderizarCalendario();
  renderizarEventosMes();
  renderizarAprovacao();
  renderizarAprovados();
  renderizarBoard();
  atualizarIcones();
}

function renderizarCalendario() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const inicio = new Date(ano, mes, 1 - new Date(ano, mes, 1).getDay());
  const dias = Array.from({ length: 42 }, (_, indice) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice));
  const ativos = agendamentos.filter((evento) => ![STATUS_AGENDAMENTO.cancelado, STATUS_AGENDAMENTO.remarcado].includes(evento.status));
  document.querySelector("#calendario").innerHTML = dias.map((dia) => {
    const data = chaveData(dia);
    const eventos = ativos.filter((evento) => evento.data === data);
    const classes = ["calendar-day-workflow", dia.getMonth() !== mes ? "is-muted" : "", data === chaveData(new Date()) ? "is-today" : "", data === selecionada ? "is-selected" : ""].filter(Boolean).join(" ");
    const pontos = eventos.slice(0, 4).map((evento) => `<i class="event-dot" style="background:${escapar(evento.cor || "#8B5CF6")}"></i>`).join("");
    return `<button class="${classes}" type="button" data-calendar-day="${data}"><span class="day-number">${dia.getDate()}</span>${pontos ? `<span class="event-dots">${pontos}</span>` : ""}</button>`;
  }).join("");
}

function renderizarEventosMes() {
  const mes = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, "0")}`;
  const eventos = agendamentos.filter((evento) => evento.data?.startsWith(mes) && ![STATUS_AGENDAMENTO.cancelado, STATUS_AGENDAMENTO.remarcado].includes(evento.status)).sort(compararEvento).slice(0, 8);
  const alvo = document.querySelector("#eventosMesMini");
  alvo.innerHTML = eventos.length ? eventos.map((evento) => {
    const orcamento = orcamentosPorId.get(evento.orcamentoId);
    return `<button class="mini-event-card" type="button" data-event-day="${evento.data}"><header><strong>${formatarData(evento.data)} · ${escapar(evento.horaInicio || "")}</strong><i class="event-color-chip" style="background:${escapar(evento.cor || "#8B5CF6")}"></i></header><span>${escapar(orcamento?.clienteNomeSnapshot || "Cliente")} · ${escapar(orcamento?.nome || "Orçamento")}</span></button>`;
  }).join("") : "<p class=\"empty-inline\">Nenhuma sessão no mês.</p>";
}

function renderizarAprovacao() {
  const lista = orcamentos.filter((orcamento) => orcamento.status === STATUS_ORCAMENTO.aguardandoCliente).sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  document.querySelector("#listaAprovacao").innerHTML = lista.length ? lista.map(cardOrcamento).join("") : "<p class=\"empty-inline\">Nenhuma proposta aguardando aprovação.</p>";
}

function renderizarAprovados() {
  const lista = orcamentos.filter((orcamento) => orcamento.status === STATUS_ORCAMENTO.aceito).sort((a, b) => String(b.aceitoEm || b.atualizadoEm).localeCompare(String(a.aceitoEm || a.atualizadoEm)));
  document.querySelector("#listaAprovados").innerHTML = lista.length ? lista.map((orcamento) => `<article class="budget-thumb"><header><div><strong>${escapar(orcamento.nome)}</strong><span>${escapar(orcamento.clienteNomeSnapshot || "Cliente não informado")}</span></div><strong>${formatarMoeda(orcamento.valorFinalSnapshot)}</strong></header><div class="action-row"><button class="button button-primary" type="button" data-schedule-budget="${orcamento.id}"><i data-lucide="calendar-plus"></i>Agendar</button><button class="button button-ghost" type="button" data-open-budget="${orcamento.id}">Detalhes</button></div></article>`).join("") : "<p class=\"empty-inline\">Nenhum orçamento aprovado para agendar.</p>";
}

function renderizarBoard() {
  document.querySelector("#boardPipeline").innerHTML = COLUNAS.map((coluna) => {
    const lista = orcamentos.filter((orcamento) => coluna.status.includes(orcamento.status));
    return `<section class="board-column"><header><strong>${coluna.titulo}</strong><span>${lista.length}</span></header><div class="board-column-list">${lista.length ? lista.map((orcamento) => `<button class="board-card" type="button" data-open-budget="${orcamento.id}"><strong>${escapar(orcamento.nome)}</strong><span>${escapar(orcamento.clienteNomeSnapshot || "Cliente")}</span><span>${formatarMoeda(orcamento.valorFinalSnapshot)}</span></button>`).join("") : "<p class=\"empty-inline\">Sem itens.</p>"}</div></section>`;
  }).join("");
}

function cardOrcamento(orcamento) {
  return `<button class="budget-thumb" type="button" data-open-budget="${orcamento.id}"><header><div><strong>${escapar(orcamento.nome)}</strong><span>${escapar(orcamento.clienteNomeSnapshot || "Cliente não informado")}</span></div><strong>${formatarMoeda(orcamento.valorFinalSnapshot)}</strong></header><span>${escapar(orcamento.tamanhoTatuagem || "Tamanho a definir")} cm · ${escapar(orcamento.localCorpo || "Local a definir")}</span></button>`;
}

async function tratarClique(evento) {
  const fechar = evento.target.closest("[data-close-modal]");
  if (fechar) return document.querySelector(`#${fechar.dataset.closeModal}`)?.close();
  const dia = evento.target.closest("[data-calendar-day]");
  if (dia) return abrirDia(dia.dataset.calendarDay);
  const eventoMes = evento.target.closest("[data-event-day]");
  if (eventoMes) return abrirDia(eventoMes.dataset.eventDay);
  const abrir = evento.target.closest("[data-open-budget]");
  if (abrir) return abrirOrcamento(abrir.dataset.openBudget);
  const agendar = evento.target.closest("[data-schedule-budget]");
  if (agendar) return abrirAgendamento({ orcamentoId: agendar.dataset.scheduleBudget });
  const aprovar = evento.target.closest("[data-approve-budget]");
  if (aprovar) { await aceitarOrcamento(aprovar.dataset.approveBudget); fecharModal("orcamentoModal"); return carregar(); }
  const recusar = evento.target.closest("[data-reject-budget]");
  if (recusar) { await recusarOrcamento(recusar.dataset.rejectBudget, "Reprovado na pipeline"); fecharModal("orcamentoModal"); return carregar(); }
  const excluir = evento.target.closest("[data-delete-budget]");
  if (excluir) {
    if (!window.confirm("Excluir este orçamento e qualquer agendamento vinculado?")) return;
    await excluirOrcamento(excluir.dataset.deleteBudget);
    fecharModal("orcamentoModal");
    return carregar();
  }
  const editar = evento.target.closest("[data-edit-budget]");
  if (editar) window.location.href = `orcamentos.html?editar=${encodeURIComponent(editar.dataset.editBudget)}`;
  const acaoEvento = evento.target.closest("[data-event-action]");
  if (acaoEvento) await tratarAcaoEvento(acaoEvento.dataset.eventAction, acaoEvento.dataset.eventId);
}

async function abrirOrcamento(id) {
  const orcamento = orcamentosPorId.get(id);
  if (!orcamento) return;
  const itens = await listarItensOrcamento(id);
  document.querySelector("#orcamentoModalContent").innerHTML = `<header class="modal-header"><div><span>Aguardando aprovação</span><h2>${escapar(orcamento.nome)}</h2></div><button class="icon-button" data-close-modal="orcamentoModal" type="button"><i data-lucide="x"></i></button></header><div class="modal-summary-grid"><article><span>Cliente</span><strong>${escapar(orcamento.clienteNomeSnapshot || "Não informado")}</strong></article><article><span>Valor final</span><strong>${formatarMoeda(orcamento.valorFinalSnapshot)}</strong></article><article><span>Arte</span><strong>${escapar(orcamento.tamanhoTatuagem || "—")} cm · ${escapar(orcamento.localCorpo || "—")}</strong></article><article><span>Complexidade</span><strong>${escapar(orcamento.complexidade || "—")}</strong></article></div><p class="notice-soft">${escapar(orcamento.observacoesCliente || "Sem observações adicionais.")}</p><div class="event-status-list">${itens.length ? itens.map((item) => `<div class="event-status-row"><strong>${escapar(item.nomeItemSnapshot)}</strong><small>${escapar(item.categoriaSnapshot)} · ${item.quantidadeUsada} ${escapar(item.unidadeMedidaSnapshot)}</small></div>`).join("") : "<p class=\"empty-inline\">Sem itens vinculados.</p>"}</div><div class="modal-actions"><button class="button button-danger" type="button" data-delete-budget="${orcamento.id}"><i data-lucide="trash-2"></i>Excluir</button><button class="button button-ghost" type="button" data-edit-budget="${orcamento.id}"><i data-lucide="pencil"></i>Editar</button>${orcamento.status === STATUS_ORCAMENTO.aguardandoCliente ? `<button class="button button-secondary" type="button" data-reject-budget="${orcamento.id}">Reprovado</button><button class="button button-primary" type="button" data-approve-budget="${orcamento.id}">Aprovado</button>` : ""}</div>`;
  document.querySelector("#orcamentoModal")?.showModal();
  atualizarIcones();
}

function abrirDia(data) {
  selecionada = data;
  const lista = agendamentos.filter((evento) => evento.data === data && ![STATUS_AGENDAMENTO.cancelado, STATUS_AGENDAMENTO.remarcado].includes(evento.status)).sort(compararEvento);
  document.querySelector("#eventoDiaContent").innerHTML = `<header class="modal-header"><div><span>Agenda do dia</span><h2>${formatarData(data)}</h2></div><button class="icon-button" data-close-modal="eventoDiaModal" type="button"><i data-lucide="x"></i></button></header><div class="event-status-list">${lista.length ? lista.map((evento) => cardEvento(evento)).join("") : "<p class=\"empty-inline\">Nenhum agendamento neste dia.</p>"}</div>`;
  document.querySelector("#eventoDiaModal")?.showModal();
  renderizarCalendario();
  atualizarIcones();
}

function cardEvento(evento) {
  const orcamento = orcamentosPorId.get(evento.orcamentoId);
  return `<article class="event-status-row"><header><div><strong>${escapar(evento.horaInicio || "Horário")} · ${escapar(orcamento?.clienteNomeSnapshot || "Cliente")}</strong><span>${escapar(orcamento?.nome || "Orçamento")}</span></div><i class="event-color-chip" style="background:${escapar(evento.cor || "#8B5CF6")}"></i></header><small>Status: ${rotuloEvento(evento.status)}</small><div class="action-row"><button class="button button-ghost" type="button" data-event-action="reagendar" data-event-id="${evento.id}">Reagendado</button><button class="button button-secondary" type="button" data-event-action="concluir" data-event-id="${evento.id}">Concluído</button><button class="button button-danger" type="button" data-event-action="cancelar" data-event-id="${evento.id}">Cancelado</button></div></article>`;
}

async function tratarAcaoEvento(acao, id) {
  if (acao === "reagendar") {
    await solicitarReagendamento(id, "Reagendamento solicitado na agenda");
    fecharModal("eventoDiaModal");
    return carregar();
  }
  if (acao === "cancelar") await cancelarAgendamento(id, "Cancelado na agenda");
  if (acao === "concluir") await concluirAgendamento(id);
  fecharModal("eventoDiaModal");
  await carregar();
}

function abrirAgendamento({ orcamentoId = "", agendamentoId = "" }) {
  const evento = agendamentoId ? agendamentos.find((item) => item.id === agendamentoId) : null;
  const id = evento?.orcamentoId || orcamentoId;
  const orcamento = orcamentosPorId.get(id);
  definir("#agendaOrcamentoId", id);
  definir("#agendaId", evento?.id || "");
  definir("#agendaData", evento?.data || selecionada);
  const inicio = evento?.horaInicio || orcamento?.horarioPreferencial || "10:00";
  definir("#agendaHoraInicio", inicio);
  definir("#agendaHoraFim", evento?.horaFim || somarHoras(inicio, orcamento?.duracaoSessao || 1));
  definir("#agendaObservacoes", evento?.observacoes || "");
  document.querySelectorAll("input[name='agendaCor']").forEach((campo) => { campo.checked = campo.value === (evento?.cor || "#8B5CF6"); });
  document.querySelector("#agendaModalLabel").textContent = evento ? "Reagendar sessão" : "Agendar orçamento";
  document.querySelector("#agendaModalTitle").textContent = orcamento ? `${orcamento.clienteNomeSnapshot} · ${orcamento.nome}` : "Sessão";
  document.querySelector("#agendaModal")?.showModal();
  atualizarIcones();
}

function calcularFim() {
  const orcamento = orcamentosPorId.get(valor("#agendaOrcamentoId"));
  definir("#agendaHoraFim", somarHoras(valor("#agendaHoraInicio"), orcamento?.duracaoSessao || 1));
}

async function salvarAgendamento(evento) {
  evento.preventDefault();
  const dados = { data: valor("#agendaData"), horaInicio: valor("#agendaHoraInicio"), horaFim: valor("#agendaHoraFim"), observacoes: valor("#agendaObservacoes"), cor: document.querySelector("input[name='agendaCor']:checked")?.value || "#8B5CF6" };
  const id = valor("#agendaId");
  if (id) await reagendarAgendamento(id, dados);
  else await agendarOrcamento(valor("#agendaOrcamentoId"), dados);
  fecharModal("agendaModal");
  await carregar();
}

function compararEvento(a, b) { return `${a.data || ""} ${a.horaInicio || ""}`.localeCompare(`${b.data || ""} ${b.horaInicio || ""}`); }
function somarHoras(hora, duracao) {
  const [h, m] = String(hora || "10:00").split(":").map(Number);
  const minutos = (Number(h) || 0) * 60 + (Number(m) || 0) + Math.round(Number(duracao || 1) * 60);
  return `${String(Math.floor((minutos % 1440) / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
function rotuloEvento(status) { return ({ agendado: "Agendado", remarcado: "Reagendado", concluido: "Concluído", cancelado: "Cancelado" })[status] || status; }
function fecharModal(id) { document.querySelector(`#${id}`)?.close(); }
function valor(seletor) { return document.querySelector(seletor)?.value || ""; }
function definir(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.value = conteudo; }
