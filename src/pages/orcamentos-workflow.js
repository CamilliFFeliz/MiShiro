import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, mostrarStatus, vazio, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularCustoUnitario, criarSnapshotItemEstoque, garantirEstoqueInicial } from "../services/estoque-service.js";
import { criarOrcamento, atualizarOrcamento, obterOrcamento, listarItensOrcamento } from "../services/orcamentos-service.js";
import { CATEGORY_ALL, CATEGORY_OPTIONAL, CATEGORY_ORDER, getItemSpecification, getMeasureLabel, getMinimumQuantity, sanitizeUsageQuantity } from "../shared/stock-catalog.js";
import { exportarPdfCliente, exportarPdfEstudio } from "./orcamentos-export.js";

const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;
let estoque = [];
let materiais = [];
let imagemReferencia = "";
let termo = "";
let categoria = CATEGORY_ALL;
let orcamentoEmEdicao = null;

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta do cliente" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  await garantirEstoqueInicial();
  estoque = await listarItensEstoque();
  vincularEventos();
  renderizarFiltros();
  renderizarPicker();
  await carregarEdicao();
  renderizarMateriais();
  recalcular();
  atualizarIcones();
}

function vincularEventos() {
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvar);
  document.querySelector("#formOrcamento")?.addEventListener("input", recalcular);
  document.querySelector("#imagemReferencia")?.addEventListener("change", carregarImagem);
  document.querySelector("#budgetSearchInput")?.addEventListener("input", (evento) => { termo = evento.target.value.toLowerCase(); renderizarPicker(); });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => { termo = ""; definirValor("#budgetSearchInput", ""); renderizarPicker(); });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-budget-category]");
    if (!botao) return;
    categoria = botao.dataset.budgetCategory;
    renderizarFiltros();
    renderizarPicker();
  });
  document.querySelector("#stockPickerList")?.addEventListener("click", adicionarDoPicker);
  document.querySelector("#listaMateriais")?.addEventListener("click", removerMaterial);
  document.querySelector("#listaMateriais")?.addEventListener("change", alterarQuantidade);
  document.querySelector("#gerarPdfCliente")?.addEventListener("click", gerarCliente);
  document.querySelector("#gerarPdfEstudio")?.addEventListener("click", gerarEstudio);
  document.querySelector("#limparOrcamento")?.addEventListener("click", limpar);
}

async function carregarEdicao() {
  const id = new URLSearchParams(window.location.search).get("editar");
  if (!id) return;
  const [orcamento, itens] = await Promise.all([obterOrcamento(id), listarItensOrcamento(id)]);
  if (!orcamento) return;
  orcamentoEmEdicao = orcamento;
  definirValor("#orcamentoIdEdicao", id);
  preencher(orcamento);
  const mapa = new Map(estoque.map((item) => [item.id, item]));
  materiais = itens.map((snapshot) => ({
    id: snapshot.id,
    quantidade: normalizarNumero(snapshot.quantidadeUsada),
    item: mapa.get(snapshot.itemEstoqueId) || {
      id: snapshot.itemEstoqueId,
      nome: snapshot.nomeItemSnapshot || "Item removido do estoque",
      categoria: snapshot.categoriaSnapshot || "Sem categoria",
      unidadeMedida: snapshot.unidadeMedidaSnapshot || "un",
      precoEmbalagem: snapshot.custoUnitarioSnapshot || 0,
      quantidadeEmbalagem: 1,
      quantidadeAtual: 0,
      quantidadeMinima: 0
    }
  }));
  imagemReferencia = orcamento.imagemReferencia || "";
  atualizarPreview();
  const titulo = document.querySelector("#pageHeading");
  if (titulo) titulo.textContent = "Editar orçamento";
  status("Proposta carregada para edição.");
}

function preencher(orcamento) {
  const campos = {
    "#clienteNome": orcamento.clienteNomeSnapshot,
    "#clienteIdade": orcamento.clienteIdade,
    "#clienteTelefone": orcamento.clienteTelefone,
    "#clienteEmail": orcamento.clienteEmail,
    "#horarioPreferencial": orcamento.horarioPreferencial,
    "#nomeOrcamento": orcamento.nome,
    "#clienteAlergias": orcamento.clienteAlergias,
    "#clienteObservacoes": orcamento.clienteObservacoes,
    "#tamanhoTatuagem": orcamento.tamanhoTatuagem,
    "#localCorpo": orcamento.localCorpo,
    "#complexidade": orcamento.complexidade || "Simples",
    "#coresTatuagem": orcamento.coresTatuagem,
    "#observacoesCliente": orcamento.observacoesCliente,
    "#valorHora": orcamento.valorHora,
    "#duracaoSessao": orcamento.duracaoSessao,
    "#margem": orcamento.percentualMargemLucro,
    "#desconto": orcamento.percentualDesconto
  };
  Object.entries(campos).forEach(([seletor, valor]) => definirValor(seletor, valor ?? ""));
}

