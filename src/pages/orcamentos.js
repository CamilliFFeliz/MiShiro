import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, mostrarStatus, vazio, atualizarIcones } from "../shared/ui.js";
import { lerLocalJson, salvarLocalJson } from "../shared/storage.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularCustoUnitario, criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento } from "../services/orcamentos-service.js";

const PERFIL_KEY = "MISHIRO_PERFIL_ESTUDIO";
let itensEstoque = [];
let materiais = [];

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta do cliente" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  carregarPerfil();
  itensEstoque = await listarItensEstoque();
  preencherItens();
  vincularEventos();
  recalcular();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#adicionarMaterial")?.addEventListener("click", adicionarMaterial);
  document.querySelector("#formOrcamento")?.addEventListener("input", recalcular);
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvarOrcamento);
  document.querySelector("#copiarResumo")?.addEventListener("click", copiarResumo);
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
  select.innerHTML = itensEstoque.length ? itensEstoque.map((item) => `<option value="${item.id}">${escapar(item.nome)} · ${escapar(item.categoria)} · ${formatarMoeda(calcularCustoUnitario(item))}/${escapar(item.unidadeMedida)}</option>`).join("") : `<option value="">Cadastre itens no estoque primeiro</option>`;
}

function adicionarMaterial() {
  const id = document.querySelector("#itemEstoqueSelect")?.value;
  const quantidade = Math.max(normalizarNumero(document.querySelector("#quantidadeUsada")?.value || 1), 0);
  const item = itensEstoque.find((registro) => registro.id === id);
  if (!item || quantidade <= 0) return;
  materiais.push({ item, quantidade });
  document.querySelector("#quantidadeUsada").value = "";
  renderMateriais();
  recalcular();
}

function renderMateriais() {
  const lista = document.querySelector("#listaMateriais");
  lista.innerHTML = materiais.length ? materiais.map((registro, index) => `<article class="material-card"><strong>${escapar(registro.item.nome)}</strong><span>${registro.quantidade} ${escapar(registro.item.unidadeMedida)} · ${formatarMoeda(calcularCustoUnitario(registro.item) * registro.quantidade)}</span><button class="button button-ghost" type="button" data-remover-material="${index}">Remover</button></article>`).join("") : vazio("Nenhum material adicionado ainda.");
  lista.querySelectorAll("[data-remover-material]").forEach((botao) => botao.addEventListener("click", () => { materiais.splice(Number(botao.dataset.removerMaterial), 1); renderMateriais(); recalcular(); }));
}

function obterTotais() {
  const materiaisTotal = materiais.reduce((total, registro) => total + calcularCustoUnitario(registro.item) * registro.quantidade, 0);
  const valorHora = normalizarNumero(document.querySelector("#valorHora")?.value);
  const duracao = normalizarNumero(document.querySelector("#duracaoSessao")?.value);
  const margem = normalizarNumero(document.querySelector("#margem")?.value);
  const desconto = normalizarNumero(document.querySelector("#desconto")?.value);
  const maoObra = valorHora * duracao;
  const subtotal = materiaisTotal + maoObra;
  const comMargem = subtotal * (1 + margem / 100);
  const final = Math.max(comMargem * (1 - desconto / 100), 0);
  return { materiaisTotal, maoObra, subtotal: comMargem, final };
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
  const itens = materiais.map((registro) => criarSnapshotItemEstoque(registro.item, registro.quantidade));
  await criarOrcamento({ nome: value("#nomeOrcamento") || "Orçamento", clienteNomeSnapshot: value("#clienteNome"), valorHora: value("#valorHora"), duracaoSessao: value("#duracaoSessao"), percentualMargemLucro: value("#margem"), percentualDesconto: value("#desconto"), custoMaterialSnapshot: totais.materiaisTotal, custoMaoObraSnapshot: totais.maoObra, valorFinalSnapshot: totais.final, tamanhoTatuagem: value("#tamanhoTatuagem"), coresTatuagem: value("#coresTatuagem"), observacoesCliente: value("#observacoesCliente") }, itens);
  mostrarStatus(document.querySelector("#statusOrcamento"), "Orçamento salvo no IndexedDB.");
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
function limparFormulario() { document.querySelector("#formOrcamento")?.reset(); materiais = []; renderMateriais(); recalcular(); }
function value(sel) { return document.querySelector(sel)?.value?.trim() || ""; }
function setValue(sel, val) { const el = document.querySelector(sel); if (el) el.value = val; }
function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }
