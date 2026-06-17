import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData, chaveData } from "../shared/formatters.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularValorTotalEstoque } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { listarAgendamentos } from "../services/agenda-service.js";
import { STATUS_AGENDAMENTO } from "../models/esquema-banco.js";

montarLayout({ paginaAtual: "relatorios", titulo: "Relatórios", subtitulo: "Indicadores" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  const [itens, orcamentos, agendamentos] = await Promise.all([listarItensEstoque(), listarOrcamentos(), listarAgendamentos()]);
  setText("#investimentoEstoque", formatarMoeda(itens.reduce((total, item) => total + calcularValorTotalEstoque(item), 0)));
  setText("#totalItensEstoque", itens.length);
  setText("#qtdOrcamentos", orcamentos.length);
  renderCategorias(itens);
  renderSaudeEstoque(itens);
  renderAgenda(agendamentos);
}

function renderCategorias(itens) {
  const grupos = new Map();
  itens.forEach((item) => {
    const categoria = item.categoria || "Sem categoria";
    const atual = grupos.get(categoria) || { nome: categoria, total: 0, quantidade: 0 };
    atual.total += calcularValorTotalEstoque(item);
    atual.quantidade += 1;
    grupos.set(categoria, atual);
  });
  const lista = Array.from(grupos.values()).sort((a, b) => b.total - a.total);
  const max = Math.max(...lista.map((item) => item.total), 1);
  renderLista("#graficoCategorias", lista, (item) => `<header><strong>${escapeHtml(item.nome)}</strong><span>${formatarMoeda(item.total)}</span></header><p>${item.quantidade} ${item.quantidade === 1 ? "item cadastrado" : "itens cadastrados"}</p><div class="report-bar"><i style="width:${Math.max((item.total / max) * 100, 4).toFixed(0)}%"></i></div>`);
}

function renderSaudeEstoque(itens) {
  const falta = itens.filter((item) => Number(item.quantidadeAtual) <= 0);
  const baixo = itens.filter((item) => Number(item.quantidadeAtual) > 0 && Number(item.quantidadeAtual) <= Number(item.quantidadeMinima));
  const ok = itens.filter((item) => Number(item.quantidadeAtual) > Number(item.quantidadeMinima));
  setText("#itensEmFalta", falta.length);
  setText("#itensBaixos", baixo.length);
  setText("#itensOk", ok.length);
  renderLista("#listaEmFalta", falta, itemLinhaEstoque);
  renderLista("#listaBaixo", baixo, itemLinhaEstoque);
}

function itemLinhaEstoque(item) {
  return `<header><strong>${escapeHtml(item.nome)}</strong><span>${escapeHtml(item.categoria)}</span></header><p>${Number(item.quantidadeAtual)} ${escapeHtml(item.unidadeMedida)} em estoque · mínimo ${Number(item.quantidadeMinima)}</p>`;
}

function renderAgenda(agendamentos) {
  const hoje = new Date();
  const inicioHoje = chaveData(hoje);
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7);
  const fimSemana = chaveData(limite);
  const prefixoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const doMes = agendamentos.filter((item) => item.data && item.data.indexOf(prefixoMes) === 0);
  const cancelados = doMes.filter((item) => item.status === STATUS_AGENDAMENTO.cancelado);
  const remarcados = doMes.filter((item) => item.status === STATUS_AGENDAMENTO.remarcado);
  const concluidos = doMes.filter((item) => item.status === STATUS_AGENDAMENTO.concluido || item.status === STATUS_AGENDAMENTO.realizado);
  const proximos = agendamentos.filter((item) => item.data >= inicioHoje && item.data <= fimSemana && item.status !== STATUS_AGENDAMENTO.cancelado).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  setText("#totalAgendaMes", doMes.length);
  setText("#agendaCancelados", cancelados.length);
  setText("#agendaRemarcados", remarcados.length);
  setText("#agendaConcluidos", concluidos.length);
  setText("#agendaProximos", proximos.length);
  setText("#taxaCancelamento", `${doMes.length ? Math.round((cancelados.length / doMes.length) * 100) : 0}%`);
  renderLista("#listaCancelamentos", cancelados, (item) => `<header><strong>${formatarData(item.data)}</strong><span>Cancelado</span></header><p>${escapeHtml(item.motivoCancelamento || "Sem motivo informado")}</p>`);
  renderLista("#listaProximosAgenda", proximos.slice(0, 8), (item) => `<header><strong>${formatarData(item.data)} ${escapeHtml(item.horaInicio || "")}</strong><span>${escapeHtml(rotuloAgenda(item.status))}</span></header><p>${escapeHtml(item.observacoes || "Atendimento agendado")}</p>`);
}

function renderLista(selector, lista, formatador) {
  const alvo = document.querySelector(selector);
  if (!alvo) return;
  alvo.replaceChildren();
  if (!lista.length) {
    const estado = document.createElement("p");
    estado.className = "empty-state report-empty-state";
    estado.textContent = "Sem registros para exibir.";
    alvo.append(estado);
    return;
  }
  lista.forEach((item) => {
    const artigo = document.createElement("article");
    artigo.className = "report-row compact-row";
    artigo.innerHTML = formatador(item);
    alvo.append(artigo);
  });
}

function rotuloAgenda(status) {
  return ({ agendado: "Agendado", confirmado: "Confirmado", remarcado: "Remarcado", realizado: "Realizado", concluido: "Concluído", cancelado: "Cancelado" })[status] || status || "Agenda";
}

function setText(selector, valor) {
  const alvo = document.querySelector(selector);
  if (alvo) alvo.textContent = valor;
}

function escapeHtml(valor) {
  return String(valor ?? "").replace(/[&<>'"]/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[caractere]);
}
