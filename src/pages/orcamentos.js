import { montarLayout } from "../shared/layout.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { normalizarNumero, formatarMoeda } from "../shared/formatters.js";
import { escapar, mostrarStatus, atualizarIcones } from "../shared/ui.js";
import { CATEGORY_ALL, CATEGORY_ORDER, CATEGORY_OPTIONAL, getItemSpecification, getMeasureSuffix } from "../shared/stock-catalog.js";
import { garantirEstoqueInicial, listarItensEstoque, calcularCustoUnitario, criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento, atualizarOrcamento, obterOrcamento, listarItensOrcamento } from "../services/orcamentos-service.js";
import { criarDocumentoMiShiro, adicionarDetalhes, adicionarLista, adicionarResumoFinanceiro, finalizarDocumento } from "../shared/pdf-theme.js";

const MAX_REFERENCIAS = 6;
const MAX_ARTE_BYTES = 2 * 1024 * 1024;
const estado = { estoque: [], carrinho: new Map(), referencias: [], erros: new Set(), categoria: CATEGORY_ALL, termo: "", orcamento: null };
const $ = (seletor) => document.querySelector(seletor);

montarLayout({ paginaAtual: "orcamentos", titulo: "Orçamentos", subtitulo: "Proposta" });
iniciarPagina();

async function iniciarPagina() {
  try {
    await iniciarBancoLocal();
    await garantirEstoqueInicial();
    estado.estoque = (await listarItensEstoque()).filter((item) => !item.arquivadoEm);
    conectarEventos();
    await carregarEdicao();
    renderizarTudo();
    atualizarIcones();
  } catch (erro) {
    mostrar(erro.message || "Não foi possível iniciar a página de orçamento.");
  }
}

function conectarEventos() {
  $("#budgetSearchInput")?.addEventListener("input", (evento) => { estado.termo = evento.target.value.toLowerCase().trim(); renderizarEstoque(); });
  $("#clearBudgetSearchButton")?.addEventListener("click", () => { estado.termo = ""; const campo = $("#budgetSearchInput"); if (campo) campo.value = ""; renderizarEstoque(); });
  $("#budgetCategoryFilters")?.addEventListener("click", (evento) => { const botao = evento.target.closest("[data-category]"); if (!botao) return; estado.categoria = botao.dataset.category || CATEGORY_ALL; renderizarFiltros(); renderizarEstoque(); });
  $("#stockPickerList")?.addEventListener("click", (evento) => tratarQuantidade(evento, "data-stock-id"));
  $("#listaMateriais")?.addEventListener("click", (evento) => tratarQuantidade(evento, "data-cart-id"));
  $("#stockPickerList")?.addEventListener("change", (evento) => tratarDigitacao(evento, "data-stock-id"));
  $("#listaMateriais")?.addEventListener("change", (evento) => tratarDigitacao(evento, "data-cart-id"));
  $("#toggleCarrinho")?.addEventListener("click", alternarCarrinho);
  $("#fecharCarrinho")?.addEventListener("click", fecharCarrinho);
  document.addEventListener("keydown", (evento) => { if (evento.key === "Escape") fecharCarrinho(); });
  $("#formOrcamento")?.addEventListener("input", (evento) => { if (evento.target.matches("#valorHora,#duracaoSessao,#margem,#desconto")) renderizarResumo(); if (evento.target.matches("#nomeOrcamento,#clienteNome")) limparErroObrigatorio(evento.target); });
  $("#formOrcamento")?.addEventListener("submit", salvarOrcamento);
  $("#limparOrcamento")?.addEventListener("click", limparFormulario);
  $("#imagemReferencia")?.addEventListener("change", adicionarReferencias);
  $("#listaReferenciasArte")?.addEventListener("click", tratarCliqueReferencia);
  $("#gerarPdfCliente")?.addEventListener("click", () => gerarPdf("cliente"));
  $("#gerarPdfEstudio")?.addEventListener("click", () => gerarPdf("estudio"));
}

function tratarQuantidade(evento, atributo) {
  const remover = evento.target.closest("[data-remove-item]");
  if (remover) return definirQuantidade(remover.closest(`[${atributo}]`)?.getAttribute(atributo), 0);
  const botao = evento.target.closest("[data-step]");
  if (!botao) return;
  const id = botao.closest(`[${atributo}]`)?.getAttribute(atributo);
  const atual = estado.carrinho.get(id)?.quantidade || 0;
  definirQuantidade(id, atual + (botao.dataset.step === "increase" ? 1 : -1));
}

function tratarDigitacao(evento, atributo) {
  const campo = evento.target.closest("[data-step-input]");
  if (!campo) return;
  definirQuantidade(campo.closest(`[${atributo}]`)?.getAttribute(atributo), campo.value, true);
}

function definirQuantidade(id, valor, manual = false) {
  const item = estado.estoque.find((registro) => registro.id === id) || estado.carrinho.get(id)?.item;
  if (!item) return;
  const texto = String(valor ?? "").trim();
  const inteiroValido = texto === "" || /^\d+$/.test(texto);
  const quantidade = inteiroValido ? Math.floor(Math.max(0, normalizarNumero(texto || 0))) : -1;
  const limite = quantidadeDisponivel(item);
  if (!inteiroValido || quantidade > limite) {
    estado.erros.add(item.id);
    mostrar(manual && !inteiroValido ? `Informe uma quantidade inteira válida para ${item.nome}.` : `A quantidade de ${item.nome} não pode superar o estoque disponível.`);
  } else {
    estado.erros.delete(item.id);
    if (quantidade <= 0) estado.carrinho.delete(item.id);
    else estado.carrinho.set(item.id, { item, quantidade });
  }
  renderizarTudo();
}

function quantidadeDisponivel(item) {
  const unidade = item?.unidadeMedida || "un";
  const quantidade = Math.max(0, normalizarNumero(item?.quantidadeAtual));
  if (["ml", "g", "m"].includes(unidade)) return Math.floor(quantidade * Math.max(1, normalizarNumero(item.quantidadeEmbalagem)));
  return Math.floor(quantidade);
}

function renderizarTudo() {
  renderizarFiltros();
  renderizarEstoque();
  renderizarCarrinho();
  renderizarReferencias();
  renderizarResumo();
  atualizarIcones();
}

function renderizarFiltros() {
  const alvo = $("#budgetCategoryFilters");
  if (!alvo) return;
  alvo.innerHTML = CATEGORY_ORDER.map((categoria) => `<button type="button" class="ops-filter-chip ${categoria === estado.categoria ? "is-active" : ""}" data-category="${escapar(categoria)}">${escapar(categoria)}</button>`).join("");
}

function renderizarEstoque() {
  const alvo = $("#stockPickerList");
  if (!alvo) return;
  const lista = estado.estoque.filter((item) => {
    const texto = [item.nome, item.categoria, item.marca, item.linhaTipo, item.cor, getItemSpecification(item)].join(" ").toLowerCase();
    return (estado.categoria === CATEGORY_ALL || item.categoria === estado.categoria) && (!estado.termo || texto.includes(estado.termo));
  });
  alvo.innerHTML = lista.length ? lista.map(cardEstoque).join("") : '<p class="ops-empty">Nenhum item encontrado nesta busca.</p>';
}

function cardEstoque(item) {
  const selecionada = estado.carrinho.get(item.id)?.quantidade || 0;
  const disponivel = quantidadeDisponivel(item);
  const invalido = estado.erros.has(item.id) ? " is-invalid" : "";
  return `<article class="ops-stock-item" data-stock-id="${escapar(item.id)}"><div class="ops-stock-item__title"><strong>${escapar(item.nome)}</strong><span class="ops-category-badge">${escapar(item.categoria)}</span></div><div class="ops-stock-item__meta"><span>${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(getMeasureSuffix(item.unidadeMedida))}</span><span>${escapar(getItemSpecification(item) || "Sem especificação adicional")}</span></div><div class="ops-stock-item__bottom"><div class="ops-stock-item__available"><span>Disponível</span><strong>${disponivel} ${escapar(getMeasureSuffix(item.unidadeMedida))}</strong></div>${stepper(selecionada, disponivel, invalido)}</div></article>`;
}

