import { montarLayout } from "../shared/layout.js";
import { mostrarStatus } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { exportarBackupCompleto, importarBackupCompleto, solicitarPersistenciaLocal } from "../services/backup-service.js";

montarLayout({ paginaAtual: "backup", titulo: "Backup", subtitulo: "Segurança" });
iniciar();
async function iniciar() {
  await iniciarBancoLocal();
  document.querySelector("#exportarJson")?.addEventListener("click", async () => { await exportarBackupCompleto(); status("Backup JSON exportado."); });
  document.querySelector("#importarJson")?.addEventListener("click", () => document.querySelector("#arquivoJson")?.click());
  document.querySelector("#arquivoJson")?.addEventListener("change", importar);
  document.querySelector("#persistenciaLocal")?.addEventListener("click", async () => status(await solicitarPersistenciaLocal() ? "Persistência local confirmada." : "O navegador não confirmou persistência. Continue usando backups JSON."));
}
async function importar(evento) {
  const arquivo = evento.target.files?.[0];
  if (!arquivo) return;
  if (!confirm("Importar este backup substituindo os dados locais atuais?")) return;
  try { await importarBackupCompleto(arquivo); status("Backup importado com sucesso."); }
  catch (erro) { status(erro.message || "Não foi possível importar o backup."); }
  finally { evento.target.value = ""; }
}
function status(mensagem) { mostrarStatus(document.querySelector("#statusBackup"), mensagem); }
