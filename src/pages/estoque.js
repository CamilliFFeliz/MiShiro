import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { vazio, escapar, mostrarStatus, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { cadastrarItemEstoque, atualizarItemEstoque, listarItensEstoque, listarAlertasEstoqueBaixo, calcularResumoEstoque, calcularCustoUnitario, garantirEstoqueInicial, restaurarEstoqueReferencia } from "../services/estoque-service.js";
import { BUSINESS_CATEGORIES, CATEGORY_ALL, CATEGORY_DEFINITIONS, CATEGORY_ORDER, normalizeCategory, normalizeItemPayload, UNIT_PURCHASE_CATEGORIES, PURCHASE_MODE_BOX, PURCHASE_MODE_SINGLE, getItemSpecification, getMeasureLabel } from "../shared/stock-catalog.js";

let itens = [];
let termo = "";
let categoriaFormulario = BUSINESS_CATEGORIES[0];
let categoriaFiltro = CATEGORY_ALL;
let itemEmEdicaoId = null;
let dadosFormularioAtual = null;

montarLayout({ paginaAtual: "estoque", titulo: "Estoque", subtitulo: "Banco local" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  await garantirEstoqueInicial();
  vincularEventos();
  renderCategoriasFormulario();
  renderCamposDinamicos();
  renderFiltros();
  await carregar();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#formEstoque")?.addEventListener("submit", salvarItem);
  document.querySelector("#openItemModalButton")?.addEventListener("click", () => abrirModalEstoque());
  document.querySelector("#closeItemModalButton")?.addEventListener("click", fecharModalEstoque);
  document.querySelector("#restoreReferenceStockButton")?.addEventListener("click", restaurarBaseReferencia);
  document.querySelector("#clearInventorySearchButton")?.addEventListener("click", () => { termo = ""; document.querySelector("#buscaEstoque").value = ""; render(); });
  document.querySelector("#buscaEstoque")?.addEventListener("input", (evento) => { termo = evento.target.value.toLowerCase(); render(); });
  document.querySelector("#categoryChoiceGrid")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-form-category]");
    if (!botao) return;
    categoriaFormulario = normalizeCategory(botao.dataset.formCategory);
    dadosFormularioAtual = { ...lerDadosFormulario(), purchaseMode: PURCHASE_MODE_BOX };
    renderCategoriasFormulario();
    renderCamposDinamicos(dadosFormularioAtual);
    atualizarIcones();
  });
  document.querySelector("#dynamicFieldsGrid")?.addEventListener("input", atualizarPrevia);
  document.querySelector("#dynamicFieldsGrid")?.addEventListener("change", (evento) => {
    if (evento.target.matches("[data-item-field='purchaseMode']")) {
      dadosFormularioAtual = lerDadosFormulario();
      renderCamposDinamicos(dadosFormularioAtual);
    }
    atualizarPrevia();
  });
  document.querySelector("#filtrosEstoque")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-stock-filter]");
    if (!botao) return;
    categoriaFiltro = botao.dataset.stockFilter;
    renderFiltros();
    render();
  });
  document.querySelector("#listaEstoque")?.addEventListener("click", (evento) => {
    const botaoEditar = evento.target.closest("[data-edit-stock-item]");
    if (!botaoEditar) return;
    abrirModalEstoque(botaoEditar.dataset.editStockItem);
  });
}

async function carregar() {
  itens = await listarItensEstoque();
  render();
}

function abrirModalEstoque(itemId = null) {
  const form = document.querySelector("#formEstoque");
  form?.reset();

  itemEmEdicaoId = itemId;
  const item = itemId ? itens.find((registro) => registro.id === itemId) : null;

  if (item) {
    categoriaFormulario = normalizeCategory(item.categoria);
    dadosFormularioAtual = converterItemParaFormulario(item);
  } else {
    categoriaFormulario = BUSINESS_CATEGORIES[0];
    dadosFormularioAtual = criarDadosPadraoFormulario(categoriaFormulario);
  }

  atualizarCabecalhoModal(Boolean(item));
  renderCategoriasFormulario();
  renderCamposDinamicos(dadosFormularioAtual);
  atualizarIcones();
  document.querySelector("#itemModal")?.showModal?.();
}

function fecharModalEstoque() {
  itemEmEdicaoId = null;
  dadosFormularioAtual = null;
  document.querySelector("#itemModal")?.close?.();
}

function atualizarCabecalhoModal(modoEdicao) {
  const titulo = document.querySelector("#itemModal .modal-header h2");
  const subtitulo = document.querySelector("#itemModal .modal-header span");
  const botaoSalvar = document.querySelector("#formEstoque .full-button");
  if (titulo) titulo.textContent = modoEdicao ? "Editar insumo" : "Cadastrar insumo";
  if (subtitulo) subtitulo.textContent = modoEdicao ? "Atualizar item" : "Novo item";
  if (botaoSalvar) botaoSalvar.innerHTML = `<i data-lucide="save" aria-hidden="true"></i>${modoEdicao ? "Salvar alterações" : "Salvar item"}`;
}

