import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, mostrarStatus, vazio, atualizarIcones } from "../shared/ui.js";
import { lerLocalJson, salvarLocalJson } from "../shared/storage.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularCustoUnitario, criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento } from "../services/orcamentos-service.js";
import { CATEGORY_ALL, CATEGORY_ORDER, getItemSpecification, getMeasureLabel, getMeasureSuffix, getMinimumQuantity, getUsageRules, adjustQuantity, sanitizeUsageQuantity } from "../shared/stock-catalog.js";

const PERFIL_KEY = "MISHIRO_PERFIL_ESTUDIO";
const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;
let itensEstoque = [];
let materiais = [];
let imagemReferencia = "";
let termoBusca = "";
let categoriaFiltro = CATEGORY_ALL;

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta do cliente" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  carregarPerfil();
  itensEstoque = await listarItensEstoque();
  vincularEventos();
  renderFiltros();
  renderStockPicker();
  renderMateriais();
  recalcular();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#imagemReferencia")?.addEventListener("change", carregarImagemReferencia);
  document.querySelector("#formOrcamento")?.addEventListener("input", recalcular);
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvarOrcamento);
  document.querySelector("#budgetSearchInput")?.addEventListener("input", (evento) => { termoBusca = evento.target.value.toLowerCase(); renderStockPicker(); });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => { termoBusca = ""; document.querySelector("#budgetSearchInput").value = ""; renderStockPicker(); });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-budget-category]");
    if (!botao) return;
    categoriaFiltro = botao.dataset.budgetCategory;
    renderFiltros();
    renderStockPicker();
  });
  document.querySelector("#stockPickerList")?.addEventListener("click", handlePickerClick);
  document.querySelector("#stockPickerList")?.addEventListener("change", handlePickerQuantityChange);
  document.querySelector("#listaMateriais")?.addEventListener("click", handleCartClick);
  document.querySelector("#listaMateriais")?.addEventListener("change", handleCartQuantityChange);
  document.querySelector("#copiarResumo")?.addEventListener("click", copiarResumo);
  document.querySelector("#gerarPdf")?.addEventListener("click", gerarPdfOrcamento);
  document.querySelector("#limparOrcamento")?.addEventListener("click", limparFormulario);
  document.querySelectorAll("[data-preset]").forEach((botao) => botao.addEventListener("click", () => aplicarPreset(botao.dataset.preset)));
}

function carregarPerfil() {
  const perfil = lerLocalJson(PERFIL_KEY, {});
  setValue("#studioName", perfil.nomeEstudio || "MiShiro Tattoo");
  setValue("#artistName", perfil.nomeArtista || "");
  setValue("#studioContact", perfil.contatoEstudio || "");
  setValue("#bookingSignal", perfil.sinalPadrao || "30");
}

