import { cancelarAgendamento } from "../services/agenda-service.js";

const ACOES_INTERCEPTADAS = new Set(["cancelar"]);

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
