const PAGINAS = [
  ["dashboard", "Início", "layout-dashboard", "index.html"],
  ["orcamentos", "Orçamentos", "file-pen-line", "pages/orcamentos.html"],
  ["estoque", "Estoque", "package-search", "pages/estoque.html"],
  ["agenda", "Agenda", "calendar-days", "pages/agenda.html"],
  ["relatorios", "Relatórios", "chart-no-axes-combined", "pages/relatorios.html"],
  ["backup", "Backup", "database-backup", "pages/backup.html"],
  ["configuracoes", "Configurações", "settings", "pages/configuracoes.html"]
];
const PAGINAS_MOBILE = ["dashboard", "orcamentos", "estoque", "agenda", "relatorios"];

export function montarLayout({ paginaAtual, titulo, subtitulo }) {
  aplicarTemaInicial();
  const app = document.querySelector("#app");
  if (!app || document.querySelector(".app-sidebar")) return;
  const base = obterBase();
  const drawer = document.createElement("div");
  drawer.className = "drawer-backdrop"; drawer.hidden = true; drawer.id = "drawerBackdrop";
  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar"; sidebar.id = "sidebar"; sidebar.innerHTML = criarSidebar(base, paginaAtual);
  const topbar = document.createElement("header");
  topbar.className = "app-topbar";
  topbar.innerHTML = `<button class="icon-button mobile-menu-button" id="openSidebarButton" type="button" aria-label="Abrir menu"><i data-lucide="menu"></i></button><div class="topbar-title"><span>${subtitulo || "MiShiro Tattoo"}</span><strong>${titulo || "Painel"}</strong></div><div class="topbar-actions"><button class="icon-button" id="themeToggleButton" type="button" aria-label="Alternar tema" title="Alternar tema"><i data-lucide="moon"></i></button></div>`;
  const bottomNav = document.createElement("nav");
  bottomNav.className = "mobile-bottom-nav"; bottomNav.setAttribute("aria-label", "Navegação principal mobile"); bottomNav.innerHTML = criarBottomNav(base, paginaAtual);
  document.body.prepend(drawer, sidebar); document.body.append(bottomNav); app.prepend(topbar);
  document.querySelector("#openSidebarButton")?.addEventListener("click", abrirMenu);
  drawer.addEventListener("click", fecharMenu);
  document.querySelector("#themeToggleButton")?.addEventListener("click", alternarTema);
  atualizarControleTema(); registrarPwa();
}

function criarSidebar(base, atual) {
  return `<div class="brand-block"><div class="brand-mark"><img src="${base}img/mishiro-simbolo-claro.jpg" alt="MiShiro Tattoo" /></div><div><strong>MiShiro Tattoo</strong><span>Gestão local do estúdio</span></div></div><nav class="sidebar-nav">${PAGINAS.map(([id, nome, icone, href]) => `<a class="nav-link ${id === atual ? "is-active" : ""}" href="${base}${href}" ${id === atual ? "aria-current=\"page\"" : ""}><span><i data-lucide="${icone}"></i></span>${nome}</a>`).join("")}</nav><div class="sidebar-footer"><span>Dados locais</span><strong>Salvos neste navegador</strong></div>`;
}
function criarBottomNav(base, atual) {
  return PAGINAS.filter(([id]) => PAGINAS_MOBILE.includes(id)).map(([id, nome, icone, href]) => `<a class="${id === atual ? "is-active" : ""}" href="${base}${href}" aria-label="${nome}" ${id === atual ? "aria-current=\"page\"" : ""}><i data-lucide="${icone}"></i><span>${nome}</span></a>`).join("");
}
function obterBase() { return location.pathname.includes("/pages/") ? "../" : "./"; }
function abrirMenu() { document.querySelector("#sidebar")?.classList.add("is-open"); const drawer = document.querySelector("#drawerBackdrop"); if (drawer) drawer.hidden = false; }
function fecharMenu() { document.querySelector("#sidebar")?.classList.remove("is-open"); const drawer = document.querySelector("#drawerBackdrop"); if (drawer) drawer.hidden = true; }
function aplicarTemaInicial() { const tema = localStorage.getItem("MISHIRO_TEMA") || "dark"; document.documentElement.dataset.theme = tema === "light" ? "light" : "dark"; }
function alternarTema() { const tema = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = tema; localStorage.setItem("MISHIRO_TEMA", tema); atualizarControleTema(); }
function atualizarControleTema() { const botao = document.querySelector("#themeToggleButton"); if (!botao) return; const claro = document.documentElement.dataset.theme === "light"; botao.setAttribute("aria-label", claro ? "Alternar para tema escuro" : "Alternar para tema claro"); const icone = botao.querySelector("i"); if (icone) icone.setAttribute("data-lucide", claro ? "sun" : "moon"); window.lucide?.createIcons?.(); }
function registrarPwa() { if (!("serviceWorker" in navigator) || window.__mishiroPwaRegistrado) return; window.__mishiroPwaRegistrado = true; window.addEventListener("load", () => navigator.serviceWorker.register(`${obterBase()}service-worker.js`).catch(() => {}), { once: true }); }