function renderizarCarrinho() {
  const alvo = $("#listaMateriais");
  if (!alvo) return;
  const registros = Array.from(estado.carrinho.values()).filter((registro) => registro.quantidade > 0);
  if (!registros.length) { alvo.innerHTML = '<p class="ops-empty">O carrinho está vazio. Adicione itens do estoque quando necessário.</p>'; return; }
  const materiais = registros.filter(({ item }) => item.categoria !== CATEGORY_OPTIONAL);
  const opcionais = registros.filter(({ item }) => item.categoria === CATEGORY_OPTIONAL);
  alvo.innerHTML = [grupoCarrinho("Materiais", materiais), grupoCarrinho("Opcionais", opcionais)].filter(Boolean).join("");
}

function grupoCarrinho(titulo, registros) {
  return registros.length ? `<section class="ops-cart-group"><h3>${titulo}</h3>${registros.map(cardCarrinho).join("")}</section>` : "";
}

function cardCarrinho(registro) {
  const { item, quantidade } = registro;
  const invalido = estado.erros.has(item.id) ? " is-invalid" : "";
  return `<article class="ops-cart-row ${item.categoria === CATEGORY_OPTIONAL ? "ops-cart-row--optional" : ""}" data-cart-id="${escapar(item.id)}"><div><strong>${escapar(item.nome)}</strong><small>${escapar(item.categoria)} · ${formatarMoeda(calcularCustoUnitario(item))} por ${escapar(getMeasureSuffix(item.unidadeMedida))}</small></div>${stepper(quantidade, quantidadeDisponivel(item), invalido)}<div class="ops-cart-row__actions"><strong class="ops-cart-row__subtotal">${formatarMoeda(totalLinha(registro))}</strong><button type="button" class="button button-ghost ops-cart-remove" data-remove-item aria-label="Remover ${escapar(item.nome)}">Remover</button></div></article>`;
}

function stepper(quantidade, limite, invalido) {
  return `<div class="ops-stepper${invalido}"><button type="button" data-step="decrease" aria-label="Diminuir quantidade" ${quantidade <= 0 ? "disabled" : ""}>−</button><input data-step-input inputmode="numeric" pattern="[0-9]*" value="${quantidade}" aria-label="Quantidade selecionada" /><button type="button" data-step="increase" aria-label="Aumentar quantidade" ${quantidade >= limite ? "disabled" : ""}>+</button></div>`;
}

function totalLinha({ item, quantidade }) { return calcularCustoUnitario(item) * quantidade; }

function totais() {
  let materiais = 0;
  let opcionais = 0;
  estado.carrinho.forEach((registro) => {
    const subtotal = totalLinha(registro);
    materiais += subtotal;
    if (registro.item.categoria === CATEGORY_OPTIONAL) opcionais += subtotal;
  });
  const maoObra = normalizarNumero($("#valorHora")?.value) * normalizarNumero($("#duracaoSessao")?.value);
  const subtotal = materiais + maoObra;
  const descontoValor = subtotal * normalizarNumero($("#desconto")?.value) / 100;
  return { materiais, opcionais, maoObra, subtotal, descontoValor, margemValor: subtotal * normalizarNumero($("#margem")?.value) / 100, valorFinal: Math.max(subtotal - descontoValor, 0) };
}

function renderizarResumo() {
  const total = totais();
  const quantidadeItens = Array.from(estado.carrinho.values()).reduce((soma, registro) => soma + registro.quantidade, 0);
  const valores = { totalMateriais: total.materiais, totalMaoObra: total.maoObra, subtotalOrcamento: total.subtotal, valorDesconto: total.descontoValor, valorFinal: total.valorFinal, cartTotalMateriais: total.materiais - total.opcionais, cartTotalOpcionais: total.opcionais, cartTotalGeral: total.materiais };
  Object.entries(valores).forEach(([id, valor]) => { const alvo = $(`#${id}`); if (alvo) alvo.textContent = formatarMoeda(valor); });
  const contador = $("#cartFloatingCount");
  const totalBotao = $("#cartFloatingTotal");
  if (contador) contador.textContent = quantidadeItens === 1 ? "1 item" : `${quantidadeItens} itens`;
  if (totalBotao) totalBotao.textContent = `${formatarMoeda(total.materiais)} em materiais`;
}

