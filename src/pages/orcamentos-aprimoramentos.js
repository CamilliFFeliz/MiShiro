import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, mostrarStatus, atualizarIcones } from "../shared/ui.js";
import { obterOrcamento, atualizarOrcamento, listarItensOrcamento, listarOrcamentos } from "../services/orcamentos-service.js";
import { exportarPdfCliente, exportarPdfEstudio } from "./orcamentos-export.js";

const LIMITE_REFERENCIAS = 6;
const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;
let referencias = [];

iniciarAprimoramentos();

async function iniciarAprimoramentos() {
  prepararAreaDeReferencias();
  vincularAprimoramentos();
  await carregarReferenciasDaEdicao();
  renderizarReferencias();
  recalcularResumo();
}

function prepararAreaDeReferencias() {
  const campo = document.querySelector("#imagemReferencia");
  if (campo) campo.multiple = true;

  const zona = document.querySelector(".image-art-zone");
  if (zona && !document.querySelector("#listaReferenciasArte")) {
    const lista = document.createElement("section");
    lista.id = "listaReferenciasArte";
    lista.className = "art-references-list";
    lista.setAttribute("aria-live", "polite");
    lista.setAttribute("aria-label", "Referências anexadas à arte");
    zona.insertAdjacentElement("afterend", lista);
  }

  if (!document.querySelector("#referenciaModal")) {
    const modal = document.createElement("dialog");
    modal.id = "referenciaModal";
    modal.className = "modal-card workflow-modal";
    modal.innerHTML = '<div id="referenciaModalContent" class="workflow-modal-content"></div>';
    document.body.append(modal);
  }
}

function vincularAprimoramentos() {
  const formulario = document.querySelector("#formOrcamento");
  formulario?.addEventListener("input", recalcularResumo);
  formulario?.addEventListener("submit", sincronizarOrcamentoAposSalvar);
  document.querySelector("#imagemReferencia")?.addEventListener("change", adicionarReferencias);
  document.querySelector("#listaReferenciasArte")?.addEventListener("click", tratarCliqueReferencia);
  document.querySelector("#limparOrcamento")?.addEventListener("click", () => {
    referencias = [];
    window.setTimeout(renderizarReferencias, 0);
  });
  document.querySelector("#gerarPdfCliente")?.addEventListener("click", gerarPdfClienteCorrigido, true);
  document.querySelector("#gerarPdfEstudio")?.addEventListener("click", gerarPdfEstudioCorrigido, true);
  document.addEventListener("click", (evento) => {
    if (evento.target.closest("[data-close-reference-modal]")) document.querySelector("#referenciaModal")?.close();
  });
}

async function carregarReferenciasDaEdicao() {
  const id = new URLSearchParams(window.location.search).get("editar");
  if (!id) return;
  const orcamento = await obterOrcamento(id);
  referencias = normalizarReferencias(orcamento || {});
}

async function adicionarReferencias(evento) {
  const arquivos = Array.from(evento.target.files || []);
  const vagas = LIMITE_REFERENCIAS - referencias.length;
  const selecionados = arquivos.slice(0, Math.max(vagas, 0));
  const validos = selecionados.filter((arquivo) => arquivo.type.startsWith("image/") && arquivo.size <= LIMITE_IMAGEM_BYTES);
  if (!validos.length) {
    evento.target.value = "";
    return mostrarMensagem("Escolha imagens JPG, PNG ou WEBP de até 2 MB.");
  }

  const novas = await Promise.all(validos.map(async (arquivo, indice) => ({
    id: `referencia-${Date.now()}-${indice}-${arquivo.name}`,
    nome: arquivo.name || `Referência ${referencias.length + indice + 1}`,
    tipo: arquivo.type,
    dataUrl: await paraDataUrl(arquivo)
  })));
  referencias = [...referencias, ...novas].slice(0, LIMITE_REFERENCIAS);
  evento.target.value = "";
  renderizarReferencias();
  mostrarMensagem(`${novas.length} referência(s) adicionada(s).`);
}

function normalizarReferencias(orcamento) {
  if (Array.isArray(orcamento.imagensReferencia) && orcamento.imagensReferencia.length) {
    return orcamento.imagensReferencia.filter((referencia) => referencia?.dataUrl).map((referencia, indice) => ({
      id: referencia.id || `referencia-salva-${indice}`,
      nome: referencia.nome || `Referência ${indice + 1}`,
      tipo: referencia.tipo || "image/jpeg",
      dataUrl: referencia.dataUrl
    }));
  }
  return orcamento.imagemReferencia ? [{ id: "referencia-principal", nome: "Referência principal", tipo: "image/jpeg", dataUrl: orcamento.imagemReferencia }] : [];
}

