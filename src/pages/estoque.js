import { montarLayout } from "../shared/layout.js";
import { formatarMoeda } from "../shared/formatters.js";
import { vazio, escapar, mostrarStatus, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { cadastrarItemEstoque, listarItensEstoque, listarAlertasEstoqueBaixo, calcularResumoEstoque } from "../services/estoque-service.js";

let itens = [];
let termo = "";
montarLayout({ paginaAtual: "estoque", titulo: "Estoque", subtitulo: "Insumos" });
iniciar();

async function iniciar() { await iniciarBancoLocal(); vincularEventos(); await carregar(); atualizarIcones(); }
function vincularEventos() { document.querySelector("#formEstoque")?.addEventListener("submit", salvarItem); document.querySelector("#buscaEstoque")?.addEventListener("input", (e) => { termo = e.target.value.toLowerCase(); render(); }); }
async function carregar() { itens = await listarItensEstoque(); render(); }
async function salvarItem(evento) { evento.preventDefault(); await cadastrarItemEstoque({ nome: v("#nomeItem"), categoria: v("#categoriaItem"), marca: v("#marcaItem"), unidadeMedida: v("#unidadeItem") || "un", precoEmbalagem: v("#precoItem"), quantidadeEmbalagem: v("#qtdEmbalagem"), quantidadeAtual: v("#qtdAtual"), quantidadeMinima: v("#qtdMinima") }); evento.target.reset(); mostrarStatus(document.querySelector("#statusEstoque"), "Item salvo no IndexedDB."); await carregar(); }
async function render() { const alertas = await listarAlertasEstoqueBaixo(); document.querySelector("#alertasEstoque").innerHTML = alertas.length ? alertas.map((i) => `<div class="alert-card">Estoque baixo: <strong>${escapar(i.nome)}</strong> (${i.quantidadeAtual} ${escapar(i.unidadeMedida)})</div>`).join("") : ""; const filtrados = itens.filter((i) => [i.nome, i.categoria, i.marca].join(" ").toLowerCase().includes(termo)); document.querySelector("#listaEstoque").innerHTML = filtrados.length ? filtrados.map(card).join("") : vazio("Nenhum item encontrado."); }
function card(item) { const resumo = calcularResumoEstoque(item); return `<article class="stock-card"><strong>${escapar(item.nome)}</strong><span>${escapar(item.categoria)} · ${escapar(item.marca || "Sem marca")}</span><div class="stock-meta"><span>Atual: ${resumo.quantidadeAtual} ${escapar(item.unidadeMedida)}</span><span>Custo unit.: ${formatarMoeda(resumo.custoUnitario)}</span><span>Valor em estoque: ${formatarMoeda(resumo.valorTotal)}</span><span>Mínimo: ${resumo.quantidadeMinima}</span></div><div class="stock-bar"><i style="width:${resumo.percentualMinimo}%"></i></div></article>`; }
function v(sel) { return document.querySelector(sel)?.value || ""; }
