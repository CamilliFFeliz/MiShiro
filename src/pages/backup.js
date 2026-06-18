import { montarLayout } from "../shared/layout.js";
import { mostrarStatus } from "../shared/ui.js";
import { iniciarBancoLocal, exportarTodasAsLojas, substituirTodasAsLojas } from "../models/banco-local.js";

montarLayout({ paginaAtual: "backup", titulo: "Backup", subtitulo: "Segurança" });
iniciar();
async function iniciar(){ await iniciarBancoLocal(); document.querySelector("#exportarJson")?.addEventListener("click", exportarJson); document.querySelector("#importarJson")?.addEventListener("click", () => document.querySelector("#arquivoJson")?.click()); document.querySelector("#arquivoJson")?.addEventListener("change", importarJson); document.querySelector("#persistenciaLocal")?.addEventListener("click", persistir); }
async function exportarJson(){ const dados = await exportarTodasAsLojas(); const pacote = { app:"MiShiro Tattoo", versao:1, exportadoEm:new Date().toISOString(), dados }; const blob = new Blob([JSON.stringify(pacote,null,2)], { type:"application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `mishiro-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); status("Backup JSON exportado."); }
async function importarJson(evento){ const arquivo = evento.target.files?.[0]; if(!arquivo) return; if(!confirm("Importar este backup substituindo os dados locais atuais?")) return; const texto = await arquivo.text(); const pacote = JSON.parse(texto); await substituirTodasAsLojas(pacote.dados || pacote); status("Backup importado com sucesso."); }
async function persistir(){ if(!navigator.storage?.persist) return status("Persistência não disponível neste navegador."); const ok = await navigator.storage.persist(); status(ok ? "Persistência local confirmada." : "O navegador não confirmou persistência. Continue usando backups JSON."); }
function status(msg){ mostrarStatus(document.querySelector("#statusBackup"), msg); }