function renderizarReferencias() {
  const preview = document.querySelector("#previewImagem");
  const alvo = document.querySelector("#listaReferenciasArte");
  if (!preview || !alvo) return;
  if (!referencias.length) {
    preview.className = "reference-art-card is-empty";
    preview.innerHTML = "<span>Adicione referências visuais da arte</span>";
    alvo.innerHTML = "";
    return;
  }

  preview.className = "reference-art-card";
  preview.innerHTML = `<span>${referencias.length} referência(s) anexada(s).</span>`;
  alvo.innerHTML = referencias.map((referencia, indice) => `<article class="art-reference-card"><img class="art-reference-card__preview" src="${escapar(referencia.dataUrl)}" alt="Prévia de ${escapar(referencia.nome)}" /><div class="art-reference-card__body"><strong class="art-reference-card__name">${escapar(referencia.nome)}</strong><div class="art-reference-card__actions"><button class="button button-ghost" type="button" data-view-reference="${indice}"><i data-lucide="maximize-2"></i>Visualizar</button><button class="icon-button" type="button" data-remove-reference="${indice}" aria-label="Remover ${escapar(referencia.nome)}"><i data-lucide="trash-2"></i></button></div></div></article>`).join("");
  atualizarIcones();
}

function tratarCliqueReferencia(evento) {
  const visualizar = evento.target.closest("[data-view-reference]");
  if (visualizar) return abrirReferencia(Number(visualizar.dataset.viewReference));
  const remover = evento.target.closest("[data-remove-reference]");
  if (!remover) return;
  const indice = Number(remover.dataset.removeReference);
  if (!Number.isInteger(indice)) return;
  referencias.splice(indice, 1);
  renderizarReferencias();
  mostrarMensagem("Referência removida.");
}

function abrirReferencia(indice) {
  const referencia = referencias[indice];
  const conteudo = document.querySelector("#referenciaModalContent");
  if (!referencia || !conteudo) return;
  conteudo.innerHTML = `<header class="modal-header"><div><span>Referência da arte</span><h2>${escapar(referencia.nome)}</h2></div><button class="icon-button" type="button" data-close-reference-modal aria-label="Fechar"><i data-lucide="x"></i></button></header><img class="reference-viewer-image" src="${escapar(referencia.dataUrl)}" alt="${escapar(referencia.nome)}" />`;
  document.querySelector("#referenciaModal")?.showModal();
  atualizarIcones();
}

function recalcularResumo() {
  const total = obterTotais();
  escrever("#totalMateriais", formatarMoeda(total.materiais));
  escrever("#totalMaoObra", formatarMoeda(total.maoObra));
  escrever("#subtotalOrcamento", formatarMoeda(total.subtotal));
  escrever("#valorDesconto", formatarMoeda(total.descontoValor));
  escrever("#valorFinal", formatarMoeda(total.final));
}

function obterTotais() {
  const materiais = moedaDoTexto(document.querySelector("#totalMateriais")?.textContent);
  const valorHora = numero("#valorHora");
  const duracao = numero("#duracaoSessao");
  const margem = numero("#margem");
  const desconto = numero("#desconto");
  const maoObra = valorHora * duracao;
  const subtotal = materiais + maoObra;
  const descontoValor = subtotal * desconto / 100;
  return { materiais, valorHora, duracao, margem, desconto, maoObra, subtotal, descontoValor, lucro: subtotal * margem / 100, final: Math.max(subtotal - descontoValor, 0) };
}

async function sincronizarOrcamentoAposSalvar() {
  const inicio = Date.now();
  const dados = obterDadosDaTela();
  window.setTimeout(() => persistirAprimoramentos(dados, inicio), 120);
}

async function persistirAprimoramentos(dados, inicio, tentativa = 0) {
  const orcamento = await localizarOrcamento(dados, inicio);
  if (!orcamento) {
    if (tentativa < 8) window.setTimeout(() => persistirAprimoramentos(dados, inicio, tentativa + 1), 180);
    return;
  }
  const itens = await listarItensOrcamento(orcamento.id);
  const totais = dados.totais;
  await atualizarOrcamento(orcamento.id, {
    ...orcamento,
    imagensReferencia: referencias,
    imagemReferencia: referencias[0]?.dataUrl || orcamento.imagemReferencia || "",
    percentualMargemLucro: totais.margem,
    percentualDesconto: totais.desconto,
    custoMaterialSnapshot: totais.materiais,
    custoMaoObraSnapshot: totais.maoObra,
    subtotalSnapshot: totais.subtotal,
    descontoValorSnapshot: totais.descontoValor,
    lucroValorSnapshot: totais.lucro,
    valorFinalSnapshot: totais.final
  }, itens);
}

