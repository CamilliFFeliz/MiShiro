import { montarLayout } from "../shared/layout.js";
import { formatarMoeda, formatarData, chaveData } from "../shared/formatters.js";
import { vazio, escapar, atualizarIcones } from "../shared/ui.js";
import { iniciarBancoLocal } from "../models/banco-local.js";
import { listarItensEstoque, listarAlertasEstoqueBaixo } from "../services/estoque-service.js";
import { listarOrcamentos } from "../services/orcamentos-service.js";
import { listarAgendamentos } from "../services/agenda-service.js";
import { STATUS_AGENDAMENTO, STATUS_ORCAMENTO } from "../models/esquema-banco.js";

montarLayout({ paginaAtual: "dashboard", titulo: "Início", subtitulo: "Dashboard" });
iniciar();

async function iniciar() {
  await iniciarBancoLocal();
  const [itens, orcamentos, agenda, alertas] = await Promise.all([
    listarItensEstoque(),
    listarOrcamentos(),
    listarAgendamentos(),
    listarAlertasEstoqueBaixo()
  ]);

  prepararIdentidadeHero();
  prepararAtalhos();
  preencherIndicadores(itens, orcamentos, agenda, alertas);
  renderizarAlertaRapido(agenda, alertas, orcamentos);
  renderizarAgenda(agenda, orcamentos);
  renderizarOrcamentos(orcamentos);
  atualizarIcones();
}

function prepararIdentidadeHero() {
  const marca = document.querySelector(".page-hero__brand");
  if (!marca || marca.dataset.temaPreparado === "true") return;
  marca.dataset.temaPreparado = "true";
  marca.replaceChildren(criarLogo("img/mishiro-logo-claro.jpg", "MiShiro Tattoo"));
}

function criarLogo(src, alt) {
  const imagem = document.createElement("img");
  imagem.src = src;
  imagem.alt = alt;
  imagem.addEventListener("error", () => {
    imagem.src = "img/mishiro-logo-escuro.jpg";
  }, { once: true });
  return imagem;
}

function prepararAtalhos() {
  const actions = document.querySelector(".dashboard-hero .action-row");
  if (actions && !actions.querySelector("[href='pages/relatorios.html']")) {
    const relatorios = document.createElement("a");
    relatorios.className = "button button-ghost";
    relatorios.href = "pages/relatorios.html";
    relatorios.innerHTML = '<i data-lucide="chart-no-axes-combined"></i>Relatórios';
    actions.append(relatorios);
  }

  tornarClicavel(".quick-alert:nth-child(1)", "pages/agenda.html", "Abrir agenda");
  tornarClicavel(".quick-alert:nth-child(2)", "pages/estoque.html", "Abrir estoque");
  tornarClicavel("#totalOrcamentos", "pages/agenda.html", "Abrir orçamentos aguardando aprovação", true);
  tornarClicavel("#totalAgenda", "pages/agenda.html", "Abrir agendamentos do mês", true);
}

function tornarClicavel(seletor, destino, rotulo, usarPai = false) {
  const elemento = document.querySelector(seletor);
  const alvo = usarPai ? elemento?.closest(".metric-card") : elemento;
  if (!alvo || alvo.dataset.atalhoPreparado === "true") return;
  alvo.dataset.atalhoPreparado = "true";
  alvo.classList.add("quick-alert--link");
  alvo.tabIndex = 0;
  alvo.setAttribute("role", "link");
  alvo.setAttribute("aria-label", rotulo);
  alvo.addEventListener("click", () => { window.location.href = destino; });
  alvo.addEventListener("keydown", (evento) => {
    if (!["Enter", " "].includes(evento.key)) return;
    evento.preventDefault();
    window.location.href = destino;
  });
}