function renderFiltros() {
  const filtros = document.querySelector("#budgetCategoryFilters");
  if (!filtros) return;
  filtros.innerHTML = CATEGORY_ORDER.map((categoria) => `<button class="filter-chip ${categoria === categoriaFiltro ? "is-active" : ""}" type="button" data-budget-category="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

function renderStockPicker() {
  const lista = document.querySelector("#stockPickerList");
  if (!lista) return;
  const filtrados = itensEstoque.filter((item) => {
    const texto = [item.categoria, item.nome, item.marca, item.linhaTipo, item.numeracao, item.cor, getItemSpecification(item)].join(" ").toLowerCase();
    const bateTermo = !termoBusca || texto.includes(termoBusca);
    const bateCategoria = categoriaFiltro === CATEGORY_ALL || item.categoria === categoriaFiltro;
    return bateTermo && bateCategoria;
  });

  lista.innerHTML = filtrados.length ? filtrados.map(renderPickerCard).join("") : vazio("Nenhum insumo encontrado para adicionar ao orçamento.");
  atualizarIcones();
}

function renderPickerCard(item) {
  const rules = getUsageRules(item);
  const suffix = getMeasureSuffix(item.unidadeMedida);
  return `<article class="picker-card" data-inventory-item-id="${escapar(item.id)}">
    <div class="picker-info">
      <strong>${escapar(item.nome)}</strong>
      <span>${escapar(item.categoria)} · ${escapar(getItemSpecification(item) || "Sem especificação")}</span>
      <small>${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(getMeasureLabel(item.unidadeMedida))}</small>
    </div>
    <div class="picker-actions">
      <label class="stepper-field">
        <span>Quantidade usada</span>
        <div class="quantity-stepper" data-suffix="${escapar(suffix)}">
          <button type="button" data-picker-step="decrease" aria-label="Diminuir quantidade">−</button>
          <input data-picker-quantity type="text" inputmode="${rules.inputMode}" value="${rules.defaultValue}" />
          <button type="button" data-picker-step="increase" aria-label="Aumentar quantidade">+</button>
        </div>
      </label>
      <button class="button button-primary" type="button" data-add-to-budget>Adicionar</button>
    </div>
  </article>`;
}

function handlePickerClick(evento) {
  const step = evento.target.closest("[data-picker-step]");
  if (step) {
    const card = step.closest("[data-inventory-item-id]");
    const item = encontrarItem(card?.dataset.inventoryItemId);
    const input = card?.querySelector("[data-picker-quantity]");
    if (item && input) input.value = adjustQuantity(item, input.value, step.dataset.pickerStep, getMinimumQuantity(item), normalizarNumero);
    return;
  }

  const add = evento.target.closest("[data-add-to-budget]");
  if (!add) return;
  const card = add.closest("[data-inventory-item-id]");
  const input = card?.querySelector("[data-picker-quantity]");
  adicionarMaterial(card?.dataset.inventoryItemId, input?.value);
}

function handlePickerQuantityChange(evento) {
  if (!evento.target.matches("[data-picker-quantity]")) return;
  const card = evento.target.closest("[data-inventory-item-id]");
  const item = encontrarItem(card?.dataset.inventoryItemId);
  if (item) evento.target.value = sanitizeUsageQuantity(item, evento.target.value, getMinimumQuantity(item), normalizarNumero);
}

function adicionarMaterial(itemId, rawQuantidade) {
  const item = encontrarItem(itemId);
  if (!item) return;
  const quantidade = sanitizeUsageQuantity(item, rawQuantidade, getMinimumQuantity(item), normalizarNumero);
  const existente = materiais.find((registro) => registro.item.id === item.id);
  if (existente) {
    existente.quantidade = sanitizeUsageQuantity(item, normalizarNumero(existente.quantidade) + quantidade, getMinimumQuantity(item), normalizarNumero);
  } else {
    materiais.push({ id: `cart-${crypto.randomUUID?.() || Date.now()}`, item, quantidade });
  }
  renderMateriais();
  recalcular();
}

function renderMateriais() {
  const lista = document.querySelector("#listaMateriais");
  if (!lista) return;
  lista.innerHTML = materiais.length ? materiais.map(renderItemCarrinho).join("") : vazio("Nenhum insumo adicionado ao orçamento.");
  atualizarIcones();
}

function renderItemCarrinho(registro, index) {
  const rules = getUsageRules(registro.item);
  const suffix = getMeasureSuffix(registro.item.unidadeMedida);
  const subtotal = calcularCustoUnitario(registro.item) * normalizarNumero(registro.quantidade);
  return `<article class="cart-card-row" data-cart-index="${index}">
    <div class="cart-card-row__title">
      <strong>${escapar(registro.item.nome)}</strong>
      <span>${escapar(getItemSpecification(registro.item) || registro.item.categoria)} · ${formatarMoeda(calcularCustoUnitario(registro.item))}/${escapar(getMeasureLabel(registro.item.unidadeMedida))}</span>
    </div>
    <label class="stepper-field compact-stepper-field">
      <span>Uso</span>
      <div class="quantity-stepper" data-suffix="${escapar(suffix)}">
        <button type="button" data-cart-step="decrease" aria-label="Diminuir quantidade">−</button>
        <input data-cart-quantity type="text" inputmode="${rules.inputMode}" value="${registro.quantidade}" />
        <button type="button" data-cart-step="increase" aria-label="Aumentar quantidade">+</button>
      </div>
    </label>
    <div class="cart-card-row__total"><span>${formatarMoeda(subtotal)}</span><small>Subtotal</small><button class="button button-ghost" type="button" data-remove-cart-item>Remover</button></div>
  </article>`;
}

function handleCartClick(evento) {
  const step = evento.target.closest("[data-cart-step]");
  if (step) {
    const row = step.closest("[data-cart-index]");
    const index = Number(row?.dataset.cartIndex);
    const registro = materiais[index];
    if (!registro) return;
    const next = adjustQuantity(registro.item, registro.quantidade, step.dataset.cartStep, 0, normalizarNumero);
    if (next <= 0) materiais.splice(index, 1); else registro.quantidade = next;
    renderMateriais();
    recalcular();
    return;
  }

  const remove = evento.target.closest("[data-remove-cart-item]");
  if (remove) {
    const row = remove.closest("[data-cart-index]");
    materiais.splice(Number(row?.dataset.cartIndex), 1);
    renderMateriais();
    recalcular();
  }
}

function handleCartQuantityChange(evento) {
  if (!evento.target.matches("[data-cart-quantity]")) return;
  const row = evento.target.closest("[data-cart-index]");
  const index = Number(row?.dataset.cartIndex);
  const registro = materiais[index];
  if (!registro) return;
  const next = sanitizeUsageQuantity(registro.item, evento.target.value, 0, normalizarNumero);
  if (next <= 0) materiais.splice(index, 1); else registro.quantidade = next;
  renderMateriais();
  recalcular();
}

async function carregarImagemReferencia(evento) {
  const arquivo = evento.target.files?.[0];
  const preview = document.querySelector("#previewImagem");
  if (!arquivo) return;
  if (!arquivo.type.startsWith("image/")) return mostrarStatus(document.querySelector("#statusOrcamento"), "Selecione uma imagem válida.");
  if (arquivo.size > LIMITE_IMAGEM_BYTES) {
    mostrarStatus(document.querySelector("#statusOrcamento"), "Imagem muito grande. Use uma imagem com até 2 MB.");
    evento.target.value = "";
    return;
  }
  imagemReferencia = await lerArquivoComoDataUrl(arquivo);
  if (preview) {
    preview.classList.remove("is-empty");
    preview.innerHTML = `<img src="${imagemReferencia}" alt="Imagem de referência da tatuagem" />`;
  }
}

function obterTotais() {
  const materiaisTotal = materiais.reduce((total, registro) => total + calcularCustoUnitario(registro.item) * normalizarNumero(registro.quantidade), 0);
  const valorHora = normalizarNumero(document.querySelector("#valorHora")?.value);
  const duracao = normalizarNumero(document.querySelector("#duracaoSessao")?.value);
  const margem = normalizarNumero(document.querySelector("#margem")?.value);
  const desconto = normalizarNumero(document.querySelector("#desconto")?.value);
  const maoObra = valorHora * duracao;
  const totalCost = materiaisTotal + maoObra;
  const marginCost = totalCost * (margem / 100);
  const suggestedPrice = totalCost + marginCost;
  const discountAmount = suggestedPrice * (desconto / 100);
  const final = Math.max(suggestedPrice - discountAmount, 0);
  return { materiaisTotal, maoObra, totalCost, marginCost, suggestedPrice, discountAmount, final, margem, desconto, valorHora, duracao };
}

function recalcular() {
  const totais = obterTotais();
  setText("#totalMateriais", formatarMoeda(totais.materiaisTotal));
  setText("#totalMaoObra", formatarMoeda(totais.maoObra));
  setText("#subtotalOrcamento", formatarMoeda(totais.suggestedPrice));
  setText("#valorDesconto", formatarMoeda(totais.discountAmount));
  setText("#valorFinal", formatarMoeda(totais.final));
}

async function salvarOrcamento(evento) {
  evento.preventDefault();
  const perfil = { nomeEstudio: value("#studioName"), nomeArtista: value("#artistName"), contatoEstudio: value("#studioContact"), sinalPadrao: value("#bookingSignal") };
  salvarLocalJson(PERFIL_KEY, perfil);
  const totais = obterTotais();
  const itens = materiais.filter((registro) => normalizarNumero(registro.quantidade) > 0).map((registro) => criarSnapshotItemEstoque(registro.item, registro.quantidade));
  await criarOrcamento({ nome: value("#nomeOrcamento") || "Orçamento", clienteNomeSnapshot: value("#clienteNome"), valorHora: value("#valorHora"), duracaoSessao: value("#duracaoSessao"), percentualMargemLucro: value("#margem"), percentualDesconto: value("#desconto"), custoMaterialSnapshot: totais.materiaisTotal, custoMaoObraSnapshot: totais.maoObra, valorFinalSnapshot: totais.final, tamanhoTatuagem: value("#tamanhoTatuagem"), localCorpo: value("#localCorpo"), coresTatuagem: value("#coresTatuagem"), complexidade: value("#complexidade"), observacoesCliente: value("#observacoesCliente"), imagemReferencia }, itens);
  mostrarStatus(document.querySelector("#statusOrcamento"), "Orçamento salvo no IndexedDB.");
}

async function gerarPdfOrcamento() {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) return mostrarStatus(document.querySelector("#statusOrcamento"), "Biblioteca PDF ainda não carregou. Recarregue a página e tente novamente.");
  const totais = obterTotais();
  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const margemX = 42;
  let y = 46;
  doc.setFillColor(54, 10, 117);
  doc.roundedRect(margemX, y, 512, 76, 18, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(value("#studioName") || "MiShiro Tattoo", margemX + 22, y + 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Proposta de tatuagem • ${new Date().toLocaleDateString("pt-BR")}`, margemX + 22, y + 54);
  y += 112;
  doc.setTextColor(19, 15, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(value("#nomeOrcamento") || "Orçamento", margemX, y); y += 22;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(`Cliente: ${value("#clienteNome") || "Não informado"}`, margemX, y); y += 18;
  doc.text(`Tamanho/local: ${value("#tamanhoTatuagem") || "A definir"} · ${value("#localCorpo") || "local a definir"}`, margemX, y); y += 18;
  doc.text(`Cores/complexidade: ${value("#coresTatuagem") || "A definir"} · ${document.querySelector("#complexidade")?.selectedOptions?.[0]?.textContent || ""}`, margemX, y); y += 22;
  if (imagemReferencia) {
    try { doc.addImage(imagemReferencia, detectarFormatoImagem(imagemReferencia), margemX, y, 170, 120, undefined, "FAST"); y += 138; } catch { doc.text("Imagem de referência anexada, mas não pôde ser renderizada no PDF.", margemX, y); y += 18; }
  }
  doc.setFont("helvetica", "bold"); doc.text("Materiais estimados", margemX, y); y += 18; doc.setFont("helvetica", "normal");
  materiais.forEach((registro) => { const linha = `${registro.item.nome} — ${registro.quantidade} ${registro.item.unidadeMedida || "un"} — ${formatarMoeda(calcularCustoUnitario(registro.item) * registro.quantidade)}`; doc.text(linha.slice(0, 92), margemX, y); y += 16; if (y > 720) { doc.addPage(); y = 48; } });
  y += 12; doc.setFont("helvetica", "bold"); doc.text("Resumo financeiro", margemX, y); y += 20; doc.setFont("helvetica", "normal");
  doc.text(`Materiais: ${formatarMoeda(totais.materiaisTotal)}`, margemX, y); y += 16;
  doc.text(`Mão de obra: ${formatarMoeda(totais.maoObra)} (${totais.duracao || 0}h x ${formatarMoeda(totais.valorHora)})`, margemX, y); y += 16;
  doc.text(`Margem/fixos: ${totais.margem}% · Desconto: ${totais.desconto}% (${formatarMoeda(totais.discountAmount)})`, margemX, y); y += 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(`Valor final: ${formatarMoeda(totais.final)}`, margemX, y + 10);
  doc.save(`${(value("#nomeOrcamento") || "orcamento-mishiro").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}

async function copiarResumo() {
  const totais = obterTotais();
  const texto = `MiShiro Tattoo\nCliente: ${value("#clienteNome") || "Não informado"}\nOrçamento: ${value("#nomeOrcamento") || "Orçamento"}\nTamanho: ${value("#tamanhoTatuagem") || "A definir"}\nValor estimado: ${formatarMoeda(totais.final)}`;
  await navigator.clipboard?.writeText(texto);
  mostrarStatus(document.querySelector("#statusOrcamento"), "Resumo copiado.");
}

function aplicarPreset(tipo) {
  const presets = { minima: [150, 1, 30], pequena: [170, 2, 30], media: [190, 4, 35], grande: [220, 6, 40] };
  const [hora, duracao, margem] = presets[tipo] || presets.minima;
  setValue("#valorHora", hora); setValue("#duracaoSessao", duracao); setValue("#margem", margem); recalcular();
}

function limparFormulario() {
  document.querySelector("#formOrcamento")?.reset();
  materiais = [];
  imagemReferencia = "";
  const preview = document.querySelector("#previewImagem");
  if (preview) { preview.classList.add("is-empty"); preview.innerHTML = `<span>Nenhuma imagem adicionada</span>`; }
  renderMateriais();
  recalcular();
}

function encontrarItem(id) { return itensEstoque.find((item) => item.id === id); }
function lerArquivoComoDataUrl(arquivo) { return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.addEventListener("load", () => resolver(leitor.result)); leitor.addEventListener("error", () => rejeitar(leitor.error)); leitor.readAsDataURL(arquivo); }); }
function detectarFormatoImagem(dataUrl) { if (String(dataUrl).startsWith("data:image/png")) return "PNG"; if (String(dataUrl).startsWith("data:image/webp")) return "WEBP"; return "JPEG"; }
function value(sel) { return document.querySelector(sel)?.value?.trim() || ""; }
function setValue(sel, val) { const el = document.querySelector(sel); if (el) el.value = val; }
function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }
