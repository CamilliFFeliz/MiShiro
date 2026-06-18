import { cancelarAgendamento } from "../services/agenda-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { escapar, atualizarIcones } from "../shared/ui.js";
import { formatarMoeda } from "../shared/formatters.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";

document.addEventListener("click", async (evento) => {
  const botao = evento.target.closest('[data-event-action="cancelar"]');
  if (!botao) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();
  const motivo = window.prompt("Motivo do cancelamento (opcional):", "");
  if (motivo === null || !window.confirm("Confirmar o cancelamento desta sessão?")) return;
  try {
    await cancelarAgendamento(botao.dataset.eventId, motivo);
    document.querySelector("#eventoDiaModal")?.close();
    window.location.reload();
  } catch (erro) {
    window.alert(erro.message || "Não foi possível cancelar o agendamento.");
  }
}, true);

const observador = new MutationObserver(atualizarColunaCancelados);
observador.observe(document.body, { childList: true, subtree: true });
atualizarColunaCancelados();

async function atualizarColunaCancelados() {
  const alvo = document.querySelector("#boardPipeline");
  if (!alvo || alvo.querySelector("[data-cancelados-column]")) return;
  const cancelados = (await listarOrcamentos()).filter((orcamento) => orcamento.status === STATUS_ORCAMENTO.cancelado);
  alvo.insertAdjacentHTML("beforeend", `<section class="board-column" data-cancelados-column><header><strong>Cancelados</strong><span>${cancelados.length}</span></header><div class="board-column-list">${cancelados.length ? cancelados.map((orcamento) => `<button class="board-card" type="button" data-open-budget="${orcamento.id}"><strong>${escapar(orcamento.nome)}</strong><span>${escapar(orcamento.clienteNomeSnapshot || "Cliente")}</span><span>${formatarMoeda(orcamento.valorFinalSnapshot)}</span></button>`).join("") : '<p class="empty-inline">Sem cancelamentos.</p>'}</div></section>`);
  atualizarIcones();
}
