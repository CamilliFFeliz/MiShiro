import { normalizarNumero } from "../shared/formatters.js";
import { mostrarStatus } from "../shared/ui.js";
import { criarSnapshotItemEstoque } from "../services/estoque-service.js";
import { criarOrcamento, atualizarOrcamento, obterOrcamento, listarItensOrcamento } from "../services/orcamentos-service.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { estadoOrcamento, itemLegado, normalizarReferencias, totaisFinanceiros } from "./orcamentos-v3-data.js";
import { renderizarTudo } from "./budget-ui.js";

export function conectarPersistencia() {
  document.querySelector("#formOrcamento")?.addEventListener("submit", salvar);
  document.querySelector("#limparOrcamento")?.addEventListener("click", limpar);
  carregarEdicao();
}

async function carregarEdicao() {
  const id = new URLSearchParams(location.search).get("editar");
  if (!id) return;
  const [orcamento, itens] = await Promise.all([obterOrcamento(id), listarItensOrcamento(id)]);
  if (!orcamento) return;
  estadoOrcamento.orcamento = orcamento;
  preencher(orcamento);
  estadoOrcamento.referencias = normalizarReferencias(orcamento);
  estadoOrcamento.carrinho.clear();
  const mapa = new Map(estadoOrcamento.estoque.map((item) => [item.id, item]));
  itens.forEach((snapshot) => {
    const item = mapa.get(snapshot.itemEstoqueId) || itemLegado(snapshot);
    const quantidade = Math.max(0, normalizarNumero(snapshot.quantidadeUsada));
    if (quantidade > 0) estadoOrcamento.carrinho.set(item.id, { item, quantidade });
  });
  document.querySelector("#pageHeading").textContent = "Editar orçamento";
  renderizarTudo();
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
    document.querySelector("#pageHeading").textContent = "Editar orçamento";
    mostrar(status === STATUS_ORCAMENTO.aguardandoCliente ? "Proposta enviada para aprovação." : "Rascunho salvo com sucesso.");
  } catch (erro) { mostrar(erro.message || "Não foi possível salvar o orçamento."); }
}

function montarDados(status, total) {
  return { status, nome:v("#nomeOrcamento"), clienteNomeSnapshot:v("#clienteNome"), clienteTelefone:v("#clienteTelefone"), clienteEmail:v("#clienteEmail"), clienteIdade:v("#clienteIdade"), horarioPreferencial:v("#horarioPreferencial"), clienteAlergias:v("#clienteAlergias"), clienteObservacoes:v("#clienteObservacoes"), tamanhoTatuagem:v("#tamanhoTatuagem"), localCorpo:v("#localCorpo"), complexidade:v("#complexidade"), coresTatuagem:v("#coresTatuagem"), observacoesCliente:v("#observacoesCliente"), imagensReferencia:estadoOrcamento.referencias, imagemReferencia:estadoOrcamento.referencias[0]?.dataUrl||"", valorHora:normalizarNumero(v("#valorHora")), duracaoSessao:normalizarNumero(v("#duracaoSessao")), percentualMargemLucro:normalizarNumero(v("#margem")), percentualDesconto:normalizarNumero(v("#desconto")), custoMaterialSnapshot:total.materiais, custoMaoObraSnapshot:total.maoObra, subtotalSnapshot:total.subtotal, descontoValorSnapshot:total.descontoValor, lucroValorSnapshot:total.margemValor, valorFinalSnapshot:total.valorFinal };
}

function validar() { let valido=true; [["#nomeOrcamento"],["#clienteNome"]].forEach(([seletor])=>{const campo=document.querySelector(seletor);const grupo=campo?.closest(".ops-field");const erro=!campo?.value.trim();grupo?.classList.toggle("is-invalid",erro);if(erro)valido=false;});if(!valido)mostrar("Preencha o nome do orçamento e o nome do cliente para salvar.");return valido; }
function preencher(o){const dados={nomeOrcamento:o.nome,statusRascunho:o.status===STATUS_ORCAMENTO.aguardandoCliente?STATUS_ORCAMENTO.aguardandoCliente:STATUS_ORCAMENTO.rascunho,clienteNome:o.clienteNomeSnapshot,clienteTelefone:o.clienteTelefone,clienteEmail:o.clienteEmail,clienteIdade:o.clienteIdade,horarioPreferencial:o.horarioPreferencial,clienteAlergias:o.clienteAlergias,clienteObservacoes:o.clienteObservacoes,tamanhoTatuagem:o.tamanhoTatuagem,localCorpo:o.localCorpo,complexidade:o.complexidade,coresTatuagem:o.coresTatuagem,observacoesCliente:o.observacoesCliente,valorHora:o.valorHora,duracaoSessao:o.duracaoSessao,margem:o.percentualMargemLucro,desconto:o.percentualDesconto};Object.entries(dados).forEach(([id,conteudo])=>{const campo=document.querySelector(`#${id}`);if(campo)campo.value=conteudo??"";});}
function limpar(){if(!confirm("Limpar os dados não salvos deste orçamento?"))return;document.querySelector("#formOrcamento")?.reset();estadoOrcamento.carrinho.clear();estadoOrcamento.orcamento=null;history.replaceState({},"",location.pathname);document.querySelector("#pageHeading").textContent="Novo orçamento";renderizarTudo();}
function v(s){return document.querySelector(s)?.value?.trim()||"";}function mostrar(m){mostrarStatus(document.querySelector("#statusOrcamento"),m);}
