import { concluirAgendamento } from "../services/agenda-service.js";

document.addEventListener("click", async (evento) => {
  const botao = evento.target.closest('[data-event-action="concluir"]');
  if (!botao) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();
  if (!window.confirm("Marcar esta sessão como concluída?")) return;
  try {
    await concluirAgendamento(botao.dataset.eventId);
    document.querySelector("#eventoDiaModal")?.close();
    window.location.reload();
  } catch (erro) {
    window.alert(erro.message || "Não foi possível concluir o agendamento.");
  }
}, true);
