import { cancelarAgendamento } from "../services/agenda-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { escapar, atualizarIcones } from "../shared/ui.js";
import { formatarMoeda } from "../shared/formatters.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";

const estilo = document.createElement("style");
estilo.textContent = `body[data-page="agenda"]{overflow-x:clip}body[data-page="agenda"] .workflow-page{gap:18px}body[data-page="agenda"] .agenda-workflow-grid{grid-template-columns:minmax(0,1fr) minmax(290px,.72fr);align-items:start}body[data-page="agenda"] .pipeline-layout{grid-template-columns:repeat(2,minmax(0,1fr);align-items:start}body[data-page="agenda"] .board-workflow{grid-template-columns:repeat(6,minmax(210px,1fr);min-width:1260px;overflow:visible}body[data-page="agenda"] #boardPipeline{overflow-x:auto;overflow-y:visible;padding-bottom:8px}dialog.workflow-modal:not([open]){display:none}.schedule-colors label{position:relative;pointer-events:auto}.schedule-colors label input{pointer-events:none}.schedule-colors label:has(input:checked){border:3px solid var(--text);box-shadow:0 0 0 3px rgba(139,92,246,.3)}@media(max-width:900px){body[data-page="agenda"] .agenda-workflow-grid,body[data-page="agenda"] .pipeline-layout{grid-template-columns:1fr}}`;
document.head.append(estilo);

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