function renderizarFiltros() {
  const alvo = document.querySelector("#budgetCategoryFilters");
  if (!alvo) return;
  alvo.innerHTML = CATEGORY_ORDER.map((nome) => `<button class="filter-chip ${nome === categoria ? "is-active" : ""}" type="button" data-budget-category="${escapar(nome)}">${escapar(nome)}</button>`).join("");
}

function renderizarPicker() {
  const alvo = document.querySelector("#stockPickerList");
  if (!alvo) return;
  const lista = estoque.filter((item) => {
    const pesquisa = [item.categoria, item.nome, item.marca, item.linhaTipo, item.numeracao, item.cor, getItemSpecification(item)].join(" ").toLowerCase();
    return (!termo || pesquisa.includes(termo)) && (categoria === CATEGORY_ALL || item.categoria === categoria);
  });
  alvo.innerHTML = lista.length ? lista.map((item) => {
    const quantidade = getMinimumQuantity(item);
    return `<article class="picker-card" data-item-id="${escapar(item.id)}"><div class="picker-info"><strong>${escapar(item.nome)}</strong><span>${escapar(item.categoria)} · ${escapar(getItemSpecification(item) || "Sem especificação")}</span><small>${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(getMeasureLabel(item.unidadeMedida))}</small></div><div class="picker-actions"><label class="stepper-field"><span>Qtd.</span><input data-picker-quantity inputmode="decimal" value="${quantidade}" /></label><button class="button button-primary" type="button" data-add-item>Adicionar</button></div></article>`;
  }).join("") : vazio("Nenhum item encontrado.");
}

function adicionarDoPicker(evento) {
  const botao = evento.target.closest("[data-add-item]");
  if (!botao) return;
  const card = botao.closest("[data-item-id]");
  const item = estoque.find((registro) => registro.id === card?.dataset.itemId);
  if (!item) return;
  const entrada = card.querySelector("[data-picker-quantity]")?.value;
  const quantidade = sanitizeUsageQuantity(item, entrada, getMinimumQuantity(item), normalizarNumero);
  const existente = materiais.find((registro) => registro.item.id === item.id);
  if (existente) existente.quantidade = normalizarNumero(existente.quantidade) + quantidade;
  else materiais.push({ id: `material-${crypto.randomUUID?.() || Date.now()}`, item, quantidade });
  renderizarMateriais();
  recalcular();
}

function renderizarMateriais() {
  const alvo = document.querySelector("#listaMateriais");
  if (!alvo) return;
  if (!materiais.length) {
    alvo.innerHTML = "<p class=\"empty-inline\">Nenhum material ou opcional adicionado.</p>";
    return;
  }
  alvo.innerHTML = materiais.map((registro, indice) => {
    const valor = calcularCustoUnitario(registro.item) * normalizarNumero(registro.quantidade);
    const opcional = registro.item.categoria === CATEGORY_OPTIONAL ? " • exibido no PDF do cliente" : "";
    return `<article class="budget-material-row" data-cart-index="${indice}"><div><strong>${escapar(registro.item.nome)}</strong><small>${escapar(registro.item.categoria)}${opcional}</small></div><div class="budget-material-row__meta"><input data-cart-quantity inputmode="decimal" value="${escapar(registro.quantidade)}" aria-label="Quantidade usada" /><span>${formatarMoeda(valor)}</span><button class="icon-button" type="button" data-remove-item aria-label="Remover item"><i data-lucide="x"></i></button></div></article>`;
  }).join("");
  atualizarIcones();
}

function removerMaterial(evento) {
  const botao = evento.target.closest("[data-remove-item]");
  if (!botao) return;
  const indice = Number(botao.closest("[data-cart-index]")?.dataset.cartIndex);
  if (Number.isInteger(indice)) materiais.splice(indice, 1);
  renderizarMateriais();
  recalcular();
}

function alterarQuantidade(evento) {
  if (!evento.target.matches("[data-cart-quantity]")) return;
  const indice = Number(evento.target.closest("[data-cart-index]")?.dataset.cartIndex);
  const registro = materiais[indice];
  if (!registro) return;
  const quantidade = sanitizeUsageQuantity(registro.item, evento.target.value, 0, normalizarNumero);
  if (quantidade <= 0) materiais.splice(indice, 1); else registro.quantidade = quantidade;
  renderizarMateriais();
  recalcular();
}

async function carregarImagem(evento) {
  const arquivo = evento.target.files?.[0];
  if (!arquivo) return;
  if (!arquivo.type.startsWith("image/")) return status("Selecione uma imagem válida.");
  if (arquivo.size > LIMITE_IMAGEM_BYTES) {
    evento.target.value = "";
    return status("A imagem deve ter no máximo 2 MB.");
  }
  imagemReferencia = await comoDataUrl(arquivo);
  atualizarPreview();
}

function atualizarPreview() {
  const preview = document.querySelector("#previewImagem");
  if (!preview) return;
  if (!imagemReferencia) {
    preview.className = "reference-art-card is-empty";
    preview.innerHTML = "<span>Adicione uma referência visual da arte</span>";
    return;
  }
  preview.className = "reference-art-card";
  preview.innerHTML = `<img src="${imagemReferencia}" alt="Referência visual da tatuagem" />`;
}