async function restaurarBaseReferencia() {
  if (!confirm("Restaurar a base antiga adicionará novamente os itens de referência ao estoque atual. Continuar?")) return;
  await restaurarEstoqueReferencia({ somenteSeVazio: false });
  await carregar();
  mostrarStatus(document.querySelector("#statusEstoque"), "Estoque base restaurado.");
}

function renderCategoriasFormulario() {
  const grid = document.querySelector("#categoryChoiceGrid");
  if (!grid) return;
  grid.innerHTML = BUSINESS_CATEGORIES.map((categoria) => `<button class="category-choice ${categoria === categoriaFormulario ? "is-selected" : ""}" type="button" data-form-category="${escapar(categoria)}"><strong>${escapar(categoria)}</strong><span>${escapar(CATEGORY_DEFINITIONS[categoria]?.helper || "")}</span></button>`).join("");
}

function renderCamposDinamicos(dadosIniciais = null) {
  const grid = document.querySelector("#dynamicFieldsGrid");
  const helper = document.querySelector("#categoryHelper");
  const definicao = CATEGORY_DEFINITIONS[categoriaFormulario];
  if (!grid || !definicao) return;

  const dadosAtuais = { ...criarDadosPadraoFormulario(categoriaFormulario), ...(dadosIniciais || lerDadosFormulario()) };
  if (!dadosAtuais.purchaseMode && UNIT_PURCHASE_CATEGORIES.includes(categoriaFormulario)) dadosAtuais.purchaseMode = PURCHASE_MODE_BOX;
  if (helper) helper.textContent = definicao.helper;

  const campos = definicao.fields.filter((campo) => campoVisivel(campo, dadosAtuais)).map((campo) => renderCampo(campo, dadosAtuais)).join("");
  grid.innerHTML = `${campos}${renderCampoEstoqueMinimo(dadosAtuais)}`;
  atualizarPrevia();
}

function renderCampo(campo, dados) {
  const valor = dados[campo.key] ?? "";

  if (campo.type === "select") {
    return `<label class="field"><span>${escapar(campo.label)}</span><select data-item-field="${campo.key}" ${campo.required ? "required" : ""}>${campo.options.map((opcao) => `<option value="${opcao.value}" ${opcao.value === valor ? "selected" : ""}>${escapar(opcao.label)}</option>`).join("")}</select></label>`;
  }

  if (campo.type === "measure") {
    const unidadeAtual = campo.options.includes(dados.measureUnit) ? dados.measureUnit : campo.options[0];
    return `<label class="field measure-field"><span>${escapar(campo.label)}</span><div class="measure-input"><input data-item-field="packageQuantity" inputmode="${campo.inputMode || "decimal"}" placeholder="${escapar(campo.placeholder || "")}" value="${escapar(valor)}" ${campo.required ? "required" : ""}/><select data-item-field="measureUnit">${campo.options.map((opcao) => `<option value="${opcao}" ${opcao === unidadeAtual ? "selected" : ""}>${opcao}</option>`).join("")}</select></div></label>`;
  }

  return `<label class="field"><span>${escapar(campo.label)}</span><input data-item-field="${campo.key}" type="text" inputmode="${campo.inputMode || "text"}" placeholder="${escapar(campo.placeholder || "")}" value="${escapar(valor)}" ${campo.required ? "required" : ""}/></label>`;
}

function renderCampoEstoqueMinimo(dados) {
  return `<label class="field"><span>Estoque mínimo</span><input data-item-field="minimumQuantity" type="text" inputmode="decimal" placeholder="2" value="${escapar(dados.minimumQuantity ?? 2)}" /></label>`;
}

function campoVisivel(campo, dados) {
  if (!campo.visibleWhen) return true;
  return dados[campo.visibleWhen.key] === campo.visibleWhen.value;
}

async function salvarItem(evento) {
  evento.preventDefault();
  const dados = lerDadosFormulario();
  const payload = normalizeItemPayload(categoriaFormulario, dados, normalizarNumero);

  if (!payload.nome || payload.precoEmbalagem <= 0 || payload.quantidadeEmbalagem <= 0 || payload.quantidadeAtual < 0) {
    mostrarStatus(document.querySelector("#statusEstoque"), "Preencha os campos obrigatórios com valores válidos.");
    return;
  }

  if (itemEmEdicaoId) {
    await atualizarItemEstoque(itemEmEdicaoId, payload);
  } else {
    await cadastrarItemEstoque(payload);
  }

  fecharModalEstoque();
  await carregar();
}

function lerDadosFormulario() {
  const dados = {};
  document.querySelectorAll("#dynamicFieldsGrid [data-item-field]").forEach((campo) => { dados[campo.dataset.itemField] = campo.value; });
  if (!dados.measureUnit) dados.measureUnit = CATEGORY_DEFINITIONS[categoriaFormulario]?.defaultMeasure;
  return dados;
}

