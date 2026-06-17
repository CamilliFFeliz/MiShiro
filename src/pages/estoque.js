import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { vazio, escapar, mostrarStatus, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { cadastrarItemEstoque, listarItensEstoque, listarAlertasEstoqueBaixo, calcularResumoEstoque, calcularCustoUnitario } from "../services/estoque-service.js";
import { BUSINESS_CATEGORIES, CATEGORY_ALL, CATEGORY_DEFINITIONS, CATEGORY_ORDER, normalizeCategory, normalizeItemPayload, UNIT_PURCHASE_CATEGORIES, PURCHASE_MODE_BOX, getItemSpecification, getMeasureLabel } from "../shared/stock-catalog.js";

let itens = [];
let termo = "";
let categoriaFormulario = BUSINESS_CATEGORIES[0];
let categoriaFiltro = CATEGORY_ALL;

montarLayout({ paginaAtual: "estoque", titulo: "Estoque", subtitulo: "Insumos" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  vincularEventos();
  renderCategoriasFormulario();
  renderCamposDinamicos();
  renderFiltros();
  await carregar();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#formEstoque")?.addEventListener("submit", salvarItem);
  document.querySelector("#buscaEstoque")?.addEventListener("input", (evento) => { termo = evento.target.value.toLowerCase(); render(); });
  document.querySelector("#categoryChoiceGrid")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-form-category]");
    if (!botao) return;
    categoriaFormulario = normalizeCategory(botao.dataset.formCategory);
    renderCategoriasFormulario();
    renderCamposDinamicos();
    atualizarIcones();
  });
  document.querySelector("#dynamicFieldsGrid")?.addEventListener("input", atualizarPrevia);
  document.querySelector("#dynamicFieldsGrid")?.addEventListener("change", (evento) => {
    if (evento.target.matches("[data-item-field='purchaseMode']")) renderCamposDinamicos();
    atualizarPrevia();
  });
  document.querySelector("#filtrosEstoque")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-stock-filter]");
    if (!botao) return;
    categoriaFiltro = botao.dataset.stockFilter;
    renderFiltros();
    render();
  });
}

async function carregar() {
  itens = await listarItensEstoque();
  render();
}

function renderCategoriasFormulario() {
  const grid = document.querySelector("#categoryChoiceGrid");
  if (!grid) return;
  grid.innerHTML = BUSINESS_CATEGORIES.map((categoria) => `<button class="category-choice ${categoria === categoriaFormulario ? "is-selected" : ""}" type="button" data-form-category="${escapar(categoria)}"><strong>${escapar(categoria)}</strong><span>${escapar(CATEGORY_DEFINITIONS[categoria]?.helper || "")}</span></button>`).join("");
}

function renderCamposDinamicos() {
  const grid = document.querySelector("#dynamicFieldsGrid");
  const helper = document.querySelector("#categoryHelper");
  const definicao = CATEGORY_DEFINITIONS[categoriaFormulario];
  if (!grid || !definicao) return;

  if (helper) helper.textContent = definicao.helper;

  const dadosAtuais = lerDadosFormulario();
  if (!dadosAtuais.purchaseMode && UNIT_PURCHASE_CATEGORIES.includes(categoriaFormulario)) dadosAtuais.purchaseMode = PURCHASE_MODE_BOX;

  grid.innerHTML = definicao.fields.filter((campo) => campoVisivel(campo, dadosAtuais)).map((campo) => renderCampo(campo, dadosAtuais[campo.key])).join("");
  atualizarPrevia();
}

function renderCampo(campo, valor = "") {
  if (campo.type === "select") {
    return `<label class="field"><span>${escapar(campo.label)}</span><select data-item-field="${campo.key}" ${campo.required ? "required" : ""}>${campo.options.map((opcao) => `<option value="${opcao.value}" ${opcao.value === valor ? "selected" : ""}>${escapar(opcao.label)}</option>`).join("")}</select></label>`;
  }

  if (campo.type === "measure") {
    const unidadeAtual = valor && campo.options.includes(valor) ? valor : campo.options[0];
    return `<label class="field measure-field"><span>${escapar(campo.label)}</span><div class="measure-input"><input data-item-field="packageQuantity" inputmode="${campo.inputMode || "decimal"}" placeholder="${escapar(campo.placeholder || "")}" ${campo.required ? "required" : ""}/><select data-item-field="measureUnit">${campo.options.map((opcao) => `<option value="${opcao}" ${opcao === unidadeAtual ? "selected" : ""}>${opcao}</option>`).join("")}</select></div></label>`;
  }

  return `<label class="field"><span>${escapar(campo.label)}</span><input data-item-field="${campo.key}" type="text" inputmode="${campo.inputMode || "text"}" placeholder="${escapar(campo.placeholder || "")}" value="${escapar(valor)}" ${campo.required ? "required" : ""}/></label>`;
}

