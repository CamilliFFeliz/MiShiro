import { mostrarStatus, escapar } from "../shared/ui.js";
import { CATEGORY_ALL } from "../shared/stock-catalog.js";
import { estadoOrcamento, definirQuantidade } from "./orcamentos-v3-data.js";
import { renderizarTudo } from "./budget-ui.js";

const LIMITE_REFERENCIAS = 6;
const TAMANHO_MAXIMO_REFERENCIA = 2 * 1024 * 1024;

export function conectarEventosCarrinho() {
  const formulario = document.querySelector("#formOrcamento");
  if (!formulario || formulario.dataset.orcamentoEventosConectados === "true") return;
  formulario.dataset.orcamentoEventosConectados = "true";
  estadoOrcamento.errosQuantidade ||= new Set();

  document.querySelector("#budgetSearchInput")?.addEventListener("input", (evento) => {
    estadoOrcamento.termo = evento.target.value.toLowerCase().trim();
    renderizarTudo();
  });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => {
    estadoOrcamento.termo = "";
    const campo = document.querySelector("#budgetSearchInput");
    if (campo) campo.value = "";
    renderizarTudo();
  });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-category]");
    if (!botao) return;
    estadoOrcamento.categoria = botao.dataset.category || CATEGORY_ALL;
    renderizarTudo();
  });
  document.querySelector("#stockPickerList")?.addEventListener("click", (evento) => mudarPorBotao(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("click", (evento) => mudarPorBotao(evento, "data-cart-id"));
  document.querySelector("#stockPickerList")?.addEventListener("change", (evento) => mudarPorCampo(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("change", (evento) => mudarPorCampo(evento, "data-cart-id"));
  formulario.addEventListener("input", (evento) => {
    if (evento.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) renderizarTudo();
  });

  document.querySelector("#imagemReferencia")?.addEventListener("change", adicionarReferencias);
  document.querySelector("#listaReferenciasArte")?.addEventListener("click", tratarReferencias);
  renderizarReferencias();
}

function mudarPorBotao(evento, atributo) {
  const remover = evento.target.closest("[data-remove-item]");
  if (remover) return mudarQuantidade(remover.closest(`[${atributo}]`)?.getAttribute(atributo), 0);
  const botao = evento.target.closest("[data-step]");
  if (!botao) return;
  const id = botao.closest(`[${atributo}]`)?.getAttribute(atributo);
  const atual = estadoOrcamento.carrinho.get(id)?.quantidade || 0;
  mudarQuantidade(id, atual + (botao.dataset.step === "increase" ? 1 : -1));
}

function mudarPorCampo(evento, atributo) {
  const campo = evento.target.closest("[data-step-input]");
  if (!campo) return;
  mudarQuantidade(campo.closest(`[${atributo}]`)?.getAttribute(atributo), campo.value, true);
}

function mudarQuantidade(id, quantidade, manual = false) {
  const item = estadoOrcamento.estoque.find((registro) => registro.id === id) || estadoOrcamento.carrinho.get(id)?.item;
  if (!item) return;
  const texto = String(quantidade ?? "").trim();
  const inteiroValido = texto === "" || /^\d+$/.test(texto);
  const resultado = inteiroValido ? definirQuantidade(item, texto || 0) : { ok: false };
  if (!resultado.ok) {
    estadoOrcamento.errosQuantidade.add(item.id);
    mostrarStatus(document.querySelector("#statusOrcamento"), manual && !inteiroValido ? `Informe uma quantidade inteira válida para ${item.nome}.` : `A quantidade de ${item.nome} não pode superar o estoque disponível.`);
  } else {
    estadoOrcamento.errosQuantidade.delete(item.id);
  }
  renderizarTudo();
}

async function adicionarReferencias(evento) {
  const arquivos = Array.from(evento.target.files || []);
  const vagas = LIMITE_REFERENCIAS - estadoOrcamento.referencias.length;
  const aceitos = arquivos.filter((arquivo) => /^image\/(png|jpeg|webp)$/.test(arquivo.type) && arquivo.size <= TAMANHO_MAXIMO_REFERENCIA).slice(0, Math.max(0, vagas));
  if (aceitos.length !== arquivos.length) mostrarStatus(document.querySelector("#statusOrcamento"), "Use JPG, PNG ou WEBP de até 2 MB. O limite é de seis referências.");
  estadoOrcamento.referencias.push(...await Promise.all(aceitos.map(limparArquivo)));
  evento.target.value = "";
  renderizarReferencias();
}

function limparArquivo(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver({ id: crypto.randomUUID?.() || `referencia-${Date.now()}-${arquivo.name}`, nome: arquivo.name, tipo: arquivo.type, dataUrl: String(leitor.result || "") });
    leitor.onerror = rejeitar;
    leitor.readAsDataURL(arquivo);
  });
}

function tratarReferencias(evento) {
  const remover = evento.target.closest("[data-remove-reference]");
  if (remover) {
    estadoOrcamento.referencias = estadoOrcamento.referencias.filter((referencia) => referencia.id !== remover.dataset.removeReference);
    return renderizarReferencias();
  }
  const visualizar = evento.target.closest("[data-view-reference]");
  if (visualizar) abrirReferencia(estadoOrcamento.referencias.find((referencia) => referencia.id === visualizar.dataset.viewReference));
}

export function renderizarReferencias() {
  const vazio = document.querySelector("#previewImagem");
  const lista = document.querySelector("#listaReferenciasArte");
  if (!lista) return;
  if (vazio) vazio.hidden = estadoOrcamento.referencias.length > 0;
  lista.innerHTML = estadoOrcamento.referencias.map((referencia) => `<article class="ops-reference-card"><img src="${referencia.dataUrl}" alt="Referência ${escapar(referencia.nome)}" /><div><strong>${escapar(referencia.nome)}</strong><span><button type="button" class="button button-ghost" data-view-reference="${escapar(referencia.id)}">Visualizar</button><button type="button" class="button button-ghost" data-remove-reference="${escapar(referencia.id)}">Remover</button></span></div></article>`).join("");
}

function abrirReferencia(referencia) {
  const modal = document.querySelector("#referenciaModal");
  const conteudo = document.querySelector("#referenciaModalContent");
  if (!modal || !conteudo || !referencia) return;
  conteudo.innerHTML = `<button type="button" class="icon-button" aria-label="Fechar referência" data-close-reference>×</button><img class="reference-viewer-image" src="${referencia.dataUrl}" alt="${escapar(referencia.nome)}" />`;
  conteudo.querySelector("[data-close-reference]")?.addEventListener("click", () => modal.close());
  modal.showModal();
}
