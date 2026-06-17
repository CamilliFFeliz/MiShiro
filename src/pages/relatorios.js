import { montarLayout } from "../shared/layout.js";
import { formatarMoeda } from "../shared/formatters.js";
import { vazio, escapar } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularCustoUnitario } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";

montarLayout({ paginaAtual: "relatorios", titulo: "Relatórios", subtitulo: "Indicadores" });
iniciar();
async function iniciar(){ await iniciarBancoLocal(); const [itens, orcamentos] = await Promise.all([listarItensEstoque(), listarOrcamentos()]); const total = itens.reduce((s,i)=>s + (Number(i.precoEmbalagem)||0),0); document.querySelector("#investimentoEstoque").textContent = formatarMoeda(total); document.querySelector("#qtdOrcamentos").textContent = orcamentos.length; const categorias = agrupar(itens); const principal = categorias[0]; document.querySelector("#categoriaPrincipal").textContent = principal?.categoria || "Sem dados"; document.querySelector("#valorCategoria").textContent = formatarMoeda(principal?.total || 0); renderCategorias(categorias); }
function agrupar(itens){ const mapa = new Map(); itens.forEach((item)=>{ const categoria = item.categoria || "Sem categoria"; const valor = (Number(item.precoEmbalagem)||0); mapa.set(categoria, (mapa.get(categoria)||0)+valor); }); return Array.from(mapa, ([categoria,total])=>({categoria,total})).sort((a,b)=>b.total-a.total); }
function renderCategorias(categorias){ const max = Math.max(...categorias.map(c=>c.total),1); document.querySelector("#graficoCategorias").innerHTML = categorias.length ? categorias.map((c)=>`<article class="report-row"><header><strong>${escapar(c.categoria)}</strong><span>${formatarMoeda(c.total)}</span></header><div class="report-bar"><i style="width:${Math.max((c.total/max)*100,4)}%"></i></div></article>`).join("") : vazio("Sem itens para gerar relatório."); }