function campoVisivel(campo, dados) {
  if (!campo.visibleWhen) return true;
  return dados[campo.visibleWhen.key] === campo.visibleWhen.value;
}

async function salvarItem(evento) {
  evento.preventDefault();
  const dados = lerDadosFormulario();
  const payload = normalizeItemPayload(categoriaFormulario, dados, normalizarNumero);

  if (!payload.nome || payload.precoEmbalagem <= 0 || payload.quantidadeEmbalagem <= 0 || payload.quantidadeAtual <= 0) {
    mostrarStatus(document.querySelector("#statusEstoque"), "Preencha os campos obrigatórios com valores válidos.");
    return;
  }

  await cadastrarItemEstoque(payload);
  evento.target.reset();
  renderCamposDinamicos();
  mostrarStatus(document.querySelector("#statusEstoque"), "Item salvo no IndexedDB.");
  await carregar();
}

function lerDadosFormulario() {
  const dados = {};
  document.querySelectorAll("#dynamicFieldsGrid [data-item-field]").forEach((campo) => { dados[campo.dataset.itemField] = campo.value; });
  if (!dados.measureUnit) dados.measureUnit = CATEGORY_DEFINITIONS[categoriaFormulario]?.defaultMeasure;
  return dados;
}

function atualizarPrevia() {
  const preview = document.querySelector("#unitCostPreview");
  if (!preview) return;
  const payload = normalizeItemPayload(categoriaFormulario, lerDadosFormulario(), normalizarNumero);
  const custo = calcularCustoUnitario(payload);
  const valorEstoque = custo * normalizarNumero(payload.quantidadeAtual) * (categoriaFormulario === "Tintas" || categoriaFormulario === "Pastosos" || categoriaFormulario === "Materiais de Extensão" ? normalizarNumero(payload.quantidadeEmbalagem || 1) : 1);
  preview.innerHTML = `<span>Custo por ${escapar(getMeasureLabel(payload.unidadeMedida))}</span><strong>${formatarMoeda(custo)}</strong><small>Valor estimado em estoque: ${formatarMoeda(valorEstoque)}</small>`;
}

function renderFiltros() {
  const filtros = document.querySelector("#filtrosEstoque");
  if (!filtros) return;
  filtros.innerHTML = CATEGORY_ORDER.map((categoria) => `<button class="filter-chip ${categoria === categoriaFiltro ? "is-active" : ""}" type="button" data-stock-filter="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

async function render() {
  const alertas = await listarAlertasEstoqueBaixo();
  document.querySelector("#alertasEstoque").innerHTML = alertas.length ? alertas.map((item) => `<div class="alert-card">Estoque baixo: <strong>${escapar(item.nome)}</strong> (${item.quantidadeAtual} ${escapar(item.unidadeMedida)})</div>`).join("") : "";
  const filtrados = itens.filter((item) => {
    const texto = [item.nome, item.categoria, item.marca, item.linhaTipo, item.numeracao, item.cor].join(" ").toLowerCase();
    const bateTermo = !termo || texto.includes(termo);
    const bateCategoria = categoriaFiltro === CATEGORY_ALL || item.categoria === categoriaFiltro;
    return bateTermo && bateCategoria;
  });
  document.querySelector("#listaEstoque").innerHTML = filtrados.length ? filtrados.map(card).join("") : vazio("Nenhum item encontrado.");
}

function card(item) {
  const resumo = calcularResumoEstoque(item);
  return `<article class="stock-card"><strong>${escapar(item.nome)}</strong><span>${escapar(item.categoria)} · ${escapar(getItemSpecification(item) || "Sem especificação")}</span><div class="stock-meta"><span>Atual: ${resumo.quantidadeAtual} ${escapar(item.unidadeMedida)}</span><span>Custo uso: ${formatarMoeda(resumo.custoUnitario)}</span><span>Valor em estoque: ${formatarMoeda(resumo.valorTotal)}</span><span>Mínimo: ${resumo.quantidadeMinima}</span></div><div class="stock-bar"><i style="width:${resumo.percentualMinimo}%"></i></div></article>`;
}
