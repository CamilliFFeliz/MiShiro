import { montarLayout } from "../shared/layout.js";
import { chaveData, capitalizar, mesLongo, formatarData } from "../shared/formatters.js";
import { vazio, escapar, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarAgendamentos } from "../services/agenda-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";

let dataAtual = new Date();
let selecionada = chaveData(new Date());
let agendamentos = [];
let orcamentos = new Map();
montarLayout({ paginaAtual: "agenda", titulo: "Agenda", subtitulo: "Calendário" });
iniciar();

async function iniciar() { await iniciarBancoLocal(); document.querySelector("#mesAnterior").addEventListener("click", () => mudarMes(-1)); document.querySelector("#proximoMes").addEventListener("click", () => mudarMes(1)); await carregar(); atualizarIcones(); }
async function carregar() { const [listaAgenda, listaOrcamentos] = await Promise.all([listarAgendamentos(), listarOrcamentos()]); agendamentos = listaAgenda; orcamentos = new Map(listaOrcamentos.map((o) => [o.id, o])); render(); }
function mudarMes(delta) { dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + delta, 1); selecionada = chaveData(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1)); render(); }
function render() { const ano = dataAtual.getFullYear(); const mes = dataAtual.getMonth(); const primeiro = new Date(ano, mes, 1); const inicio = new Date(ano, mes, 1 - primeiro.getDay()); const dias = Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)); const mesEventos = agendamentos.filter((a) => a.data?.startsWith(`${ano}-${String(mes + 1).padStart(2, "0")}`)); const diaEventos = agendamentos.filter((a) => a.data === selecionada); document.querySelector("#mesAtual").textContent = capitalizar(mesLongo.format(dataAtual)); document.querySelector("#totalMes").textContent = mesEventos.length; document.querySelector("#totalDia").textContent = diaEventos.length; document.querySelector("#calendario").innerHTML = dias.map((dia) => diaHtml(dia, mes)).join(""); document.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => { selecionada = b.dataset.dia; render(); })); renderEventos(diaEventos.length ? diaEventos : mesEventos, diaEventos.length > 0); }
function diaHtml(dia, mes) { const chave = chaveData(dia); const eventos = agendamentos.filter((a) => a.data === chave); return `<button class="calendar-day ${dia.getMonth() !== mes ? "is-muted" : ""} ${chave === selecionada ? "is-active" : ""} ${chave === chaveData(new Date()) ? "is-today" : ""}" type="button" data-dia="${chave}"><strong>${dia.getDate()}</strong>${eventos.length ? `<span class="day-count">${eventos.length}</span>` : ""}</button>`; }
function renderEventos(lista, filtradoPorDia) { document.querySelector("#tituloEventos").textContent = filtradoPorDia ? `Eventos de ${formatarData(selecionada)}` : "Eventos do mês"; document.querySelector("#listaEventos").innerHTML = lista.length ? lista.map((a) => { const o = orcamentos.get(a.orcamentoId); return `<article class="note-card"><strong>${formatarData(a.data)} ${escapar(a.horaInicio || "")}</strong><span>${escapar(o?.clienteNomeSnapshot || "Cliente")} · ${escapar(o?.nome || "Orçamento")}</span></article>`; }).join("") : vazio("Nenhum agendamento encontrado."); }
