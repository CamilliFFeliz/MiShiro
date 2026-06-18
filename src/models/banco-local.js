import { DEFINICAO_LOJAS, LOJAS, NOME_BANCO_MISHIRO, VERSAO_BANCO_MISHIRO } from "./esquema-banco.js";

let promessaBanco = null;

export async function iniciarBancoLocal() {
  return abrirBancoLocal();
}

export async function migrarBancoLocal() {
  return abrirBancoLocal();
}

export async function obterTodos(nomeLoja) {
  const banco = await abrirBancoLocal();
  return converterRequisicao(banco.transaction(nomeLoja, "readonly").objectStore(nomeLoja).getAll());
}

export async function obterPorId(nomeLoja, id) {
  if (!id) {
    return null;
  }

  const banco = await abrirBancoLocal();
  return converterRequisicao(banco.transaction(nomeLoja, "readonly").objectStore(nomeLoja).get(id));
}

export async function salvarRegistro(nomeLoja, registro) {
  await executarTransacao([nomeLoja], "readwrite", ({ lojas }) => converterRequisicao(lojas[nomeLoja].put(registro)));
  return registro;
}

export async function removerRegistro(nomeLoja, id) {
  await executarTransacao([nomeLoja], "readwrite", ({ lojas }) => converterRequisicao(lojas[nomeLoja].delete(id)));
  return true;
}

export async function obterPorIndice(nomeLoja, nomeIndice, valor) {
  const banco = await abrirBancoLocal();
  const loja = banco.transaction(nomeLoja, "readonly").objectStore(nomeLoja);
  return converterRequisicao(loja.index(nomeIndice).getAll(valor));
}

export async function limparLoja(nomeLoja) {
  await executarTransacao([nomeLoja], "readwrite", ({ lojas }) => converterRequisicao(lojas[nomeLoja].clear()));
  return true;
}

export async function salvarVarios(nomeLoja, registros) {
  const lista = Array.isArray(registros) ? registros : [];

  await executarTransacao([nomeLoja], "readwrite", async ({ lojas }) => {
    for (const registro of lista) {
      await converterRequisicao(lojas[nomeLoja].put(registro));
    }
  });

  return lista.length;
}

export async function executarTransacao(nomesLojas, modo, executor) {
  const banco = await abrirBancoLocal();
  const transacao = banco.transaction(nomesLojas, modo);
  const lojas = Object.fromEntries(nomesLojas.map((nome) => [nome, transacao.objectStore(nome)]));
  const conclusao = aguardarConclusaoTransacao(transacao);
  const resultado = await executor({ lojas, transacao, LOJAS });
  await conclusao;
  return resultado;
}

export async function exportarTodasAsLojas() {
  const dados = {};

  for (const nomeLoja of Object.values(LOJAS)) {
    dados[nomeLoja] = await obterTodos(nomeLoja);
  }

  return dados;
}

export async function substituirTodasAsLojas(dadosPorLoja) {
  const nomesLojas = Object.values(LOJAS);

  await executarTransacao(nomesLojas, "readwrite", async ({ lojas }) => {
    for (const nomeLoja of nomesLojas) {
      await converterRequisicao(lojas[nomeLoja].clear());
    }

    for (const nomeLoja of nomesLojas) {
      const registros = Array.isArray(dadosPorLoja?.[nomeLoja]) ? dadosPorLoja[nomeLoja] : [];

      for (const registro of registros) {
        await converterRequisicao(lojas[nomeLoja].put(registro));
      }
    }
  });

  return true;
}

function abrirBancoLocal() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB não está disponível neste navegador."));
  }

  if (!promessaBanco) {
    promessaBanco = new Promise((resolver, rejeitar) => {
      const requisicao = indexedDB.open(NOME_BANCO_MISHIRO, VERSAO_BANCO_MISHIRO);

      requisicao.addEventListener("upgradeneeded", () => configurarBanco(requisicao.result));
      requisicao.addEventListener("success", () => resolver(requisicao.result));
      requisicao.addEventListener("error", () => rejeitar(requisicao.error));
      requisicao.addEventListener("blocked", () => rejeitar(requisicao.error || new Error("A abertura do banco foi bloqueada.")));
    });
  }

  return promessaBanco;
}

function configurarBanco(banco) {
  DEFINICAO_LOJAS.forEach((definicao) => {
    const loja = banco.objectStoreNames.contains(definicao.nome)
      ? requisitarLojaExistente(banco, definicao.nome)
      : banco.createObjectStore(definicao.nome, definicao.opcoes);

    definicao.indices.forEach(([nomeIndice, caminho, opcoes]) => {
      if (!loja.indexNames.contains(nomeIndice)) {
        loja.createIndex(nomeIndice, caminho, opcoes);
      }
    });
  });
}

function requisitarLojaExistente(banco, nomeLoja) {
  return banco.transaction.objectStore(nomeLoja);
}

export function converterRequisicao(requisicao) {
  return new Promise((resolver, rejeitar) => {
    requisicao.addEventListener("success", () => resolver(requisicao.result));
    requisicao.addEventListener("error", () => rejeitar(requisicao.error));
  });
}

function aguardarConclusaoTransacao(transacao) {
  return new Promise((resolver, rejeitar) => {
    transacao.addEventListener("complete", () => resolver(true));
    transacao.addEventListener("error", () => rejeitar(transacao.error));
    transacao.addEventListener("abort", () => rejeitar(transacao.error));
  });
}
