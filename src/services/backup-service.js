import { exportarTodasAsLojas, substituirTodasAsLojas } from "../models/banco-local.js";
import { LOJAS, obterDataIso, VERSAO_ESQUEMA_MISHIRO } from "../models/esquema-banco.js";

export async function exportarBackupCompleto() {
  const backup = { aplicativo: "MiShiro Orçamentos", tipo: "backup-mishiro", versaoEsquema: VERSAO_ESQUEMA_MISHIRO, exportadoEm: obterDataIso(), dados: await exportarTodasAsLojas() };
  baixarArquivoJson(backup, criarNomeArquivoBackup());
  return backup;
}

export async function importarBackupCompleto(arquivo) {
  const backup = JSON.parse(await arquivo.text());
  if (!backup || backup.tipo !== "backup-mishiro" || !backup.dados) throw new Error("Arquivo de backup inválido.");
  if (backup.versaoEsquema > VERSAO_ESQUEMA_MISHIRO) throw new Error("Este backup pertence a uma versão mais nova do MiShiro.");
  await substituirTodasAsLojas(backup.dados);
  return resumirBackup(backup);
}

export function resumirBackup(backup) {
  const dados = backup?.dados || {};
  return Object.fromEntries(Object.values(LOJAS).map((nome) => [nome, dados[nome]?.length || 0]));
}

export async function solicitarPersistenciaLocal() {
  return navigator.storage?.persist ? navigator.storage.persist() : false;
}

function baixarArquivoJson(dados, nomeArquivo) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = nomeArquivo; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function criarNomeArquivoBackup() {
  const data = new Date();
  const partes = [data.getFullYear(), data.getMonth() + 1, data.getDate(), data.getHours(), data.getMinutes()].map((parte) => String(parte).padStart(2, "0"));
  return `mishiro-backup-${partes.join("-")}.json`;
}