async function localizarOrcamento(dados, inicio) {
  const id = new URLSearchParams(window.location.search).get("editar");
  if (id) return obterOrcamento(id);
  const lista = await listarOrcamentos();
  return lista
    .filter((item) => item.nome === dados.nome && item.clienteNomeSnapshot === dados.clienteNome)
    .filter((item) => new Date(item.atualizadoEm || item.criadoEm || 0).getTime() >= inicio - 1500)
    .sort((a, b) => String(b.atualizadoEm || b.criadoEm).localeCompare(String(a.atualizadoEm || a.criadoEm)))[0] || null;
}

async function gerarPdfClienteCorrigido(evento) {
  evento.preventDefault();
  evento.stopImmediatePropagation();
  try {
    await exportarPdfCliente(montarDadosPdf());
  } catch (erro) {
    mostrarMensagem(erro.message || "Não foi possível gerar o PDF do cliente.");
  }
}

async function gerarPdfEstudioCorrigido(evento) {
  evento.preventDefault();
  evento.stopImmediatePropagation();
  try {
    await exportarPdfEstudio(montarDadosPdf());
  } catch (erro) {
    mostrarMensagem(erro.message || "Não foi possível gerar o PDF do estúdio.");
  }
}

function montarDadosPdf() {
  const totais = obterTotais();
  const materiais = Array.from(document.querySelectorAll("#listaMateriais .budget-material-row")).map((linha) => {
    const nome = linha.querySelector("strong")?.textContent?.trim() || "Item";
    const detalhe = linha.querySelector("small")?.textContent || "";
    const categoria = detalhe.split("·")[0].trim() || "Material";
    const quantidade = normalizarNumero(linha.querySelector("[data-cart-quantity]")?.value);
    const valor = moedaDoTexto(linha.querySelector(".budget-material-row__meta span")?.textContent);
    return { item: { nome, categoria, unidadeMedida: "un" }, quantidade, valor };
  });
  return {
    dados: {
      nome: valor("#nomeOrcamento"),
      clienteNome: valor("#clienteNome"),
      idade: valor("#clienteIdade"),
      telefone: valor("#clienteTelefone"),
      email: valor("#clienteEmail"),
      alergias: valor("#clienteAlergias"),
      tamanho: valor("#tamanhoTatuagem"),
      local: valor("#localCorpo"),
      complexidade: valor("#complexidade"),
      observacoesArte: valor("#observacoesCliente"),
      observacoesCliente: valor("#clienteObservacoes")
    },
    totais: {
      materiaisTotal: totais.materiais,
      maoObra: totais.maoObra,
      margem: totais.margem,
      lucro: totais.lucro,
      subtotal: totais.subtotal,
      desconto: totais.desconto,
      descontoValor: totais.descontoValor,
      final: totais.final,
      duracao: totais.duracao
    },
    materiais,
    imagemReferencia: referencias[0]?.dataUrl || ""
  };
}

function obterDadosDaTela() {
  return { nome: valor("#nomeOrcamento"), clienteNome: valor("#clienteNome"), totais: obterTotais() };
}

function numero(seletor) {
  return normalizarNumero(valor(seletor));
}

function valor(seletor) {
  return document.querySelector(seletor)?.value?.trim() || "";
}

function moedaDoTexto(conteudo) {
  return normalizarNumero(String(conteudo || "").replace("R$", "").trim());
}

function escrever(seletor, conteudo) {
  const alvo = document.querySelector(seletor);
  if (alvo) alvo.textContent = conteudo;
}

function mostrarMensagem(mensagem) {
  mostrarStatus(document.querySelector("#statusOrcamento"), mensagem);
}

async function paraDataUrl(arquivo) {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let binario = "";
  const tamanhoBloco = 0x8000;
  for (let inicio = 0; inicio < bytes.length; inicio += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + tamanhoBloco));
  }
  return `data:${arquivo.type || "image/jpeg"};base64,${btoa(binario)}`;
}
