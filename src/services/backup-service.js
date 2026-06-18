import { exportarTodasAsLojas, substituirTodasAsLojas } from "../models/banco-local.js";
import { LOJAS, obterDataIso, VERSAO_ESQUEMA_MISHIRO } from "../models/esquema-banco.js";

export async function exportarBackupCompleto() {
  const dados = await exportarTodasAsLojas();
  const backup = {
    aplicativo: "MiShiro Orçamentos",
    tipo: "backup-mishiro",
    versaoEsquema: VERSAO_ESQUEMA_MISHIRO,
    exportadoEm: obterDataIso(),
    dados
  };
  baixarArquivoJson(backup, criarNomeArquivoBackup());
  return backup;
}

export async function importarBackupCompleto(arquivo, modo = "substituir") {
  const conteudo = await lerArquivoTexto(arquivo);
  const backup = JSON.parse(conteudo);
  validarBackup(backup);

  if (modo !== "substituir") {
    throw new Error("O modo mesclar ainda não foi ativado. Use substituir após confirmar o backup.");
  }

  await substituirTodasAsLojas(backup.dados);
  return resumirBackup(backup);
}

export function resumirBackup(backup) {
  const dados = backup?.dados || {};
  return {
    itensEstoque: dados[LOJAS.itensEstoque]?.length || 0,
    clientes: dados[LOJAS.clientes]?.length || 0,
    orcamentos: dados[LOJAS.orcamentos]?.length || 0,
    itensOrcamento: dados[LOJAS.itensOrcamento]?.length || 0,
    agendamentos: dados[LOJAS.agendamentos]?.length || 0,
    movimentosEstoque: dados[LOJAS.movimentosEstoque]?.length || 0
  };
}

export async function solicitarPersistenciaLocal() {
  if (!navigator.storage?.persist) {
    return false;
  }

  return navigator.storage.persist();
}

function validarBackup(backup) {
  if (!backup || backup.tipo !== "backup-mishiro" || !backup.dados) {
    throw new Error("Arquivo de backup inválido.");
  }

  if (backup.versaoEsquema > VERSAO_ESQUEMA_MISHIRO) {
    throw new Error("Este backup pertence a uma versão mais nova do MiShiro.");
  }
}

function lerArquivoTexto(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result || ""));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsText(arquivo);
  });
}

function baixarArquivoJson(dados, nomeArquivo) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function criarNomeArquivoBackup() {
  const data = new Date();
  const partes = [data.getFullYear(), data.getMonth() + 1, data.getDate(), data.getHours(), data.getMinutes()]
    .map((parte) => String(parte).padStart(2, "0"));
  return `mishiro-backup-${partes[0]}-${partes[1]}-${partes[2]}-${partes[3]}-${partes[4]}.json`;
}

export { exportarTodasAsLojas, substituirTodasAsLojas } from "../models/banco-local.js";