function preencherIndicadores(itens, orcamentos, agenda, alertas) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const aguardando = orcamentos.filter((orcamento) => orcamento.status === STATUS_ORCAMENTO.aguardandoCliente);
  const agendamentosMes = agenda.filter((evento) => evento.data?.startsWith(mesAtual) && eventoAtivo(evento));

  texto("#totalEstoque", itens.length);
  texto("#totalOrcamentos", aguardando.length);
  texto("#totalAgenda", agendamentosMes.length);
  texto("#totalAlertas", alertas.length);
  ajustarCartaoMetrica("#totalEstoque", "Itens no estoque", "Insumos cadastrados no IndexedDB.");
  ajustarCartaoMetrica("#totalOrcamentos", "Aguardando aprovação", "Propostas prontas para uma decisão.");
  ajustarCartaoMetrica("#totalAgenda", "Agendamentos do mês", "Sessões ativas no mês atual.");
  ajustarCartaoMetrica("#totalAlertas", "Estoque baixo", "Itens abaixo do mínimo definido.");
}

function ajustarCartaoMetrica(seletor, titulo, descricao) {
  const numero = document.querySelector(seletor);
  const cartao = numero?.closest(".metric-card");
  if (!cartao) return;
  const [rotulo, textoDescritivo] = cartao.querySelectorAll("span, p");
  if (rotulo) rotulo.textContent = titulo;
  if (textoDescritivo) textoDescritivo.textContent = descricao;
}

function renderizarAlertaRapido(agenda, alertas, orcamentos) {
  const hoje = chaveData(new Date());
  const proximos = agenda.filter((item) => eventoAtivo(item) && item.data >= hoje).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`));
  const proximo = proximos[0];
  const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const orcamento = proximo ? mapa.get(proximo.orcamentoId) : null;
  texto("#alertaProximoAgendamento", proximo ? `${formatarData(proximo.data)} às ${proximo.horaInicio || "—"}` : "Sem sessão marcada");
  texto("#alertaProximoDetalhe", proximo ? `${orcamento?.clienteNomeSnapshot || "Cliente"} · ${orcamento?.nome || "Orçamento"}` : "Cadastre ou aprove um orçamento para agendar.");
  texto("#alertaEstoqueBaixo", `${alertas.length} ${alertas.length === 1 ? "item" : "itens"}`);
  texto("#alertaEstoqueDetalhe", alertas.length ? alertas.slice(0, 2).map((item) => item.nome).join(" · ") : "Nenhum alerta no momento.");
}

function renderizarAgenda(agenda, orcamentos) {
  const mapa = new Map(orcamentos.map((orcamento) => [orcamento.id, orcamento]));
  const hoje = chaveData(new Date());
  const lista = agenda.filter((item) => eventoAtivo(item) && item.data >= hoje).sort((a, b) => `${a.data} ${a.horaInicio}`.localeCompare(`${b.data} ${b.horaInicio}`)).slice(0, 4);
  document.querySelector("#listaAgenda").innerHTML = lista.length ? lista.map((item) => {
    const orcamento = mapa.get(item.orcamentoId);
    return `<article class="note-card"><strong>${formatarData(item.data)} ${escapar(item.horaInicio || "")}</strong><span>${escapar(orcamento?.clienteNomeSnapshot || "Cliente não informado")} · ${escapar(orcamento?.nome || "Orçamento")}</span></article>`;
  }).join("") : vazio("Nenhum agendamento registrado ainda.");
}

function renderizarOrcamentos(orcamentos) {
  const lista = orcamentos.slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 4);
  document.querySelector("#listaOrcamentos").innerHTML = lista.length ? lista.map((item) => `<article class="note-card"><strong>${escapar(item.nome)}</strong><span>${escapar(rotuloStatus(item.status))} · ${formatarMoeda(item.valorFinalSnapshot)}</span></article>`).join("") : vazio("Nenhum orçamento salvo ainda.");
}

function eventoAtivo(evento) {
  return ![STATUS_AGENDAMENTO.cancelado, STATUS_AGENDAMENTO.remarcado].includes(evento.status);
}

function rotuloStatus(status) {
  return ({ aguardando_cliente: "Aguardando aprovação", aceito: "Para agendar", agendado: "Agendado", concluido: "Concluído", recusado: "Recusado" })[status] || status;
}

function texto(seletor, conteudo) {
  const alvo = document.querySelector(seletor);
  if (alvo) alvo.textContent = conteudo;
}
