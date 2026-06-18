import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData, chaveData } from "../shared/formatters.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, calcularValorTotalEstoque } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { listarAgendamentos } from "../services/agenda-service.js";
import { STATUS_AGENDAMENTO } from "../models/esquema-banco.js";
import { criarDocumentoMiShiro, adicionarDetalhes, adicionarLista, adicionarTitulo, finalizarDocumento } from "../shared/pdf-theme.js";

let dadosRelatorio = { itens: [], orcamentos: [], agendamentos: [] };

montarLayout({ paginaAtual: "relatorios", titulo: "Relatórios", subtitulo: "Indicadores" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  document.querySelector("#exportarRelatorioPdf")?.addEventListener("click", exportarPdf);
  await carregar();
}

async function carregar() {
  const [itens, orcamentos, agendamentos] = await Promise.all([listarItensEstoque(), listarOrcamentos(), listarAgendamentos()]);
  dadosRelatorio = { itens, orcamentos, agendamentos };
  texto("#investimentoEstoque", formatarMoeda(itens.reduce((total, item) => total + calcularValorTotalEstoque(item), 0)));
  texto("#totalItensEstoque", itens.length);
  texto("#qtdOrcamentos", orcamentos.length);
  renderizarCategorias(itens);
  renderizarEstoque(itens);
  renderizarAgenda(agendamentos);
}

function renderizarCategorias(itens) {
  const lista = Object.values(agruparPorCategoria(itens)).map((grupo) => ({ ...grupo, total: grupo.itens.reduce((total, item) => total + calcularValorTotalEstoque(item), 0) })).sort((a, b) => b.total - a.total);
  const maximo = Math.max(...lista.map((grupo) => grupo.total), 1);
  document.querySelector("#graficoCategorias").innerHTML = lista.length ? lista.map((grupo) => `<article class="report-row"><header><strong>${escapar(grupo.nome)}</strong><span>${formatarMoeda(grupo.total)}</span></header><p>${grupo.itens.length} ${grupo.itens.length === 1 ? "item cadastrado" : "itens cadastrados"}</p><div class="report-bar"><i style="width:${Math.max((grupo.total / maximo) * 100, 4).toFixed(0)}%"></i></div></article>`).join("") : vazio();
}

function renderizarEstoque(itens) {
  const falta = itens.filter((item) => Number(item.quantidadeAtual) <= 0);
  const baixo = itens.filter((item) => Number(item.quantidadeAtual) > 0 && Number(item.quantidadeAtual) <= Number(item.quantidadeMinima));
  const ok = itens.filter((item) => Number(item.quantidadeAtual) > Number(item.quantidadeMinima));
  texto("#itensEmFalta", falta.length);
  texto("#itensBaixos", baixo.length);
  texto("#itensOk", ok.length);
  renderizarFaltasAgrupadas(falta);
  renderizarLista("#listaBaixo", baixo, linhaEstoque);
}

function renderizarFaltasAgrupadas(itens) {
  const alvo = document.querySelector("#grupoFaltasCategoria");
  const grupos = Object.values(agruparPorCategoria(itens));
  alvo.innerHTML = grupos.length ? grupos.map((grupo) => `<section class="missing-category-group"><h3>${escapar(grupo.nome)} <small>(${grupo.itens.length})</small></h3>${grupo.itens.map((item) => `<article class="report-row"><header><strong>${escapar(item.nome)}</strong><span>0 ${escapar(item.unidadeMedida)}</span></header><p>Mínimo configurado: ${Number(item.quantidadeMinima)} ${escapar(item.unidadeMedida)}</p></article>`).join("")}</section>`).join("") : "<p class=\"empty-inline\">Nenhum item em falta.</p>";
}

function renderizarAgenda(agendamentos) {
  const hoje = new Date();
  const inicio = chaveData(hoje);
  const limite = chaveData(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7));
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const doMes = agendamentos.filter((item) => item.data?.startsWith(mes));
  const cancelados = doMes.filter((item) => item.status === STATUS_AGENDAMENTO.cancelado);
  const remarcados = doMes.filter((item) => item.status === STATUS_AGENDAMENTO.remarcado);
  const concluidos = doMes.filter((item) => [STATUS_AGENDAMENTO.concluido, STATUS_AGENDAMENTO.realizado].includes(item.status));
  const proximos = agendamentos.filter((item) => item.data >= inicio && item.data <= limite && item.status !== STATUS_AGENDAMENTO.cancelado).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`));
  texto("#totalAgendaMes", doMes.length);
  texto("#agendaCancelados", cancelados.length);
  texto("#agendaRemarcados", remarcados.length);
  texto("#agendaConcluidos", concluidos.length);
  texto("#agendaProximos", proximos.length);
  texto("#taxaCancelamento", `${doMes.length ? Math.round(cancelados.length / doMes.length * 100) : 0}%`);
  renderizarLista("#listaCancelamentos", cancelados, (item) => `<header><strong>${formatarData(item.data)}</strong><span>Cancelado</span></header><p>${escapar(item.motivoCancelamento || "Sem motivo informado")}</p>`);
  renderizarLista("#listaProximosAgenda", proximos.slice(0, 8), (item) => `<header><strong>${formatarData(item.data)} ${escapar(item.horaInicio || "")}</strong><span>${escapar(rotuloAgenda(item.status))}</span></header><p>${escapar(item.observacoes || "Atendimento agendado")}</p>`);
}

async function exportarPdf() {
  try {
    const { itens, orcamentos, agendamentos } = dadosRelatorio;
    const falta = itens.filter((item) => Number(item.quantidadeAtual) <= 0);
    const baixo = itens.filter((item) => Number(item.quantidadeAtual) > 0 && Number(item.quantidadeAtual) <= Number(item.quantidadeMinima));
    const investimento = itens.reduce((total, item) => total + calcularValorTotalEstoque(item), 0);
    const documento = await criarDocumentoMiShiro({ titulo: "Relatório do estúdio", subtitulo: "Estoque, orçamentos e agenda" });
    adicionarTitulo(documento, "Resumo operacional", "Consolidado gerado a partir do banco local do MiShiro Tattoo.");
    adicionarDetalhes(documento, [
      { rotulo: "Investimento em estoque", valor: formatarMoeda(investimento) },
      { rotulo: "Itens cadastrados", valor: itens.length },
      { rotulo: "Orçamentos registrados", valor: orcamentos.length },
      { rotulo: "Agendamentos", valor: agendamentos.length },
      { rotulo: "Itens em falta", valor: falta.length },
      { rotulo: "Estoque baixo", valor: baixo.length }
    ]);
    adicionarLista(documento, "Itens em falta", falta.map((item) => ({ nome: item.nome, detalhe: `${item.categoria} • mínimo ${item.quantidadeMinima} ${item.unidadeMedida}` })), { vazio: "Nenhum item em falta." });
    adicionarLista(documento, "Estoque baixo", baixo.map((item) => ({ nome: item.nome, detalhe: `${item.categoria} • atual ${item.quantidadeAtual} ${item.unidadeMedida} / mínimo ${item.quantidadeMinima}` })), { vazio: "Nenhum item com estoque baixo." });
    adicionarLista(documento, "Próximos agendamentos", agendamentos.filter((item) => item.status !== STATUS_AGENDAMENTO.cancelado).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`)).slice(0, 12).map((item) => ({ nome: `${formatarData(item.data)} ${item.horaInicio || ""}`, detalhe: `${rotuloAgenda(item.status)}${item.observacoes ? ` • ${item.observacoes}` : ""}` })), { vazio: "Nenhum agendamento ativo." });
    finalizarDocumento(documento, `relatorio-mishiro-${chaveData(new Date())}.pdf`);
  } catch (erro) {
    window.alert(erro.message || "Não foi possível exportar o relatório.");
  }
}

