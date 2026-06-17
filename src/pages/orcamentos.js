import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, mostrarStatus, vazio, atualizarIcones } from "../shared/ui.js";
import { lerLocalJson, salvarLocalJson } from "../shared/storage.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularCustoUnitario, criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento } from "../services/orcamentos-service.js";

const PERFIL_KEY = "MISHIRO_PERFIL_ESTUDIO";
const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;
let itensEstoque = [];
let materiais = [];
let imagemReferencia = "";

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta do cliente" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  carregarPerfil();
  itensEstoque = await listarItensEstoque();
  preencherItens();
  vincularEventos();
  renderMateriais();
  renderDetalheItemSelecionado();
  recalcular();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#adicionarMaterial")?.addEventListener("click", adicionarMaterial);
  document.querySelector("#itemEstoqueSelect")?.addEventListener("change", renderDetalheItemSelecionado);
  document.querySelector("#imagemReferencia")?.addEventListener("change", carregarImagemReferencia);
  document.querySelector("#formOrcamento")?.addEventListener("input", recalcular);
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvarOrcamento);
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

function preencherItens() {
  const select = document.querySelector("#itemEstoqueSelect");
  if (!select) return;
  select.innerHTML = itensEstoque.length
    ? itensEstoque.map((item) => `<option value="${item.id}">${escapar(item.nome)} · ${escapar(item.categoria)} · ${formatarMoeda(calcularCustoUnitario(item))}/${escapar(item.unidadeMedida)}</option>`).join("")
    : `<option value="">Cadastre itens no estoque primeiro</option>`;
}

function renderDetalheItemSelecionado() {
  const detalhe = document.querySelector("#detalheItemSelecionado");
  const item = obterItemSelecionado();
  if (!detalhe) return;

  if (!item) {
    detalhe.textContent = "Selecione um item para ver o custo calculado por unidade de uso.";
    return;
  }

  const custo = calcularCustoUnitario(item);
  detalhe.innerHTML = `<strong>${escapar(item.nome)}</strong> custa <strong>${formatarMoeda(custo)}</strong> por ${escapar(item.unidadeMedida || "un")}. Estoque atual: <strong>${normalizarNumero(item.quantidadeAtual)}</strong>. Embalagem: ${normalizarNumero(item.quantidadeEmbalagem)} ${escapar(item.unidadeMedida || "un")} por ${formatarMoeda(item.precoEmbalagem)}.`;
}

function adicionarMaterial() {
  const item = obterItemSelecionado();
  const quantidade = Math.max(normalizarNumero(document.querySelector("#quantidadeUsada")?.value || 1), 0);
  if (!item || quantidade <= 0) return;

  const existente = materiais.find((registro) => registro.item.id === item.id);
  if (existente) {
    existente.quantidade = arredondar(existente.quantidade + quantidade);
  } else {
    materiais.push({ item, quantidade });
  }

  document.querySelector("#quantidadeUsada").value = "";
  renderMateriais();
  recalcular();
}

function renderMateriais() {
  const lista = document.querySelector("#listaMateriais");
  if (!lista) return;

  lista.innerHTML = materiais.length
    ? materiais.map((registro, index) => renderItemCarrinho(registro, index)).join("")
    : vazio("Seu carrinho de materiais ainda está vazio.");

  lista.querySelectorAll("[data-remover-material]").forEach((botao) => botao.addEventListener("click", () => {
    materiais.splice(Number(botao.dataset.removerMaterial), 1);
    renderMateriais();
    recalcular();
  }));

  lista.querySelectorAll("[data-quantidade-material]").forEach((input) => input.addEventListener("input", () => {
    const index = Number(input.dataset.quantidadeMaterial);
    materiais[index].quantidade = Math.max(normalizarNumero(input.value), 0);
    recalcular();
    atualizarSubtotalLinha(index);
  }));
}

function renderItemCarrinho(registro, index) {
  const custoUnitario = calcularCustoUnitario(registro.item);
  const subtotal = custoUnitario * registro.quantidade;
  return `<article class="cart-card-row" data-cart-row="${index}">
    <div class="cart-card-row__title">
      <strong>${escapar(registro.item.nome)}</strong>
      <span>${escapar(registro.item.categoria)} · ${formatarMoeda(custoUnitario)} por ${escapar(registro.item.unidadeMedida || "un")}</span>
    </div>
    <div class="cart-card-row__qty">
      <label for="qtd-material-${index}">Qtd. usada</label>
      <input id="qtd-material-${index}" data-quantidade-material="${index}" inputmode="decimal" value="${registro.quantidade}" />
    </div>
    <div class="cart-card-row__total">
      <span data-subtotal-material="${index}">${formatarMoeda(subtotal)}</span>
      <small>Subtotal</small>
      <button class="button button-ghost" type="button" data-remover-material="${index}">Remover</button>
    </div>
  </article>`;
}

function atualizarSubtotalLinha(index) {
  const alvo = document.querySelector(`[data-subtotal-material='${index}']`);
  const registro = materiais[index];
  if (alvo && registro) alvo.textContent = formatarMoeda(calcularCustoUnitario(registro.item) * registro.quantidade);
}