function converterItemParaFormulario(item) {
  const compraUnitaria = item.formatoCompra === PURCHASE_MODE_SINGLE || normalizarNumero(item.quantidadeEmbalagem) === 1;
  return {
    name: item.nome || "",
    brand: item.marca || "",
    lineType: item.linhaTipo || item.nome || "",
    numbering: item.numeracao || "",
    color: item.cor || "",
    purchaseMode: compraUnitaria ? PURCHASE_MODE_SINGLE : PURCHASE_MODE_BOX,
    packageQuantity: compraUnitaria ? "" : item.quantidadeEmbalagem,
    packagePrice: compraUnitaria ? "" : item.precoEmbalagem,
    singleUnitPrice: compraUnitaria ? item.precoEmbalagem : "",
    stockQuantity: item.quantidadeAtual,
    minimumQuantity: item.quantidadeMinima,
    measureUnit: item.unidadeMedida || CATEGORY_DEFINITIONS[categoriaFormulario]?.defaultMeasure
  };
}

function criarDadosPadraoFormulario(categoria) {
  return {
    purchaseMode: UNIT_PURCHASE_CATEGORIES.includes(categoria) ? PURCHASE_MODE_BOX : "",
    measureUnit: CATEGORY_DEFINITIONS[categoria]?.defaultMeasure || "un",
    minimumQuantity: 2
  };
}

function atualizarPrevia() {
  const preview = document.querySelector("#unitCostPreview");
  if (!preview) return;
  const payload = normalizeItemPayload(categoriaFormulario, lerDadosFormulario(), normalizarNumero);
  const custo = calcularCustoUnitario(payload);
  const valorEstoque = normalizarNumero(payload.precoEmbalagem) * normalizarNumero(payload.quantidadeAtual);
  preview.innerHTML = `<span>Custo por ${escapar(getMeasureLabel(payload.unidadeMedida))}</span><strong>${formatarMoeda(custo)}</strong><small>Valor financeiro total: ${formatarMoeda(valorEstoque)}</small>`;
}

function renderFiltros() {
  const filtros = document.querySelector("#filtrosEstoque");
  if (!filtros) return;
  filtros.innerHTML = CATEGORY_ORDER.map((categoria) => `<button class="filter-chip ${categoria === categoriaFiltro ? "is-active" : ""}" type="button" data-stock-filter="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

async function render() {
  const counter = document.querySelector("#inventoryCounter");
  if (counter) counter.textContent = `${itens.length} ${itens.length === 1 ? "item" : "itens"}`;
  const alertas = await listarAlertasEstoqueBaixo();
  document.querySelector("#alertasEstoque").innerHTML = alertas.length ? alertas.map((item) => `<div class="alert-card">Estoque baixo: <strong>${escapar(item.nome)}</strong> (${item.quantidadeAtual} ${escapar(item.unidadeMedida)})</div>`).join("") : "";
  const filtrados = itens.filter((item) => {
    const texto = [item.nome, item.categoria, item.marca, item.linhaTipo, item.numeracao, item.cor].join(" ").toLowerCase();
    const bateTermo = !termo || texto.includes(termo);
    const bateCategoria = categoriaFiltro === CATEGORY_ALL || item.categoria === categoriaFiltro;
    return bateTermo && bateCategoria;
  });
  document.querySelector("#listaEstoque").innerHTML = filtrados.length ? filtrados.map(card).join("") : vazio("Nenhum item encontrado.");
  atualizarIcones();
}

function card(item) {
  const resumo = calcularResumoEstoque(item);
  return `<article class="inventory-card stock-card"><div class="card-topline"><span class="category-pill">${escapar(item.categoria)}</span>${resumo.estoqueBaixo ? `<span class="low-stock-tag">Estoque baixo</span>` : ""}</div><div class="inventory-title-row"><div class="product-avatar" aria-hidden="true">${escapar((item.nome || "?").slice(0, 1).toUpperCase())}</div><div><h3>${escapar(item.nome)}</h3><span>${escapar(getItemSpecification(item) || "Sem especificação")}</span></div></div><div class="stock-metric-grid"><div class="stock-metric is-featured"><span>Valor financeiro total</span><strong>${formatarMoeda(resumo.valorTotal)}</strong></div><div class="stock-metric"><span>Custo por ${escapar(getMeasureLabel(item.unidadeMedida))}</span><strong>${formatarMoeda(resumo.custoUnitario)}</strong></div></div><p class="card-note">Estoque: ${resumo.quantidadeAtual} ${escapar(item.unidadeMedida)} · embalagem de ${normalizarNumero(item.quantidadeEmbalagem)} ${escapar(item.unidadeMedida)} por ${formatarMoeda(item.precoEmbalagem)}</p><div class="inventory-card-actions"><button class="button button-secondary" type="button" data-edit-stock-item="${escapar(item.id)}"><i data-lucide="pencil" aria-hidden="true"></i>Editar</button></div></article>`;
}