function totais() {
  const materiaisTotal = materiais.reduce((total, registro) => total + calcularCustoUnitario(registro.item) * normalizarNumero(registro.quantidade), 0);
  const valorHora = normalizarNumero(valor("#valorHora"));
  const duracao = normalizarNumero(valor("#duracaoSessao"));
  const margem = normalizarNumero(valor("#margem"));
  const desconto = normalizarNumero(valor("#desconto"));
  const maoObra = valorHora * duracao;
  const base = materiaisTotal + maoObra;
  const lucro = base * margem / 100;
  const subtotal = base + lucro;
  const descontoValor = subtotal * desconto / 100;
  return { materiaisTotal, valorHora, duracao, margem, desconto, maoObra, lucro, subtotal, descontoValor, final: Math.max(subtotal - descontoValor, 0) };
}

function recalcular() {
  const atual = totais();
  texto("#totalMateriais", formatarMoeda(atual.materiaisTotal));
  texto("#totalMaoObra", formatarMoeda(atual.maoObra));
  texto("#subtotalOrcamento", formatarMoeda(atual.subtotal));
  texto("#valorDesconto", formatarMoeda(atual.descontoValor));
  texto("#valorFinal", formatarMoeda(atual.final));
}

async function salvar(evento) {
  evento.preventDefault();
  const formulario = document.querySelector("#formOrcamento");
  if (!formulario?.reportValidity()) return;
  const atual = totais();
  const itens = materiais.filter((registro) => normalizarNumero(registro.quantidade) > 0).map((registro) => criarSnapshotItemEstoque(registro.item, registro.quantidade));
  const dados = dadosOrcamento(atual);
  try {
    if (orcamentoEmEdicao) await atualizarOrcamento(orcamentoEmEdicao.id, dados, itens);
    else orcamentoEmEdicao = await criarOrcamento(dados, itens);
    status(orcamentoEmEdicao?.id ? "Orçamento salvo e disponível na etapa Aguardando aprovação." : "Orçamento atualizado com sucesso.");
  } catch (erro) {
    status(erro.message || "Não foi possível salvar o orçamento.");
  }
}

function dadosOrcamento(atual) {
  return {
    nome: valor("#nomeOrcamento") || "Orçamento",
    clienteNomeSnapshot: valor("#clienteNome"), clienteIdade: valor("#clienteIdade"), clienteTelefone: valor("#clienteTelefone"), clienteEmail: valor("#clienteEmail"), clienteAlergias: valor("#clienteAlergias"), clienteObservacoes: valor("#clienteObservacoes"), horarioPreferencial: valor("#horarioPreferencial"),
    tamanhoTatuagem: valor("#tamanhoTatuagem"), localCorpo: valor("#localCorpo"), complexidade: valor("#complexidade"), coresTatuagem: valor("#coresTatuagem"), observacoesCliente: valor("#observacoesCliente"), imagemReferencia,
    valorHora: atual.valorHora, duracaoSessao: atual.duracao, percentualMargemLucro: atual.margem, percentualDesconto: atual.desconto,
    custoMaterialSnapshot: atual.materiaisTotal, custoMaoObraSnapshot: atual.maoObra, subtotalSnapshot: atual.subtotal, descontoValorSnapshot: atual.descontoValor, lucroValorSnapshot: atual.lucro, valorFinalSnapshot: atual.final
  };
}

async function gerarCliente() {
  try { await exportarPdfCliente(pdfDados()); } catch (erro) { status(erro.message || "Não foi possível gerar o PDF do cliente."); }
}

async function gerarEstudio() {
  try { await exportarPdfEstudio(pdfDados()); } catch (erro) { status(erro.message || "Não foi possível gerar o PDF do estúdio."); }
}

function pdfDados() {
  const atual = totais();
  return {
    dados: { nome: valor("#nomeOrcamento"), clienteNome: valor("#clienteNome"), idade: valor("#clienteIdade"), telefone: valor("#clienteTelefone"), email: valor("#clienteEmail"), alergias: valor("#clienteAlergias"), tamanho: valor("#tamanhoTatuagem"), local: valor("#localCorpo"), complexidade: valor("#complexidade"), observacoesArte: valor("#observacoesCliente"), observacoesCliente: valor("#clienteObservacoes") },
    totais: atual,
    materiais: materiais.map((registro) => ({ ...registro, valor: calcularCustoUnitario(registro.item) * normalizarNumero(registro.quantidade) })),
    imagemReferencia
  };
}

function limpar() {
  document.querySelector("#formOrcamento")?.reset();
  materiais = [];
  imagemReferencia = "";
  orcamentoEmEdicao = null;
  atualizarPreview();
  renderizarMateriais();
  recalcular();
  status("Formulário limpo.");
}

function valor(seletor) { return document.querySelector(seletor)?.value?.trim() || ""; }
function definirValor(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.value = conteudo; }
function texto(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.textContent = conteudo; }
function status(mensagem) { mostrarStatus(document.querySelector("#statusOrcamento"), mensagem); }
function comoDataUrl(arquivo) { return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.onload = () => resolver(leitor.result); leitor.onerror = () => rejeitar(leitor.error); leitor.readAsDataURL(arquivo); }); }
