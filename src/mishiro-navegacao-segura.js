const TELAS_PRINCIPAIS = {
  home: { titulo: "Início", subtitulo: "Visão geral", icone: "layout-dashboard", rotulo: "Início" },
  reports: { titulo: "Relatórios", subtitulo: "Indicadores", icone: "chart-no-axes-combined", rotulo: "Relatórios" },
  inventory: { titulo: "Estoque", subtitulo: "Banco local", icone: "package-search", rotulo: "Estoque" },
  budget: { titulo: "Orçamento", subtitulo: "Ficha do cliente", icone: "file-pen-line", rotulo: "Orçamento" }
};

const TELAS_MVC = new Set(["pipelineMvc", "agendaMvc", "backupMvc"]);

export function iniciarNavegacaoSegura() {
  garantirBotaoOrcamentoNoMenu();
  vincularNavegacaoSegura();
}

function garantirBotaoOrcamentoNoMenu() {
  const navegacao = document.querySelector(".sidebar-nav");
  if (!navegacao || navegacao.querySelector("[data-screen-target='budget']")) return;

  const referencia = navegacao.querySelector("[data-screen-target='inventory']") || navegacao.lastElementChild;
  const botao = criarBotaoNavegacao("budget");

  if (referencia?.after) {
    referencia.after(botao);
  } else {
    navegacao.append(botao);
  }

  atualizarIcones();
}

function criarBotaoNavegacao(nomeTela) {
  const meta = TELAS_PRINCIPAIS[nomeTela];
  const botao = document.createElement("button");
  botao.className = "nav-link";
  botao.type = "button";
  botao.dataset.screenTarget = nomeTela;
  botao.innerHTML = `<span aria-hidden="true"><i data-lucide="${meta.icone}"></i></span>${meta.rotulo}`;
  return botao;
}

function vincularNavegacaoSegura() {
  document.addEventListener("click", (evento) => {
    const acionadorHome = evento.target.closest("[data-home-action]");
    const acionadorMenu = evento.target.closest("[data-screen-target]");
    const destino = acionadorHome?.dataset.homeAction || acionadorMenu?.dataset.screenTarget || "";

    if (!destino || TELAS_MVC.has(destino)) return;
    if (!Object.prototype.hasOwnProperty.call(TELAS_PRINCIPAIS, destino)) return;

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();
    abrirTelaPrincipal(destino);
  }, true);
}

function abrirTelaPrincipal(nomeTela) {
  const meta = TELAS_PRINCIPAIS[nomeTela];
  const tela = document.querySelector(`[data-screen='${nomeTela}']`);

  if (!meta || !tela) {
    console.warn(`MiShiro: tela não encontrada para navegação: ${nomeTela}`);
    return;
  }

  document.querySelectorAll(".screen-panel").forEach((painel) => {
    painel.classList.toggle("is-active", painel.dataset.screen === nomeTela);
  });

  document.querySelectorAll(".nav-link").forEach((botao) => {
    botao.classList.toggle("is-active", botao.dataset.screenTarget === nomeTela);
  });

  const titulo = document.querySelector("#pageTitle");
  const subtitulo = document.querySelector("#pageEyebrow");
  const botaoNovoItem = document.querySelector("#quickNewItemButton");

  if (titulo) titulo.textContent = meta.titulo;
  if (subtitulo) subtitulo.textContent = meta.subtitulo;
  if (botaoNovoItem) botaoNovoItem.hidden = nomeTela !== "inventory";

  fecharMenuResponsivo();
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (nomeTela === "budget") {
    prepararTelaOrcamento();
  }

  atualizarIcones();
}

function prepararTelaOrcamento() {
  const tela = document.querySelector("#budgetScreen");
  if (!tela) return;

  tela.classList.add("budget-screen-ready");

  const primeiroCampo = tela.querySelector("#budgetNameInput, #clientNameInput");
  if (primeiroCampo && window.matchMedia("(min-width: 768px)").matches) {
    window.setTimeout(() => primeiroCampo.focus({ preventScroll: true }), 180);
  }
}

function fecharMenuResponsivo() {
  const menu = document.querySelector("#sidebar");
  const fundo = document.querySelector("#drawerBackdrop");
  menu?.classList.remove("is-open");
  if (fundo) fundo.hidden = true;
}

function atualizarIcones() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}