function alternarCarrinho() {
  const carrinho = $("#carrinhoFlutuante");
  const painel = $("#painelCarrinho");
  const botao = $("#toggleCarrinho");
  const aberto = !carrinho?.classList.contains("is-open");
  carrinho?.classList.toggle("is-open", aberto);
  if (painel) painel.hidden = !aberto;
  botao?.setAttribute("aria-expanded", aberto ? "true" : "false");
}

function fecharCarrinho() {
  const carrinho = $("#carrinhoFlutuante");
  const painel = $("#painelCarrinho");
  carrinho?.classList.remove("is-open");
  if (painel) painel.hidden = true;
  $("#toggleCarrinho")?.setAttribute("aria-expanded", "false");
}

async function adicionarReferencias(evento) {
  const arquivos = Array.from(evento.target.files || []);
  const vagas = MAX_REFERENCIAS - estado.referencias.length;
  const aceitos = arquivos.filter((arquivo) => /^image\/(png|jpeg|webp)$/.test(arquivo.type) && arquivo.size <= MAX_ARTE_BYTES).slice(0, Math.max(0, vagas));
  if (aceitos.length !== arquivos.length) mostrar("Use JPG, PNG ou WEBP de até 2 MB. O limite é de seis referências.");
  estado.referencias.push(...await Promise.all(aceitos.map(lerArquivo)));
  evento.target.value = "";
  renderizarReferencias();
}

function lerArquivo(arquivo) {
  return new Promise((resolver, rejeitar) => { const leitor = new FileReader(); leitor.onload = () => resolver({ id: crypto.randomUUID?.() || `${Date.now()}-${arquivo.name}`, nome: arquivo.name, tipo: arquivo.type, dataUrl: String(leitor.result || "") }); leitor.onerror = rejeitar; leitor.readAsDataURL(arquivo); });
}

function tratarCliqueReferencia(evento) {
  const remover = evento.target.closest("[data-remove-reference]");
  if (remover) { estado.referencias = estado.referencias.filter((referencia) => referencia.id !== remover.dataset.removeReference); return renderizarReferencias(); }
  const visualizar = evento.target.closest("[data-view-reference]");
  if (visualizar) abrirReferencia(estado.referencias.find((referencia) => referencia.id === visualizar.dataset.viewReference));
}

function renderizarReferencias() {
  const vazio = $("#previewImagem");
  const lista = $("#listaReferenciasArte");
  if (!lista) return;
  if (vazio) vazio.hidden = estado.referencias.length > 0;
  lista.innerHTML = estado.referencias.map((referencia) => `<article class="ops-reference-card"><img src="${referencia.dataUrl}" alt="Referência ${escapar(referencia.nome)}" /><div><strong>${escapar(referencia.nome)}</strong><span><button type="button" class="button button-ghost" data-view-reference="${escapar(referencia.id)}">Visualizar</button><button type="button" class="button button-ghost" data-remove-reference="${escapar(referencia.id)}">Remover</button></span></div></article>`).join("");
}

function abrirReferencia(referencia) {
  const modal = $("#referenciaModal");
  const conteudo = $("#referenciaModalContent");
  if (!modal || !conteudo || !referencia) return;
  conteudo.innerHTML = `<button type="button" class="icon-button" aria-label="Fechar referência" data-close-reference>×</button><img class="reference-viewer-image" src="${referencia.dataUrl}" alt="${escapar(referencia.nome)}" />`;
  conteudo.querySelector("[data-close-reference]")?.addEventListener("click", () => modal.close());
  modal.showModal();
}

async function carregarEdicao() {
  const id = new URLSearchParams(location.search).get("editar");
  if (!id) return;
  const [orcamento, itens] = await Promise.all([obterOrcamento(id), listarItensOrcamento(id)]);
  if (!orcamento) return;
  estado.orcamento = orcamento;
  preencherFormulario(orcamento);
  estado.referencias = normalizarReferencias(orcamento);
  const mapa = new Map(estado.estoque.map((item) => [item.id, item]));
  itens.forEach((snapshot) => {
    const item = mapa.get(snapshot.itemEstoqueId) || itemLegado(snapshot);
    estado.carrinho.set(item.id, { item, quantidade: normalizarNumero(snapshot.quantidadeUsada) });
  });
  const titulo = $("#pageHeading");
  if (titulo) titulo.textContent = "Editar orçamento";
}

