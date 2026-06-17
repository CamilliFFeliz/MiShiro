import { iniciarBancoLocal } from "../modelos/banco-local.js";
import { exportarBackupCompleto, importarBackupCompleto, solicitarPersistenciaLocal } from "../modelos/backup-local.js";
import { listarAlertasEstoqueBaixo } from "../servicos/servico-estoque.js";
import { aceitarOrcamento, descontarEstoqueDoOrcamento, listarOrcamentos, marcarOrcamentoComoExportado, recusarOrcamento } from "../servicos/servico-orcamentos.js";
import { agendarOrcamento, listarAgendamentos } from "../servicos/servico-agendamentos.js";
import { STATUS_ORCAMENTO } from "../modelos/esquema-banco.js";

const STATUS_PIPELINE = [
  [STATUS_ORCAMENTO.rascunho, "Rascunhos"],
  [STATUS_ORCAMENTO.aguardandoCliente, "Aguardando cliente"],
  [STATUS_ORCAMENTO.aceito, "Aceitos"],
  [STATUS_ORCAMENTO.agendado, "Agendados"],
  [STATUS_ORCAMENTO.estoqueDescontado, "Estoque descontado"],
  [STATUS_ORCAMENTO.concluido, "Concluídos"],
  [STATUS_ORCAMENTO.recusado, "Recusados"]
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const FORMATADOR_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

let elementos = {};
let dataAgendaAtual = new Date();

export async function iniciarAplicacaoMvc() {
  await iniciarBancoLocal();
  criarNavegacaoMvc();
  criarTelasMvc();
  vincularEventosMvc();
  await renderizarTudoMvc();
}

function criarNavegacaoMvc() {
  const navegacao = document.querySelector(".sidebar-nav");
  if (!navegacao || document.querySelector("[data-screen-target='pipelineMvc']")) return;
  [["pipelineMvc", "kanban-square", "Pipeline"], ["agendaMvc", "calendar-days", "Agenda"], ["backupMvc", "database-backup", "Backup"]].forEach(([tela, icone, texto]) => {
    const botao = document.createElement("button");
    botao.className = "nav-link";
    botao.type = "button";
    botao.dataset.screenTarget = tela;
    botao.innerHTML = `<span aria-hidden="true"><i data-lucide="${icone}"></i></span>${texto}`;
    navegacao.append(botao);
  });
}

function criarTelasMvc() {
  const conteudo = document.querySelector(".content-shell");
  if (!conteudo || document.querySelector("#pipelineMvcScreen")) return;
  conteudo.insertAdjacentHTML("beforeend", `
    <section class="screen-panel tela-mvc" id="pipelineMvcScreen" data-screen="pipelineMvc">
      <div class="section-header"><div><span>MVC / Orçamentos</span><h2>Pipeline</h2></div><button class="secondary-button" id="atualizarPipelineMvc" type="button"><i data-lucide="refresh-cw"></i>Atualizar</button></div>
      <div class="alertas-estoque-mvc" id="alertasEstoqueMvc"></div>
      <div class="pipeline-mvc" id="pipelineMvc"></div>
    </section>
    <section class="screen-panel tela-mvc" id="agendaMvcScreen" data-screen="agendaMvc">
      <div class="section-header"><div><span>MVC / Agenda</span><h2>Agenda</h2></div><button class="secondary-button" id="atualizarAgendaMvc" type="button"><i data-lucide="refresh-cw"></i>Atualizar</button></div>
      <div class="agenda-cabecalho-mvc glass-panel">
        <button class="ghost-button" type="button" data-agenda-mes="anterior"><i data-lucide="chevron-left"></i>Anterior</button>
        <strong id="agendaMesAtualMvc"></strong>
        <button class="ghost-button" type="button" data-agenda-mes="proximo">Próximo<i data-lucide="chevron-right"></i></button>
      </div>
      <div class="agenda-resumo-mvc" id="agendaResumoMvc"></div>
      <div class="agenda-mvc calendario-mvc" id="agendaMvc"></div>
    </section>
    <section class="screen-panel tela-mvc" id="backupMvcScreen" data-screen="backupMvc">
      <div class="section-header"><div><span>MVC / Segurança dos dados</span><h2>Backup local</h2></div></div>
      <div class="backup-mvc glass-panel"><p>O GitHub Pages não grava banco no servidor. O MiShiro usa IndexedDB no navegador e backup JSON para proteção.</p><div class="backup-acoes-mvc"><button class="primary-button" id="exportarBackupMvc" type="button"><i data-lucide="download"></i>Exportar backup completo</button><button class="secondary-button" id="importarBackupMvc" type="button"><i data-lucide="upload"></i>Importar backup</button><button class="ghost-button" id="persistenciaMvc" type="button"><i data-lucide="shield-check"></i>Ativar persistência local</button></div><input id="arquivoBackupMvc" type="file" accept="application/json,.json" hidden /><p class="status-mvc" id="statusBackupMvc" aria-live="polite"></p></div>
    </section>
  `);
  elementos = { pipeline: document.querySelector("#pipelineMvc"), agenda: document.querySelector("#agendaMvc"), agendaMes: document.querySelector("#agendaMesAtualMvc"), agendaResumo: document.querySelector("#agendaResumoMvc"), alertas: document.querySelector("#alertasEstoqueMvc"), statusBackup: document.querySelector("#statusBackupMvc"), arquivoBackup: document.querySelector("#arquivoBackupMvc") };
  atualizarIcones();
}

function vincularEventosMvc() {
  document.addEventListener("click", async (evento) => {
    const destino = evento.target.closest("[data-screen-target]");
    if (destino) fecharMenuResponsivo();
    if (destino?.dataset.screenTarget?.endsWith("Mvc")) abrirTelaMvc(destino.dataset.screenTarget);
    const botaoMes = evento.target.closest("[data-agenda-mes]");
    if (botaoMes) await navegarMesAgenda(botaoMes.dataset.agendaMes);
    const acao = evento.target.closest("[data-acao-mvc]");
    if (acao) await executarAcaoMvc(acao.dataset.acaoMvc, acao.dataset.orcamentoId);
  });
  document.querySelector("#atualizarPipelineMvc")?.addEventListener("click", renderizarTudoMvc);
  document.querySelector("#atualizarAgendaMvc")?.addEventListener("click", renderizarAgendaMvc);
  document.querySelector("#exportarBackupMvc")?.addEventListener("click", async () => { await exportarBackupCompleto(); mostrarStatusBackup("Backup completo exportado."); });
  document.querySelector("#importarBackupMvc")?.addEventListener("click", () => elementos.arquivoBackup?.click());
  elementos.arquivoBackup?.addEventListener("change", importarBackupSelecionado);
  document.querySelector("#persistenciaMvc")?.addEventListener("click", async () => {
    const persistente = await solicitarPersistenciaLocal();
    mostrarStatusBackup(persistente ? "Armazenamento persistente ativado." : "O navegador não confirmou persistência. Faça backups regulares.");
  });
}

async function navegarMesAgenda(direcao) {
  const ajuste = direcao === "proximo" ? 1 : -1;
  dataAgendaAtual = new Date(dataAgendaAtual.getFullYear(), dataAgendaAtual.getMonth() + ajuste, 1);
  await renderizarAgendaMvc();
}

async function executarAcaoMvc(acao, orcamentoId) {
  try {
    if (acao === "exportado") await marcarOrcamentoComoExportado(orcamentoId);
    if (acao === "aceito") await aceitarOrcamento(orcamentoId);
    if (acao === "recusado") await recusarOrcamento(orcamentoId, window.prompt("Motivo da recusa:", "") || "");
    if (acao === "agendar") await agendarPeloPrompt(orcamentoId);
    if (acao === "descontar") await descontarEstoqueDoOrcamento(orcamentoId);
    await renderizarTudoMvc();
  } catch (erro) {
    window.alert(erro.message || "Não foi possível executar a ação.");
  }
}

async function agendarPeloPrompt(orcamentoId) {
  const data = window.prompt("Data da realização (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
  if (!data) return;
  const horaInicio = window.prompt("Hora de início:", "10:00") || "";
  const horaFim = window.prompt("Hora de fim:", "") || "";
  await agendarOrcamento(orcamentoId, { data, horaInicio, horaFim });
}

function abrirTelaMvc(nomeTela) {
  document.querySelectorAll(".screen-panel").forEach((painel) => painel.classList.toggle("is-active", painel.dataset.screen === nomeTela));
  document.querySelectorAll(".nav-link").forEach((botao) => botao.classList.toggle("is-active", botao.dataset.screenTarget === nomeTela));
  const titulo = nomeTela === "pipelineMvc" ? "Pipeline" : nomeTela === "agendaMvc" ? "Agenda" : "Backup";
  document.querySelector("#pageTitle").textContent = titulo;
  document.querySelector("#pageEyebrow").textContent = "MVC MiShiro";
  fecharMenuResponsivo();
}

async function renderizarTudoMvc() {
  await Promise.all([renderizarPipelineMvc(), renderizarAgendaMvc(), renderizarAlertasEstoqueMvc()]);
}

async function renderizarPipelineMvc() {
  if (!elementos.pipeline) return;
  const orcamentos = await listarOrcamentos();
  elementos.pipeline.innerHTML = STATUS_PIPELINE.map(([status, titulo]) => {
    const lista = orcamentos.filter((orcamento) => orcamento.status === status);
    return `<article class="coluna-pipeline-mvc"><header><strong>${titulo}</strong><span>${lista.length}</span></header>${lista.map(renderizarCardOrcamento).join("") || "<p class='vazio-mvc'>Sem registros.</p>"}</article>`;
  }).join("");
}

async function renderizarAgendaMvc() {
  if (!elementos.agenda) return;
  const [agendamentos, orcamentos] = await Promise.all([listarAgendamentos(), listarOrcamentos()]);
  const orcamentosPorId = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const ano = dataAgendaAtual.getFullYear();
  const mes = dataAgendaAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(ano, mes, 1 - primeiroDia.getDay());
  const dias = Array.from({ length: 42 }, (_, indice) => new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + indice));
  const agendamentosMes = agendamentos.filter((item) => converterData(item.data)?.getMonth() === mes && converterData(item.data)?.getFullYear() === ano);

  if (elementos.agendaMes) elementos.agendaMes.textContent = capitalizar(FORMATADOR_MES.format(dataAgendaAtual));
  if (elementos.agendaResumo) elementos.agendaResumo.innerHTML = `<article><strong>${agendamentosMes.length}</strong><span>agendamentos no mês</span></article><article><strong>${contarProximosAgendamentos(agendamentos)}</strong><span>próximos 7 dias</span></article><article><strong>${agendamentos.filter((item) => item.status === "agendado").length}</strong><span>pendentes</span></article>`;

  elementos.agenda.innerHTML = `<div class="agenda-semana-mvc">${DIAS_SEMANA.map((dia) => `<span>${dia}</span>`).join("")}</div><div class="agenda-grade-mvc">${dias.map((dia) => renderizarDiaCalendario(dia, mes, agendamentos, orcamentosPorId)).join("")}</div>`;
}

function renderizarDiaCalendario(dia, mesAtual, agendamentos, orcamentosPorId) {
  const chave = formatarDataChave(dia);
  const eventos = agendamentos.filter((item) => item.data === chave);
  const foraDoMes = dia.getMonth() !== mesAtual;
  const hoje = chave === new Date().toISOString().slice(0, 10);
  return `<article class="dia-agenda-mvc ${foraDoMes ? "fora-mes" : ""} ${hoje ? "hoje" : ""}"><header><strong>${dia.getDate()}</strong>${eventos.length ? `<span>${eventos.length}</span>` : ""}</header><div>${eventos.map((evento) => renderizarEventoCalendario(evento, orcamentosPorId.get(evento.orcamentoId))).join("")}</div></article>`;
}

function renderizarEventoCalendario(evento, orcamento) {
  return `<section class="evento-agenda-mvc"><strong>${evento.horaInicio || "Horário"}</strong><span>${orcamento?.clienteNomeSnapshot || "Cliente"}</span><small>${orcamento?.nome || "Orçamento"}</small></section>`;
}

async function renderizarAlertasEstoqueMvc() {
  if (!elementos.alertas) return;
  const alertas = await listarAlertasEstoqueBaixo();
  elementos.alertas.innerHTML = alertas.length ? `<strong>Alertas de estoque baixo</strong>${alertas.map((item) => `<span>${item.nome}: ${item.quantidadeAtual} ${item.unidadeMedida}</span>`).join("")}` : "<span>Sem alertas de estoque baixo no banco MVC.</span>";
}

function renderizarCardOrcamento(orcamento) {
  return `<section class="card-orcamento-mvc"><strong>${orcamento.nome}</strong><span>${orcamento.clienteNomeSnapshot || "Cliente não informado"}</span><p>Valor: ${formatarMoeda(orcamento.valorFinalSnapshot)}</p><div class="acoes-card-mvc">${renderizarAcoes(orcamento)}</div></section>`;
}

function renderizarAcoes(orcamento) {
  const id = orcamento.id;
  if (orcamento.status === STATUS_ORCAMENTO.rascunho) return `<button data-acao-mvc="exportado" data-orcamento-id="${id}">Marcar enviado</button>`;
  if (orcamento.status === STATUS_ORCAMENTO.aguardandoCliente) return `<button data-acao-mvc="aceito" data-orcamento-id="${id}">Cliente aceitou</button><button data-acao-mvc="recusado" data-orcamento-id="${id}">Cliente recusou</button>`;
  if (orcamento.status === STATUS_ORCAMENTO.aceito) return `<button data-acao-mvc="agendar" data-orcamento-id="${id}">Agendar</button>`;
  if (orcamento.status === STATUS_ORCAMENTO.agendado) return `<button data-acao-mvc="descontar" data-orcamento-id="${id}">Descontar uso</button>`;
  return "";
}

async function importarBackupSelecionado(evento) {
  const arquivo = evento.target.files?.[0];
  if (!arquivo) return;
  if (!window.confirm("Importar este backup substituindo os dados MVC atuais?")) return;
  await importarBackupCompleto(arquivo, "substituir");
  mostrarStatusBackup("Backup importado com sucesso.");
  await renderizarTudoMvc();
}

function fecharMenuResponsivo() {
  const menu = document.querySelector("#sidebar");
  const fundo = document.querySelector("#drawerBackdrop");
  menu?.classList.remove("is-open");
  if (fundo) fundo.hidden = true;
}

function mostrarStatusBackup(mensagem) {
  if (elementos.statusBackup) elementos.statusBackup.textContent = mensagem;
}

function converterData(valor) {
  if (!valor) return null;
  const data = new Date(`${valor}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataChave(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function contarProximosAgendamentos(agendamentos) {
  const hoje = new Date();
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7);
  return agendamentos.filter((item) => { const data = converterData(item.data); return data && data >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) && data <= limite; }).length;
}

function capitalizar(texto) {
  return String(texto || "").replace(/^./, (letra) => letra.toUpperCase());
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor) || 0);
}

function atualizarIcones() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
