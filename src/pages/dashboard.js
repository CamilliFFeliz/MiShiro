import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData } from "../shared/formatters.js";
import { vazio, escapar, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, listarAlertasEstoqueBaixo, calcularCustoUnitario } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { listarAgendamentos } from "../services/agenda-service.js";

montarLayout({ paginaAtual: "dashboard", titulo: "Início", subtitulo: "Dashboard" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  const [itens, orcamentos, agenda, alertas] = await Promise.all([listarItensEstoque(), listarOrcamentos(), listarAgendamentos(), listarAlertasEstoqueBaixo()]);
  document.querySelector("#totalEstoque").textContent = itens.length;
  document.querySelector("#totalOrcamentos").textContent = orcamentos.length;
  document.querySelector("#totalAgenda").textContent = agenda.length;
  document.querySelector("#totalAlertas").textContent = alertas.length;
  renderAgenda(agenda, orcamentos);
  renderOrcamentos(orcamentos);
  atualizarIcones();
}

function renderAgenda(agenda, orcamentos) {
  const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const lista = agenda.slice().sort((a,b) => String(a.data).localeCompare(String(b.data))).slice(0, 4);
  document.querySelector("#listaAgenda").innerHTML = lista.length ? lista.map((item) => {
    const orcamento = mapa.get(item.orcamentoId);
    return `<article class="note-card"><strong>${formatarData(item.data)} ${escapar(item.horaInicio || "")}</strong><span>${escapar(orcamento?.clienteNomeSnapshot || "Cliente não informado")} · ${escapar(orcamento?.nome || "Orçamento")}</span></article>`;
  }).join("") : vazio("Nenhum agendamento registrado ainda.");
}

function renderOrcamentos(orcamentos) {
  const lista = orcamentos.slice().sort((a,b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 4);
  document.querySelector("#listaOrcamentos").innerHTML = lista.length ? lista.map((item) => `<article class="note-card"><strong>${escapar(item.nome)}</strong><span>${escapar(item.status)} · ${formatarMoeda(item.valorFinalSnapshot)}</span></article>`).join("") : vazio("Nenhum orçamento salvo ainda.");
}
