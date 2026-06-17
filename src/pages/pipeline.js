import { montarLayout } from "../shared/layout.js";
import { formatarMoeda } from "../shared/formatters.js";
import { vazio, escapar } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { STATUS_ORCAMENTO } from "../models/esquema-banco.js";
import { listarOrcamentos, marcarOrcamentoComoExportado, aceitarOrcamento, recusarOrcamento } from "../services/orcamentos-service.js";

const COLUNAS = [[STATUS_ORCAMENTO.rascunho,"Rascunhos"],[STATUS_ORCAMENTO.aguardandoCliente,"Aguardando cliente"],[STATUS_ORCAMENTO.aceito,"Aceitos"],[STATUS_ORCAMENTO.agendado,"Agendados"],[STATUS_ORCAMENTO.estoqueDescontado,"Estoque descontado"],[STATUS_ORCAMENTO.concluido,"Concluídos"],[STATUS_ORCAMENTO.recusado,"Recusados"]];
montarLayout({ paginaAtual: "pipeline", titulo: "Pipeline", subtitulo: "Orçamentos" });
iniciar();
async function iniciar(){ await iniciarBancoLocal(); await render(); }
async function render(){ const orcamentos = await listarOrcamentos(); document.querySelector("#pipelineBoard").innerHTML = COLUNAS.map(([status,titulo]) => { const lista = orcamentos.filter((o) => o.status === status); return `<section class="pipeline-column"><header><h2>${titulo}</h2><span class="pipeline-count">${lista.length}</span></header>${lista.length ? lista.map(card).join("") : vazio("Sem registros.")}</section>`; }).join(""); bind(); }
function card(o){ return `<article class="pipeline-card"><strong>${escapar(o.nome)}</strong><span>${escapar(o.clienteNomeSnapshot || "Cliente não informado")} · ${formatarMoeda(o.valorFinalSnapshot)}</span><div class="action-row">${acoes(o)}</div></article>`; }
function acoes(o){ if(o.status===STATUS_ORCAMENTO.rascunho) return `<button class="button button-secondary" data-acao="exportar" data-id="${o.id}" type="button">Enviado</button>`; if(o.status===STATUS_ORCAMENTO.aguardandoCliente) return `<button class="button button-secondary" data-acao="aceitar" data-id="${o.id}" type="button">Aceitou</button><button class="button button-ghost" data-acao="recusar" data-id="${o.id}" type="button">Recusou</button>`; return ""; }
function bind(){ document.querySelectorAll("[data-acao]").forEach((b)=>b.addEventListener("click", async()=>{ if(b.dataset.acao==="exportar") await marcarOrcamentoComoExportado(b.dataset.id); if(b.dataset.acao==="aceitar") await aceitarOrcamento(b.dataset.id); if(b.dataset.acao==="recusar") await recusarOrcamento(b.dataset.id, prompt("Motivo da recusa", "") || ""); await render(); })); }
