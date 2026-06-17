const PAGINAS = [
  ["dashboard", "Início", "layout-dashboard", "index.html"],
  ["orcamentos", "Orçamentos", "file-pen-line", "pages/orcamentos.html"],
  ["estoque", "Estoque", "package-search", "pages/estoque.html"],
  ["agenda", "Agenda", "calendar-days", "pages/agenda.html"],
  ["pipeline", "Pipeline", "kanban-square", "pages/pipeline.html"],
  ["relatorios", "Relatórios", "chart-no-axes-combined", "pages/relatorios.html"],
  ["backup", "Backup", "database-backup", "pages/backup.html"],
  ["configuracoes", "Configurações", "settings", "pages/configuracoes.html"]
];

export function montarLayout({ paginaAtual, titulo, subtitulo }) {
  aplicarTemaInicial();
  const app = document.querySelector("#app");
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
  topbar.innerHTML = `<button class="icon-button mobile-menu-button" id="openSidebarButton" type="button" aria-label="Abrir menu"><i data-lucide="menu"></i></button><div class="topbar-title"><span>${subtitulo || "MiShiro Tattoo"}</span><strong>${titulo || "Painel"}</strong></div><div class="topbar-actions"><button class="icon-button" id="themeToggleButton" type="button" aria-label="Alternar tema"><i data-lucide="moon"></i></button></div>`;
  document.body.prepend(drawer, sidebar);
  app.prepend(topbar);
  document.querySelector("#openSidebarButton")?.addEventListener("click", abrirMenu);
  drawer.addEventListener("click", fecharMenu);
  document.querySelector("#themeToggleButton")?.addEventListener("click", alternarTema);
  window.lucide?.createIcons?.();
}

function criarSidebar(base, atual) {
  return `<div class="brand-block"><div class="brand-mark"><img src="${base}img/mishiro-simbolo-escuro.jpg.jpg" alt="" /></div><div><strong>MiShiro Tattoo</strong><span>Gestão local do estúdio</span></div></div><nav class="sidebar-nav">${PAGINAS.map(([id, nome, icone, href]) => `<a class="nav-link ${id === atual ? "is-active" : ""}" href="${base}${href}"><span><i data-lucide="${icone}"></i></span>${nome}</a>`).join("")}</nav><div class="sidebar-footer"><span>IndexedDB</span><strong>Dados salvos no navegador</strong></div>`;
}

function obterBase() { return location.pathname.includes("/pages/") ? "../" : "./"; }
function abrirMenu() { document.querySelector("#sidebar")?.classList.add("is-open"); const drawer = document.querySelector("#drawerBackdrop"); if (drawer) drawer.hidden = false; }
function fecharMenu() { document.querySelector("#sidebar")?.classList.remove("is-open"); const drawer = document.querySelector("#drawerBackdrop"); if (drawer) drawer.hidden = true; }
function aplicarTemaInicial() { const tema = localStorage.getItem("MISHIRO_TEMA") || localStorage.getItem("CALCULADORA_TATTOO_THEME") || "dark"; document.documentElement.dataset.theme = tema === "light" ? "light" : "dark"; }
function alternarTema() { const atual = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = atual; localStorage.setItem("MISHIRO_TEMA", atual); localStorage.setItem("CALCULADORA_TATTOO_THEME", atual); }
