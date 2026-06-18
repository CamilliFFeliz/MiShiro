import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData, chaveData } from "../shared/formatters.js";
import { vazio, escapar, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, listarAlertasEstoqueBaixo } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { listarAgendamentos } from "../services/agenda-service.js";
import { STATUS_AGENDAMENTO } from "../models/esquema-banco.js";

montarLayout({ paginaAtual: "dashboard", titulo: "Início", subtitulo: "Dashboard" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  const [itens, orcamentos, agenda, alertas] = await Promise.all([listarItensEstoque(), listarOrcamentos(), listarAgendamentos(), listarAlertasEstoqueBaixo()]);
  texto("#totalEstoque", itens.length);
  texto("#totalOrcamentos", orcamentos.length);
  texto("#totalAgenda", agenda.length);
  texto("#totalAlertas", alertas.length);
  renderizarAlertaRapido(agenda, alertas, orcamentos);
  renderizarAgenda(agenda, orcamentos);
  renderizarOrcamentos(orcamentos);
  atualizarIcones();
}

function renderizarAlertaRapido(agenda, alertas, orcamentos) {
  const hoje = chaveData(new Date());
  const proximos = agenda.filter((item) => item.status !== STATUS_AGENDAMENTO.cancelado && item.data >= hoje).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`));
  const proximo = proximos[0];
  const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const orcamento = proximo ? mapa.get(proximo.orcamentoId) : null;
  texto("#alertaProximoAgendamento", proximo ? `${formatarData(proximo.data)} às ${proximo.horaInicio || "—"}` : "Sem sessão marcada");
  texto("#alertaProximoDetalhe", proximo ? `${orcamento?.clienteNomeSnapshot || "Cliente"} · ${orcamento?.nome || "Orçamento"}` : "Cadastre ou aprove um orçamento para agendar.");
  texto("#alertaEstoqueBaixo", `${alertas.length} ${alertas.length === 1 ? "item" : "itens"}`);
  texto("#alertaEstoqueDetalhe", alertas.length ? alertas.slice(0, 2).map((item) => item.nome).join(" · ") : "Nenhum alerta no momento.");
}

function renderizarAgenda(agenda, orcamentos) {
  const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const hoje = chaveData(new Date());
  const lista = agenda.filter((item) => item.status !== STATUS_AGENDAMENTO.cancelado && item.data >= hoje).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`)).slice(0, 4);
  document.querySelector("#listaAgenda").innerHTML = lista.length ? lista.map((item) => {
    const orcamento = mapa.get(item.orcamentoId);
    return `<article class="note-card"><strong>${formatarData(item.data)} ${escapar(item.horaInicio || "")}</strong><span>${escapar(orcamento?.clienteNomeSnapshot || "Cliente não informado")} · ${escapar(orcamento?.nome || "Orçamento")}</span></article>`;
  }).join("") : vazio("Nenhum agendamento registrado ainda.");
}

function renderizarOrcamentos(orcamentos) {
  const lista = orcamentos.slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 4);
  document.querySelector("#listaOrcamentos").innerHTML = lista.length ? lista.map((item) => `<article class="note-card"><strong>${escapar(item.nome)}</strong><span>${escapar(rotuloStatus(item.status))} · ${formatarMoeda(item.valorFinalSnapshot)}</span></article>`).join("") : vazio("Nenhum orçamento salvo ainda.");
}

function rotuloStatus(status) { return ({ aguardando_cliente: "Aguardando aprovação", aceito: "Para agendar", agendado: "Agendado", concluido: "Concluído", recusado: "Recusado" })[status] || status; }
function texto(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.textContent = conteudo; }