function preencherFormulario(orcamento) {
  const dados = { nomeOrcamento: orcamento.nome, statusRascunho: orcamento.status === STATUS_ORCAMENTO.aguardandoCliente ? STATUS_ORCAMENTO.aguardandoCliente : STATUS_ORCAMENTO.rascunho, clienteNome: orcamento.clienteNomeSnapshot, clienteTelefone: orcamento.clienteTelefone, clienteEmail: orcamento.clienteEmail, clienteIdade: orcamento.clienteIdade, horarioPreferencial: orcamento.horarioPreferencial, clienteAlergias: orcamento.clienteAlergias, clienteObservacoes: orcamento.clienteObservacoes, tamanhoTatuagem: orcamento.tamanhoTatuagem, localCorpo: orcamento.localCorpo, complexidade: orcamento.complexidade, coresTatuagem: orcamento.coresTatuagem, observacoesCliente: orcamento.observacoesCliente, valorHora: orcamento.valorHora, duracaoSessao: orcamento.duracaoSessao, margem: orcamento.percentualMargemLucro, desconto: orcamento.percentualDesconto };
  Object.entries(dados).forEach(([id, conteudo]) => { const campo = $(`#${id}`); if (campo) campo.value = conteudo ?? ""; });
}

function normalizarReferencias(orcamento) {
  if (Array.isArray(orcamento?.imagensReferencia)) return orcamento.imagensReferencia.filter((item) => item?.dataUrl);
  return orcamento?.imagemReferencia ? [{ id: "referencia-legada", nome: "Referência principal", tipo: "image/jpeg", dataUrl: orcamento.imagemReferencia }] : [];
}

function itemLegado(snapshot) {
  return { id: snapshot.itemEstoqueId, nome: snapshot.nomeItemSnapshot || "Item removido", categoria: snapshot.categoriaSnapshot || "Sem categoria", unidadeMedida: snapshot.unidadeMedidaSnapshot || "un", precoUnitario: snapshot.custoUnitarioSnapshot || 0, quantidadeAtual: snapshot.quantidadeUsada || 0, quantidadeEmbalagem: 1 };
}

async function salvarOrcamento(evento) {
  evento.preventDefault();
  if (!validarObrigatorios()) return;
  if (estado.erros.size) return mostrar("Corrija as quantidades dos itens antes de salvar.");
  const total = totais();
  const itens = Array.from(estado.carrinho.values()).map(({ item, quantidade }) => criarSnapshotItemEstoque(item, quantidade));
  const status = evento.submitter?.dataset.saveMode || $("#statusRascunho")?.value || STATUS_ORCAMENTO.rascunho;
  const dados = montarDados(status, total);
  try {
    estado.orcamento = estado.orcamento ? await atualizarOrcamento(estado.orcamento.id, dados, itens) : await criarOrcamento(dados, itens);
    history.replaceState({}, "", `?editar=${encodeURIComponent(estado.orcamento.id)}`);
    const titulo = $("#pageHeading");
    if (titulo) titulo.textContent = "Editar orçamento";
    mostrar(status === STATUS_ORCAMENTO.aguardandoCliente ? "Orçamento salvo e enviado para aprovação." : "Rascunho salvo com sucesso.");
  } catch (erro) {
    mostrar(erro.message || "Não foi possível salvar o orçamento.");
  }
}