async function carregarImagemReferencia(evento) {
  const arquivo = evento.target.files?.[0];
  const preview = document.querySelector("#previewImagem");
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    mostrarStatus(document.querySelector("#statusOrcamento"), "Selecione uma imagem válida.");
    return;
  }

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
  const subtotalSemMargem = materiaisTotal + maoObra;
  const subtotal = subtotalSemMargem * (1 + margem / 100);
  const final = Math.max(subtotal * (1 - desconto / 100), 0);
  return { materiaisTotal, maoObra, subtotal, final, margem, desconto, valorHora, duracao };
}

function recalcular() {
  const totais = obterTotais();
  setText("#totalMateriais", formatarMoeda(totais.materiaisTotal));
  setText("#totalMaoObra", formatarMoeda(totais.maoObra));
  setText("#subtotalOrcamento", formatarMoeda(totais.subtotal));
  setText("#valorFinal", formatarMoeda(totais.final));
}

async function salvarOrcamento(evento) {
  evento.preventDefault();
  const perfil = { nomeEstudio: value("#studioName"), nomeArtista: value("#artistName"), contatoEstudio: value("#studioContact"), sinalPadrao: value("#bookingSignal") };
  salvarLocalJson(PERFIL_KEY, perfil);
  const totais = obterTotais();
  const itens = materiais.filter((registro) => normalizarNumero(registro.quantidade) > 0).map((registro) => criarSnapshotItemEstoque(registro.item, registro.quantidade));
  await criarOrcamento({ nome: value("#nomeOrcamento") || "Orçamento", clienteNomeSnapshot: value("#clienteNome"), valorHora: value("#valorHora"), duracaoSessao: value("#duracaoSessao"), percentualMargemLucro: value("#margem"), percentualDesconto: value("#desconto"), custoMaterialSnapshot: totais.materiaisTotal, custoMaoObraSnapshot: totais.maoObra, valorFinalSnapshot: totais.final, tamanhoTatuagem: value("#tamanhoTatuagem"), coresTatuagem: value("#coresTatuagem"), observacoesCliente: value("#observacoesCliente"), imagemReferencia }, itens);
  mostrarStatus(document.querySelector("#statusOrcamento"), "Orçamento salvo no IndexedDB.");
}

async function gerarPdfOrcamento() {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) {
    mostrarStatus(document.querySelector("#statusOrcamento"), "Biblioteca PDF ainda não carregou. Recarregue a página e tente novamente.");
    return;
  }

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
  doc.text(value("#nomeOrcamento") || "Orçamento", margemX, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Cliente: ${value("#clienteNome") || "Não informado"}`, margemX, y);
  y += 18;
  doc.text(`Tamanho/local: ${value("#tamanhoTatuagem") || "A definir"} · ${value("#localCorpo") || "local a definir"}`, margemX, y);
  y += 18;
  doc.text(`Cores/complexidade: ${value("#coresTatuagem") || "A definir"} · ${document.querySelector("#complexidade")?.selectedOptions?.[0]?.textContent || ""}`, margemX, y);
  y += 22;

  if (imagemReferencia) {
    try {
      doc.addImage(imagemReferencia, detectarFormatoImagem(imagemReferencia), margemX, y, 170, 120, undefined, "FAST");
      y += 138;
    } catch {
      doc.text("Imagem de referência anexada, mas não pôde ser renderizada no PDF.", margemX, y);
      y += 18;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.text("Materiais estimados", margemX, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  materiais.forEach((registro) => {
    const linha = `${registro.item.nome} — ${registro.quantidade} ${registro.item.unidadeMedida || "un"} — ${formatarMoeda(calcularCustoUnitario(registro.item) * registro.quantidade)}`;
    doc.text(linha.slice(0, 92), margemX, y);
    y += 16;
    if (y > 720) { doc.addPage(); y = 48; }
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Resumo financeiro", margemX, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.text(`Materiais: ${formatarMoeda(totais.materiaisTotal)}`, margemX, y); y += 16;
  doc.text(`Mão de obra: ${formatarMoeda(totais.maoObra)} (${totais.duracao || 0}h x ${formatarMoeda(totais.valorHora)})`, margemX, y); y += 16;
  doc.text(`Margem/fixos: ${totais.margem}% · Desconto: ${totais.desconto}%`, margemX, y); y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(`Valor final: ${formatarMoeda(totais.final)}`, margemX, y + 10);

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
  if (preview) {
    preview.classList.add("is-empty");
    preview.innerHTML = `<span>Nenhuma imagem adicionada</span>`;
  }
  renderMateriais();
  renderDetalheItemSelecionado();
  recalcular();
}

function obterItemSelecionado() {
  const id = document.querySelector("#itemEstoqueSelect")?.value;
  return itensEstoque.find((registro) => registro.id === id);
}

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.addEventListener("load", () => resolver(leitor.result));
    leitor.addEventListener("error", () => rejeitar(leitor.error));
    leitor.readAsDataURL(arquivo);
  });
}

function detectarFormatoImagem(dataUrl) {
  if (String(dataUrl).startsWith("data:image/png")) return "PNG";
  if (String(dataUrl).startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function value(sel) { return document.querySelector(sel)?.value?.trim() || ""; }
function setValue(sel, val) { const el = document.querySelector(sel); if (el) el.value = val; }
function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }
function arredondar(valor) { return Math.round((normalizarNumero(valor) + Number.EPSILON) * 100) / 100; }
