import { normalizarNumero } from "../shared/formatters.js";
import { mostrarStatus } from "../shared/ui.js";
import { criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento, atualizarOrcamento, obterOrcamento, listarItensOrcamento } from "../services/orcamentos-service.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { estadoOrcamento, itemLegado, normalizarReferencias, totaisFinanceiros } from "./orcamentos-v3-data.js";
import { renderizarTudo } from "./budget-ui.js";
import { renderizarReferencias } from "./budget-events.js";

export async function conectarPersistencia() {
  const formulario = document.querySelector("#formOrcamento");
  if (!formulario || formulario.dataset.persistenciaConectada === "true") return;
  formulario.dataset.persistenciaConectada = "true";
  formulario.addEventListener("submit", salvar);
  formulario.addEventListener("input", limparErrosObrigatorios);
  document.querySelector("#limparOrcamento")?.addEventListener("click", limpar);
  await carregarEdicao();
}

async function carregarEdicao() {
  const id = new URLSearchParams(location.search).get("editar");
  if (!id) return;
  const [orcamento, itens] = await Promise.all([obterOrcamento(id), listarItensOrcamento(id)]);
  if (!orcamento) return;
  estadoOrcamento.orcamento = orcamento;
  preencher(orcamento);
  estadoOrcamento.referencias = normalizarReferencias(orcamento);
  const mapa = new Map(estadoOrcamento.estoque.map((item) => [item.id, item]));
  itens.forEach((snapshot) => {
    const item = mapa.get(snapshot.itemEstoqueId) || itemLegado(snapshot);
    estadoOrcamento.carrinho.set(item.id, { item, quantidade: normalizarNumero(snapshot.quantidadeUsada) });
  });
  const titulo = document.querySelector("#pageHeading");
  if (titulo) titulo.textContent = "Editar orçamento";
  renderizarTudo();
  renderizarReferencias();
}

async function salvar(evento) {
  evento.preventDefault();
  const status = evento.submitter?.dataset.saveMode || STATUS_ORCAMENTO.rascunho;
  if (!validar()) return;
  const total = totaisFinanceiros(v("#valorHora"), v("#duracaoSessao"), v("#desconto"), v("#margem"));
  const itens = Array.from(estadoOrcamento.carrinho.values()).map(({ item, quantidade }) => criarSnapshotItemEstoque(item, quantidade));
  const dados = montarDados(status, total);
  try {
    estadoOrcamento.orcamento = estadoOrcamento.orcamento ? await atualizarOrcamento(estadoOrcamento.orcamento.id, dados, itens) : await criarOrcamento(dados, itens);
    history.replaceState({}, "", `?editar=${encodeURIComponent(estadoOrcamento.orcamento.id)}`);
    const titulo = document.querySelector("#pageHeading");
    if (titulo) titulo.textContent = "Editar orçamento";
    mostrar(status === STATUS_ORCAMENTO.aguardandoCliente ? "Orçamento salvo e enviado para aprovação." : "Rascunho salvo com sucesso.");
  } catch (erro) {
    mostrar(erro.message || "Não foi possível salvar o orçamento.");
  }
}

function montarDados(status, total) {
  return { status, nome:v("#nomeOrcamento"), clienteNomeSnapshot:v("#clienteNome"), clienteTelefone:v("#clienteTelefone"), clienteEmail:v("#clienteEmail"), clienteIdade:v("#clienteIdade"), horarioPreferencial:v("#horarioPreferencial"), clienteAlergias:v("#clienteAlergias"), clienteObservacoes:v("#clienteObservacoes"), tamanhoTatuagem:v("#tamanhoTatuagem"), localCorpo:v("#localCorpo"), complexidade:v("#complexidade"), coresTatuagem:v("#coresTatuagem"), observacoesCliente:v("#observacoesCliente"), imagensReferencia:estadoOrcamento.referencias, imagemReferencia:estadoOrcamento.referencias[0]?.dataUrl || "", valorHora:normalizarNumero(v("#valorHora")), duracaoSessao:normalizarNumero(v("#duracaoSessao")), percentualMargemLucro:normalizarNumero(v("#margem")), percentualDesconto:normalizarNumero(v("#desconto")), custoMaterialSnapshot:total.materiais, custoMaoObraSnapshot:total.maoObra, subtotalSnapshot:total.subtotal, descontoValorSnapshot:total.descontoValor, lucroValorSnapshot:total.margemValor, valorFinalSnapshot:total.valorFinal };
}

function validar() {
  let valido = true;
  ["#nomeOrcamento", "#clienteNome"].forEach((seletor) => {
    const campo = document.querySelector(seletor);
    const grupo = campo?.closest(".ops-field");
    const erro = !campo?.value.trim();
    grupo?.classList.toggle("is-invalid", erro);
    if (erro) valido = false;
  });
  if (estadoOrcamento.errosQuantidade?.size) {
    mostrar("Corrija as quantidades dos itens antes de salvar.");
    return false;
  }
  if (!valido) mostrar("Preencha o nome do orçamento e o nome do cliente para salvar.");
  return valido;
}

function limparErrosObrigatorios(evento) {
  if (!evento.target.matches("#nomeOrcamento,#clienteNome")) return;
  evento.target.closest(".ops-field")?.classList.toggle("is-invalid", !evento.target.value.trim());
}

function preencher(orcamento) {
  const dados = { nomeOrcamento:orcamento.nome, statusRascunho:orcamento.status === STATUS_ORCAMENTO.aguardandoCliente ? STATUS_ORCAMENTO.aguardandoCliente : STATUS_ORCAMENTO.rascunho, clienteNome:orcamento.clienteNomeSnapshot, clienteTelefone:orcamento.clienteTelefone, clienteEmail:orcamento.clienteEmail, clienteIdade:orcamento.clienteIdade, horarioPreferencial:orcamento.horarioPreferencial, clienteAlergias:orcamento.clienteAlergias, clienteObservacoes:orcamento.clienteObservacoes, tamanhoTatuagem:orcamento.tamanhoTatuagem, localCorpo:orcamento.localCorpo, complexidade:orcamento.complexidade, coresTatuagem:orcamento.coresTatuagem, observacoesCliente:orcamento.observacoesCliente, valorHora:orcamento.valorHora, duracaoSessao:orcamento.duracaoSessao, margem:orcamento.percentualMargemLucro, desconto:orcamento.percentualDesconto };
  Object.entries(dados).forEach(([id, conteudo]) => { const campo = document.querySelector(`#${id}`); if (campo) campo.value = conteudo ?? ""; });
}

function limpar() {
  if (!confirm("Limpar os dados não salvos deste orçamento?")) return;
  document.querySelector("#formOrcamento")?.reset();
  estadoOrcamento.carrinho.clear();
  estadoOrcamento.referencias = [];
  estadoOrcamento.errosQuantidade?.clear();
  estadoOrcamento.orcamento = null;
  history.replaceState({}, "", location.pathname);
  const titulo = document.querySelector("#pageHeading");
  if (titulo) titulo.textContent = "Novo orçamento";
  renderizarTudo();
  renderizarReferencias();
}

function v(seletor) { return document.querySelector(seletor)?.value?.trim() || ""; }
function mostrar(mensagem) { mostrarStatus(document.querySelector("#statusOrcamento"), mensagem); }
