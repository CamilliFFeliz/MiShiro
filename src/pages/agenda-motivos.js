import { cancelarAgendamento } from "../services/agenda-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";

const ACOES_INTERCEPTADAS = new Set(["cancelar"]);
let resumoAgendado = false;

document.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-event-action]");
  if (!botao || !ACOES_INTERCEPTADAS.has(botao.dataset.eventAction)) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();

  const motivo = window.prompt("Informe o motivo do cancelamento:", "");
  if (motivo === null) return;
  if (!motivo.trim()) {
    window.alert("Informe um motivo para manter o histórico do orçamento completo.");
    return;
  }

  try {
    await cancelarAgendamento(botao.dataset.eventId, motivo.trim());
    document.querySelector("#eventoDiaModal")?.close();
    window.location.reload();
  } catch (erro) {
    window.alert(erro.message || "Não foi possível cancelar o agendamento.");
  }
}, true);

const observador = new MutationObserver(agendarResumo);
observador.observe(document.body, { childList: true, subtree: true });
agendarResumo();

function agendarResumo() {
  if (resumoAgendado) return;
  resumoAgendado = true;
  window.requestAnimationFrame(async () => {
    resumoAgendado = false;
    const orcamentos = await listarOrcamentos();
    const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
    complementarLista("#listaAprovacao", mapa, "Aguardando aprovação");
    complementarLista("#listaAprovados", mapa, "Para agendar");
  });
}

function complementarLista(seletor, mapa, status) {
  document.querySelectorAll(`${seletor} [data-open-budget]`).forEach((cartao) => {
    if (cartao.querySelector("[data-budget-card-meta]")) return;
    const orcamento = mapa.get(cartao.dataset.openBudget);
    if (!orcamento) return;
    const meta = document.createElement("span");
    meta.dataset.budgetCardMeta = "true";
    meta.textContent = `${formatarData(orcamento.criadoEm || orcamento.atualizadoEm)} · ${status}`;
    cartao.append(meta);
  });
}

function formatarData(data) {
  const instante = new Date(data || "");
  return Number.isNaN(instante.getTime()) ? "Data não informada" : instante.toLocaleDateString("pt-BR");
}
