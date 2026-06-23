const PAGINAS = [
  ["dashboard", "Início", "layout-dashboard", "index.html"],
  ["orcamentos", "Orçamentos", "file-pen-line", "pages/orcamentos.html"],
  ["estoque", "Estoque", "package-search", "pages/estoque.html"],
  ["agenda", "Agenda", "calendar-days", "pages/agenda.html"],
  ["relatorios", "Relatórios", "chart-no-axes-combined", "pages/relatorios.html"],
  ["backup", "Backup", "database-backup", "pages/backup.html"],
  ["configuracoes", "Configurações", "settings", "pages/configuracoes.html"]
];

export function montarLayout({ paginaAtual, titulo, subtitulo }) {
  aplicarTemaInicial();
  carregarDesignGlobal();
  const app = document.getElementById("app");
  if (!app || document.querySelector(".app-sidebar")) return;

  const base = obterBase();
  const drawer = document.createElement("div");
  drawer.className = "drawer-backdrop";
  drawer.hidden = true;
  drawer.id = "drawerBackdrop";

  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar";
  sidebar.id = "sidebar";
  sidebar.innerHTML = criarSidebar(base, paginaAtual);

  const topbar = document.createElement("header");
  topbar.className = "app-topbar";
  topbar.innerHTML = '<button class="icon-button mobile-menu-button" id="openSidebarButton" type="button" aria-label="Abrir menu"><i data-lucide="menu"></i></button><div class="topbar-title"><span>' + (subtitulo || "MiShiro Tattoo") + '</span><strong>' + (titulo || "Painel") + '</strong></div><div class="topbar-actions"><button class="icon-button" id="themeToggleButton" type="button" aria-label="Alternar tema"><i data-lucide="moon"></i></button></div>';

  document.body.prepend(drawer, sidebar);
  app.prepend(topbar);
  document.getElementById("openSidebarButton")?.addEventListener("click", abrirMenu);
  drawer.addEventListener("click", fecharMenu);
  document.getElementById("themeToggleButton")?.addEventListener("click", alternarTema);
  atualizarControleTema();
  window.lucide?.createIcons?.();
}

function criarSidebar(base, atual) {
  return '<div class="brand-block"><div class="brand-mark"><img src="' + base + 'img/mishiro-simbolo-claro.jpg" alt="MiShiro Tattoo" /></div><div><strong>MiShiro Tattoo</strong><span>Gestão local do estúdio</span></div></div><nav class="sidebar-nav">' + PAGINAS.map(function(pagina) { var id = pagina[0]; var nome = pagina[1]; var icone = pagina[2]; var href = pagina[3]; var ativo = id === atual; return '<a class="nav-link ' + (ativo ? 'is-active' : '') + '" href="' + base + href + '" ' + (ativo ? 'aria-current="page"' : '') + '><span><i data-lucide="' + icone + '"></i></span>' + nome + '</a>'; }).join('') + '</nav><div class="sidebar-footer"><span>IndexedDB</span><strong>Dados salvos no navegador</strong></div>';
}

function carregarDesignGlobal() {
  carregarCssFinal("mishiro-clean-ui-css", "assets/css/app-clean.css?v=20260623.3");
}

function carregarCssFinal(id, caminho) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = obterBase() + caminho;
  document.head.append(link);
}

function obterBase() {
  return location.pathname.includes("/pages/") ? "../" : "./";
}

function abrirMenu() {
  document.getElementById("sidebar")?.classList.add("is-open");
  const drawer = document.getElementById("drawerBackdrop");
  if (drawer) drawer.hidden = false;
}

function fecharMenu() {
  document.getElementById("sidebar")?.classList.remove("is-open");
  const drawer = document.getElementById("drawerBackdrop");
  if (drawer) drawer.hidden = true;
}

function aplicarTemaInicial() {
  const tema = localStorage.getItem("MISHIRO_TEMA") || localStorage.getItem("CALCULADORA_TATTOO_THEME") || "dark";
  document.documentElement.dataset.theme = tema === "light" ? "light" : "dark";
}

function alternarTema() {
  const atual = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = atual;
  localStorage.setItem("MISHIRO_TEMA", atual);
  localStorage.setItem("CALCULADORA_TATTOO_THEME", atual);
  atualizarControleTema();
}

function atualizarControleTema() {
  const botao = document.getElementById("themeToggleButton");
  if (!botao) return;
  const claro = document.documentElement.dataset.theme === "light";
  botao.setAttribute("aria-label", claro ? "Alternar para tema escuro" : "Alternar para tema claro");
  botao.setAttribute("title", claro ? "Alternar para tema escuro" : "Alternar para tema claro");
  const icone = botao.querySelector("i");
  if (icone) icone.setAttribute("data-lucide", claro ? "sun" : "moon");
  window.lucide?.createIcons?.();
}