function montarDados(status, total) {
  return { status, nome: valor("#nomeOrcamento"), clienteNomeSnapshot: valor("#clienteNome"), clienteTelefone: valor("#clienteTelefone"), clienteEmail: valor("#clienteEmail"), clienteIdade: valor("#clienteIdade"), horarioPreferencial: valor("#horarioPreferencial"), clienteAlergias: valor("#clienteAlergias"), clienteObservacoes: valor("#clienteObservacoes"), tamanhoTatuagem: valor("#tamanhoTatuagem"), localCorpo: valor("#localCorpo"), complexidade: valor("#complexidade"), coresTatuagem: valor("#coresTatuagem"), observacoesCliente: valor("#observacoesCliente"), imagensReferencia: estado.referencias, imagemReferencia: estado.referencias[0]?.dataUrl || "", valorHora: normalizarNumero(valor("#valorHora")), duracaoSessao: normalizarNumero(valor("#duracaoSessao")), percentualMargemLucro: normalizarNumero(valor("#margem")), percentualDesconto: normalizarNumero(valor("#desconto")), custoMaterialSnapshot: total.materiais, custoMaoObraSnapshot: total.maoObra, subtotalSnapshot: total.subtotal, descontoValorSnapshot: total.descontoValor, lucroValorSnapshot: total.margemValor, valorFinalSnapshot: total.valorFinal };
}

function validarObrigatorios() {
  let valido = true;
  ["#nomeOrcamento", "#clienteNome"].forEach((seletor) => {
    const campo = $(seletor);
    const erro = !campo?.value.trim();
    campo?.closest(".ops-field")?.classList.toggle("is-invalid", erro);
    if (erro) valido = false;
  });
  if (!valido) mostrar("Preencha o nome do orçamento e o nome do cliente para salvar.");
  return valido;
}

function limparErroObrigatorio(campo) { campo.closest(".ops-field")?.classList.toggle("is-invalid", !campo.value.trim()); }
function valor(seletor) { return $(seletor)?.value?.trim() || ""; }
function mostrar(mensagem) { mostrarStatus($("#statusOrcamento"), mensagem); }

function limparFormulario() {
  if (!confirm("Limpar os dados não salvos deste orçamento?")) return;
  $("#formOrcamento")?.reset();
  estado.carrinho.clear();
  estado.referencias = [];
  estado.erros.clear();
  estado.orcamento = null;
  fecharCarrinho();
  history.replaceState({}, "", location.pathname);
  const titulo = $("#pageHeading");
  if (titulo) titulo.textContent = "Novo orçamento";
  renderizarTudo();
}

async function gerarPdf(tipo) {
  try {
    const total = totais();
    const doc = await criarDocumentoMiShiro({ titulo: tipo === "cliente" ? "Proposta de tatuagem" : "Orçamento interno", subtitulo: tipo === "cliente" ? "Resumo essencial para aprovação" : "Relatório completo do estúdio" });
    adicionarDetalhes(doc, [
      { rotulo: "Orçamento", valor: valor("#nomeOrcamento") || "Sem nome" },
      { rotulo: "Cliente", valor: valor("#clienteNome") || "Não informado" },
      { rotulo: "Arte", valor: `${valor("#tamanhoTatuagem") || "—"} cm · ${valor("#localCorpo") || "—"}` },
      { rotulo: "Complexidade", valor: valor("#complexidade") || "Não definida" }
    ]);
    adicionarLista(doc, "Itens selecionados", Array.from(estado.carrinho.values()).map(({ item, quantidade }) => ({ nome: item.nome, detalhe: `${quantidade} ${getMeasureSuffix(item.unidadeMedida)} · ${item.categoria}`, valor: totalLinha({ item, quantidade }) })), { mostrarValor: true });
    const resumo = [
      { rotulo: "Materiais", valor: total.materiais },
      { rotulo: "Mão de obra", valor: total.maoObra },
      { rotulo: "Subtotal", valor: total.subtotal },
      { rotulo: "Desconto", valor: total.descontoValor }
    ];
    if (tipo === "estudio") resumo.splice(3, 0, { rotulo: "Margem interna", valor: total.margemValor });
    resumo.push({ rotulo: "Valor final", valor: total.valorFinal });
    adicionarResumoFinanceiro(doc, resumo);
    finalizarDocumento(doc, tipo === "cliente" ? "proposta-mishiro.pdf" : "orcamento-interno-mishiro.pdf");
  } catch (erro) {
    mostrar(erro.message || "Não foi possível gerar o PDF.");
  }
}