function agruparPorCategoria(itens) {
  return itens.reduce((grupos, item) => {
    const nome = item.categoria || "Sem categoria";
    if (!grupos[nome]) grupos[nome] = { nome, itens: [] };
    grupos[nome].itens.push(item);
    return grupos;
  }, {});
}

function linhaEstoque(item) { return `<header><strong>${escapar(item.nome)}</strong><span>${escapar(item.categoria)}</span></header><p>${Number(item.quantidadeAtual)} ${escapar(item.unidadeMedida)} em estoque · mínimo ${Number(item.quantidadeMinima)}</p>`; }
function renderizarLista(seletor, lista, formatador) {
  const alvo = document.querySelector(seletor);
  if (!alvo) return;
  alvo.innerHTML = lista.length ? lista.map((item) => `<article class="report-row compact-row">${formatador(item)}</article>`).join("") : vazio();
}
function vazio() { return "<p class=\"empty-inline\">Sem registros para exibir.</p>"; }
function rotuloAgenda(status) { return ({ agendado: "Agendado", confirmado: "Confirmado", remarcado: "Reagendado", realizado: "Realizado", concluido: "Concluído", cancelado: "Cancelado" })[status] || status || "Agenda"; }
function texto(seletor, conteudo) { const alvo = document.querySelector(seletor); if (alvo) alvo.textContent = conteudo; }
function escapar(valor) { return String(valor ?? "").replace(/[&<>\"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[caractere]); }
