import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, normalizarNumero } from "../shared/formatters.js";
import { escapar, atualizarIcones, mostrarStatus } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { listarItensEstoque, garantirEstoqueInicial, calcularCustoUnitario, criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento, atualizarOrcamento, obterOrcamento, listarItensOrcamento } from "../services/orcamentos-service.js";
import { CATEGORY_ALL, CATEGORY_OPTIONAL, CATEGORY_ORDER, getItemSpecification, getMeasureSuffix } from "../shared/stock-catalog.js";
import { criarDocumentoMiShiro, adicionarDetalhes, adicionarLista, adicionarResumoFinanceiro, adicionarTitulo, finalizarDocumento } from "../shared/pdf-theme.js";

const LIMITE_REFERENCIAS = 6;
const estado = { estoque: [], carrinho: new Map(), categoria: CATEGORY_ALL, termo: "", referencias: [], orcamento: null };

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  await garantirEstoqueInicial();
  estado.estoque = (await listarItensEstoque()).filter((item) => !item.arquivadoEm);
  vincularEventos();
  await carregarEdicao();
  renderizar();
}

function vincularEventos() {
  document.querySelector("#budgetSearchInput")?.addEventListener("input", (evento) => { estado.termo = evento.target.value.toLowerCase().trim(); renderizar(); });
  document.querySelector("#clearBudgetSearchButton")?.addEventListener("click", () => { estado.termo = ""; const campo = document.querySelector("#budgetSearchInput"); if (campo) campo.value = ""; renderizar(); });
  document.querySelector("#budgetCategoryFilters")?.addEventListener("click", (evento) => { const botao = evento.target.closest("[data-category]"); if (!botao) return; estado.categoria = botao.dataset.category || CATEGORY_ALL; renderizar(); });
  document.querySelector("#stockPickerList")?.addEventListener("click", (evento) => alterarPorControle(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("click", (evento) => alterarPorControle(evento, "data-cart-id"));
  document.querySelector("#stockPickerList")?.addEventListener("change", (evento) => alterarPorCampo(evento, "data-stock-id"));
  document.querySelector("#listaMateriais")?.addEventListener("change", (evento) => alterarPorCampo(evento, "data-cart-id"));
  document.querySelector("#formOrcamento")?.addEventListener("input", (evento) => { if (evento.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) atualizarResumo(); });
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvar);
  document.querySelector("#limparOrcamento")?.addEventListener("click", limpar);
  document.querySelector("#imagemReferencia")?.addEventListener("change", adicionarReferencias);
  document.querySelector("#listaReferenciasArte")?.addEventListener("click", tratarReferencia);
  document.querySelector("#referenciaModal")?.addEventListener("click", (evento) => { if (evento.target === evento.currentTarget || evento.target.closest("[data-close-reference]")) evento.currentTarget.close(); });
  document.querySelector("#gerarPdfCliente")?.addEventListener("click", () => gerarPdf("cliente"));
  document.querySelector("#gerarPdfEstudio")?.addEventListener("click", () => gerarPdf("estudio"));
}

function renderizar() {
  renderizarFiltros(); renderizarEstoque(); renderizarCarrinho(); renderizarReferencias(); atualizarResumo(); atualizarIcones();
}

function renderizarFiltros() {
  const alvo = document.querySelector("#budgetCategoryFilters");
  if (alvo) alvo.innerHTML = CATEGORY_ORDER.map((categoria) => `<button type="button" class="ops-filter-chip ${categoria === estado.categoria ? "is-active" : ""}" data-category="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

function renderizarEstoque() {
  const alvo = document.querySelector("#stockPickerList");
  if (!alvo) return;
  const itens = estado.estoque.filter((item) => {
    const texto = [item.nome, item.categoria, item.marca, item.linhaTipo, item.cor, getItemSpecification(item)].join(" ").toLowerCase();
    return (estado.categoria === CATEGORY_ALL || item.categoria === estado.categoria) && (!estado.termo || texto.includes(estado.termo));
  });
  alvo.innerHTML = itens.length ? itens.map((item) => {
    const selecionada = quantidadeSelecionada(item.id); const disponivel = quantidadeDisponivel(item);
    return `<article class="ops-stock-item" data-stock-id="${escapar(item.id)}"><div class="ops-stock-item__title"><strong>${escapar(item.nome)}</strong><span class="ops-category-badge">${escapar(item.categoria)}</span></div><div class="ops-stock-item__meta"><span>${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(unidade(item))}</span><span>${escapar(getItemSpecification(item) || "Sem especificação adicional")}</span></div><div class="ops-stock-item__bottom"><div class="ops-stock-item__available"><span>Disponível</span><strong>${disponivel} ${escapar(unidade(item))}</strong></div>${stepper(selecionada, disponivel)}</div></article>`;
  }).join("") : '<p class="ops-empty">Nenhum item encontrado nesta busca.</p>';
}

function renderizarCarrinho() {
  const alvo = document.querySelector("#listaMateriais");
  if (!alvo) return;
  const registros = Array.from(estado.carrinho.values()).filter(({ quantidade }) => quantidade > 0);
  alvo.innerHTML = registros.length ? registros.map(({ item, quantidade }) => {
    const opcional = item.categoria === CATEGORY_OPTIONAL;
    return `<article class="ops-cart-row ${opcional ? "ops-cart-row--optional" : ""}" data-cart-id="${escapar(item.id)}"><div><strong>${escapar(item.nome)}</strong><small>${escapar(item.categoria)}${opcional ? " · opcional" : ""} · ${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(unidade(item))}</small></div>${stepper(quantidade, quantidadeDisponivel(item))}<strong class="ops-cart-row__subtotal">${formatarMoeda(calcularCustoUnitario(item) * quantidade)}</strong><button class="ops-cart-remove" type="button" data-cart-remove aria-label="Remover ${escapar(item.nome)} do carrinho">Remover</button></article>`;
  }).join("") : '<p class="ops-empty">O carrinho está vazio. Adicione itens do estoque quando necessário.</p>';
}

function stepper(quantidade, limite) {
  return `<div class="ops-stepper"><button type="button" data-step="decrease" aria-label="Diminuir quantidade" ${quantidade <= 0 ? "disabled" : ""}>−</button><input type="number" data-step-input inputmode="numeric" min="0" max="${limite}" step="1" value="${quantidade}" aria-label="Quantidade selecionada" /><button type="button" data-step="increase" aria-label="Aumentar quantidade" ${quantidade >= limite ? "disabled" : ""}>+</button></div>`;
}

function alterarPorControle(evento, atributo) {
  const linha = evento.target.closest(`[${atributo}]`); if (!linha) return;
  const id = linha.getAttribute(atributo);
  if (evento.target.closest("[data-cart-remove]")) return definirQuantidadePorId(id, 0);
  const botao = evento.target.closest("[data-step]"); if (!botao) return;
  definirQuantidadePorId(id, quantidadeSelecionada(id) + (botao.dataset.step === "increase" ? 1 : -1));
}
function alterarPorCampo(evento, atributo) {
  const campo = evento.target.closest("[data-step-input]"); if (!campo) return;
  definirQuantidadePorId(campo.closest(`[${atributo}]`)?.getAttribute(atributo), campo.value);
}
function definirQuantidadePorId(id, valor) {
  const item = estado.estoque.find((registro) => registro.id === id) || estado.carrinho.get(id)?.item;
  if (!item) return;
  const quantidade = Math.round(Math.max(0, normalizarNumero(valor)));
  const limite = quantidadeDisponivel(item);
  if (quantidade > limite) { mensagem(`A quantidade de ${item.nome} não pode superar o estoque disponível.`); return renderizar(); }
  if (quantidade === 0) estado.carrinho.delete(item.id); else estado.carrinho.set(item.id, { item, quantidade });
  renderizar();
}

function quantidadeDisponivel(item) {
  const atual = Math.max(0, normalizarNumero(item?.quantidadeAtual));
  return ["ml", "g", "m"].includes(item?.unidadeMedida || "un") ? Math.floor(atual * Math.max(1, normalizarNumero(item.quantidadeEmbalagem))) : Math.floor(atual);
}
function quantidadeSelecionada(id) { return estado.carrinho.get(id)?.quantidade || 0; }
function unidade(item) { return getMeasureSuffix(item?.unidadeMedida || "un"); }
function totais() {
  let materiais = 0, opcionais = 0;
  estado.carrinho.forEach(({ item, quantidade }) => { const subtotal = calcularCustoUnitario(item) * quantidade; if (item.categoria === CATEGORY_OPTIONAL) opcionais += subtotal; else materiais += subtotal; });
  const maoObra = normalizarNumero(valor("#valorHora")) * normalizarNumero(valor("#duracaoSessao"));
  const itens = materiais + opcionais; const subtotal = itens + maoObra; const descontoValor = subtotal * normalizarNumero(valor("#desconto")) / 100;
  return { materiais, opcionais, itens, maoObra, subtotal, descontoValor, margemValor: subtotal * normalizarNumero(valor("#margem")) / 100, valorFinal: Math.max(subtotal - descontoValor, 0) };
}
function atualizarResumo() {
  const total = totais();
  texto("#totalMateriais", formatarMoeda(total.itens)); texto("#totalMaoObra", formatarMoeda(total.maoObra)); texto("#subtotalOrcamento", formatarMoeda(total.subtotal)); texto("#valorDesconto", formatarMoeda(total.descontoValor)); texto("#valorFinal", formatarMoeda(total.valorFinal));
  texto("#cartTotalMateriais", formatarMoeda(total.materiais)); texto("#cartTotalOpcionais", formatarMoeda(total.opcionais)); texto("#cartTotalGeral", formatarMoeda(total.itens));
  return total;
}

async function carregarEdicao() {
  const id = new URLSearchParams(location.search).get("editar"); if (!id) return;
  const [orcamento, itens] = await Promise.all([obterOrcamento(id), listarItensOrcamento(id)]); if (!orcamento) return;
  estado.orcamento = orcamento; preencherFormulario(orcamento); estado.referencias = normalizarReferencias(orcamento); estado.carrinho.clear();
  const porId = new Map(estado.estoque.map((item) => [item.id, item]));
  itens.forEach((snapshot) => { const item = porId.get(snapshot.itemEstoqueId) || itemLegado(snapshot); const quantidade = Math.max(0, normalizarNumero(snapshot.quantidadeUsada)); const ajustada = Math.min(quantidade, quantidadeDisponivel(item)); if (ajustada > 0) estado.carrinho.set(item.id, { item, quantidade: ajustada }); });
  const titulo = document.querySelector("#pageHeading"); if (titulo) titulo.textContent = "Editar orçamento";
}

async function salvar(evento) {
  evento.preventDefault(); if (!validarObrigatorios()) return;
  const total = totais(); const status = evento.submitter?.dataset.saveMode || STATUS_ORCAMENTO.rascunho;
  const itens = Array.from(estado.carrinho.values()).map(({ item, quantidade }) => criarSnapshotItemEstoque(item, quantidade));
  const dados = dadosFormulario(status, total);
  try {
    estado.orcamento = estado.orcamento ? await atualizarOrcamento(estado.orcamento.id, dados, itens) : await criarOrcamento(dados, itens);
    history.replaceState({}, "", `?editar=${encodeURIComponent(estado.orcamento.id)}`);
    texto("#pageHeading", "Editar orçamento"); mensagem(status === STATUS_ORCAMENTO.aguardandoCliente ? "Proposta enviada para aprovação." : "Rascunho salvo com sucesso.");
  } catch (erro) { mensagem(erro.message || "Não foi possível salvar o orçamento."); }
}
function validarObrigatorios() {
  let valido = true;
  ["#nomeOrcamento", "#clienteNome"].forEach((seletor) => { const campo = document.querySelector(seletor); const erro = !campo?.value.trim(); campo?.closest(".ops-field")?.classList.toggle("is-invalid", erro); valido &&= !erro; });
  if (!valido) mensagem("Preencha o nome do orçamento e o nome do cliente para salvar.");
  return valido;
}
function dadosFormulario(status, total) {
  return { status, nome: valor("#nomeOrcamento"), clienteNomeSnapshot: valor("#clienteNome"), clienteTelefone: valor("#clienteTelefone"), clienteEmail: valor("#clienteEmail"), clienteIdade: valor("#clienteIdade"), horarioPreferencial: valor("#horarioPreferencial"), clienteAlergias: valor("#clienteAlergias"), clienteObservacoes: valor("#clienteObservacoes"), tamanhoTatuagem: valor("#tamanhoTatuagem"), localCorpo: valor("#localCorpo"), complexidade: valor("#complexidade"), coresTatuagem: valor("#coresTatuagem"), observacoesCliente: valor("#observacoesCliente"), imagensReferencia: estado.referencias, imagemReferencia: estado.referencias[0]?.dataUrl || "", valorHora: normalizarNumero(valor("#valorHora")), duracaoSessao: normalizarNumero(valor("#duracaoSessao")), percentualMargemLucro: normalizarNumero(valor("#margem")), percentualDesconto: normalizarNumero(valor("#desconto")), custoMaterialSnapshot: total.itens, custoMaoObraSnapshot: total.maoObra, subtotalSnapshot: total.subtotal, descontoValorSnapshot: total.descontoValor, lucroValorSnapshot: total.margemValor, valorFinalSnapshot: total.valorFinal };
}
function preencherFormulario(orcamento) {
  const dados = { nomeOrcamento: orcamento.nome, statusRascunho: orcamento.status === STATUS_ORCAMENTO.aguardandoCliente ? STATUS_ORCAMENTO.aguardandoCliente : STATUS_ORCAMENTO.rascunho, clienteNome: orcamento.clienteNomeSnapshot, clienteTelefone: orcamento.clienteTelefone, clienteEmail: orcamento.clienteEmail, clienteIdade: orcamento.clienteIdade, horarioPreferencial: orcamento.horarioPreferencial, clienteAlergias: orcamento.clienteAlergias, clienteObservacoes: orcamento.clienteObservacoes, tamanhoTatuagem: orcamento.tamanhoTatuagem, localCorpo: orcamento.localCorpo, complexidade: orcamento.complexidade, coresTatuagem: orcamento.coresTatuagem, observacoesCliente: orcamento.observacoesCliente, valorHora: orcamento.valorHora, duracaoSessao: orcamento.duracaoSessao, margem: orcamento.percentualMargemLucro, desconto: orcamento.percentualDesconto };
  Object.entries(dados).forEach(([id, conteudo]) => { const campo = document.querySelector(`#${id}`); if (campo) campo.value = conteudo ?? ""; });
}
function limpar() { if (!confirm("Limpar os dados não salvos deste orçamento?")) return; document.querySelector("#formOrcamento")?.reset(); estado.carrinho.clear(); estado.referencias = []; estado.orcamento = null; history.replaceState({}, "", location.pathname); texto("#pageHeading", "Novo orçamento"); renderizar(); }

async function adicionarReferencias(evento) {
  const arquivos = Array.from(evento.target.files || []).filter((arquivo) => arquivo.type.startsWith("image/") && arquivo.size <= 2_000_000).slice(0, Math.max(0, LIMITE_REFERENCIAS - estado.referencias.length));
  if (!arquivos.length) { mensagem("Escolha imagens JPG, PNG ou WEBP de até 2 MB."); evento.target.value = ""; return; }
  const novas = await Promise.all(arquivos.map(async (arquivo, indice) => ({ id: `referencia-${Date.now()}-${indice}`, nome: arquivo.name || `Referência ${estado.referencias.length + indice + 1}`, tipo: arquivo.type, dataUrl: await arquivoParaDataUrl(arquivo) })));
  estado.referencias.push(...novas); evento.target.value = ""; renderizarReferencias(); mensagem(`${novas.length} referência(s) adicionada(s).`);
}
function renderizarReferencias() {
  const preview = document.querySelector("#previewImagem"), alvo = document.querySelector("#listaReferenciasArte"); if (!preview || !alvo) return;
  if (!estado.referencias.length) { preview.textContent = "Adicione até seis referências visuais da arte."; alvo.innerHTML = ""; return; }
  preview.textContent = `${estado.referencias.length} referência(s) anexada(s).`;
  alvo.innerHTML = estado.referencias.map((referencia, indice) => `<article class="art-reference-card"><img class="art-reference-card__preview" src="${escapar(referencia.dataUrl)}" alt="Prévia de ${escapar(referencia.nome)}"><div class="art-reference-card__body"><strong class="art-reference-card__name">${escapar(referencia.nome)}</strong><div class="art-reference-card__actions"><button class="button button-ghost" type="button" data-view-reference="${indice}">Visualizar</button><button class="icon-button" type="button" data-remove-reference="${indice}" aria-label="Remover referência">×</button></div></div></article>`).join("");
}
function tratarReferencia(evento) {
  const remover = evento.target.closest("[data-remove-reference]"); if (remover) { estado.referencias.splice(Number(remover.dataset.removeReference), 1); renderizarReferencias(); return; }
  const abrir = evento.target.closest("[data-view-reference]"); if (!abrir) return;
  const referencia = estado.referencias[Number(abrir.dataset.viewReference)], conteudo = document.querySelector("#referenciaModalContent"); if (!referencia || !conteudo) return;
  conteudo.innerHTML = `<header class="modal-header"><div><span>Referência da arte</span><h2>${escapar(referencia.nome)}</h2></div><button class="icon-button" type="button" data-close-reference aria-label="Fechar">×</button></header><img class="reference-viewer-image" src="${escapar(referencia.dataUrl)}" alt="${escapar(referencia.nome)}">`;
  document.querySelector("#referenciaModal")?.showModal();
}

async function gerarPdf(tipo) {
  try {
    const total = totais(); const dados = { nome: valor("#nomeOrcamento"), clienteNome: valor("#clienteNome"), idade: valor("#clienteIdade"), telefone: valor("#clienteTelefone"), email: valor("#clienteEmail"), alergias: valor("#clienteAlergias"), tamanho: valor("#tamanhoTatuagem"), local: valor("#localCorpo"), complexidade: valor("#complexidade"), observacoesArte: valor("#observacoesCliente"), observacoesCliente: valor("#clienteObservacoes") };
    const materiais = Array.from(estado.carrinho.values()).map(({ item, quantidade }) => ({ item, quantidade, valor: calcularCustoUnitario(item) * quantidade }));
    const documento = await criarDocumentoMiShiro({ titulo: tipo === "cliente" ? "Proposta para cliente" : "Documento interno", subtitulo: "Orçamento de tatuagem" });
    adicionarTitulo(documento, dados.nome || "Proposta de tatuagem", tipo === "cliente" ? "Proposta preparada especialmente para o seu atendimento." : "Composição completa do orçamento.");
    adicionarDetalhes(documento, [{ rotulo: "Cliente", valor: dados.clienteNome || "Não informado" }, { rotulo: "Tamanho", valor: dados.tamanho ? `${dados.tamanho} cm` : "A definir" }, { rotulo: "Local", valor: dados.local || "A definir" }, { rotulo: "Complexidade", valor: dados.complexidade || "A definir" }]);
    if (tipo === "cliente") {
      const referencia = estado.referencias[0]?.dataUrl; if (referencia) { try { documento.doc.addImage(referencia, referencia.startsWith("data:image/png") ? "PNG" : "JPEG", 42, documento.y, 180, 125, undefined, "FAST"); documento.y += 142; } catch {} }
      adicionarLista(documento, "Itens opcionais", materiais.filter(({ item }) => item.categoria === CATEGORY_OPTIONAL).map(({ item, quantidade, valor: valorItem }) => ({ nome: item.nome, detalhe: `${quantidade} ${item.unidadeMedida || "un"}`, valor: valorItem })), { mostrarValor: true, vazio: "Nenhum item opcional foi selecionado." });
      adicionarResumoFinanceiro(documento, [{ rotulo: "Valor estimado", valor: total.valorFinal }]);
    } else {
      adicionarTitulo(documento, "Observações", [dados.observacoesArte, dados.observacoesCliente].filter(Boolean).join("\n") || "Sem observações.");
      adicionarLista(documento, "Materiais e opcionais", materiais.map(({ item, quantidade, valor: valorItem }) => ({ nome: item.nome, detalhe: `${item.categoria} • ${quantidade} ${item.unidadeMedida || "un"} × ${formatarMoeda(valorItem / Math.max(quantidade, 1))}`, valor: valorItem })), { mostrarValor: true, vazio: "Nenhum item selecionado." });
      adicionarResumoFinanceiro(documento, [{ rotulo: "Materiais e opcionais", valor: total.itens }, { rotulo: "Mão de obra", valor: total.maoObra }, { rotulo: `Lucro (${normalizarNumero(valor("#margem"))}%)`, valor: total.margemValor }, { rotulo: "Subtotal", valor: total.subtotal }, { rotulo: `Desconto (${normalizarNumero(valor("#desconto"))}%)`, valor: -total.descontoValor }, { rotulo: "Valor final", valor: total.valorFinal }]);
    }
    finalizarDocumento(documento, `${arquivoSeguro(dados.nome || "orcamento-mishiro")}-${tipo}.pdf`);
  } catch (erro) { mensagem(erro.message || "Não foi possível gerar o PDF."); }
}

function normalizarReferencias(orcamento) { return Array.isArray(orcamento?.imagensReferencia) ? orcamento.imagensReferencia.filter((item) => item?.dataUrl) : (orcamento?.imagemReferencia ? [{ id: "referencia-legada", nome: "Referência principal", tipo: "image/jpeg", dataUrl: orcamento.imagemReferencia }] : []); }
function itemLegado(snapshot) { return { id: snapshot.itemEstoqueId, nome: snapshot.nomeItemSnapshot || "Item removido do estoque", categoria: snapshot.categoriaSnapshot || "Sem categoria", unidadeMedida: snapshot.unidadeMedidaSnapshot || "un", precoEmbalagem: snapshot.custoUnitarioSnapshot || 0, quantidadeEmbalagem: 1, quantidadeAtual: snapshot.quantidadeUsada || 0 }; }
async function arquivoParaDataUrl(arquivo) { return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.onload = () => resolver(String(leitor.result)); leitor.onerror = () => rejeitar(leitor.error); leitor.readAsDataURL(arquivo); }); }
function valor(seletor) { return document.querySelector(seletor)?.value?.trim() || ""; }
function texto(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.textContent = conteudo; }
function mensagem(conteudo) { mostrarStatus(document.querySelector("#statusOrcamento"), conteudo); }
function arquivoSeguro(texto) { return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase(); }
