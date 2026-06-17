const BRAND_NAME = "MiShiro Tattoo";
const BRAND_TAGLINE = "Orçamentos, agenda e estoque";
const EXTRA_STYLES = [
  ["mishiro-ux-css", "assets/css/experiencia.css"],
  ["mishiro-studio-pro-css", "assets/css/estudio-pro.css"],
  ["mishiro-theme-css", "assets/css/tema-mishiro.css"],
  ["mishiro-logo-img-css", "assets/css/logos-img.css"],
  ["mishiro-mobile-polish-css", "assets/css/polimento-mobile.css"],
  ["mishiro-paleta-final-css", "assets/css/paleta-360a75.css"],
  ["mishiro-orcamento-backup-css", "assets/css/orcamento-backup.css"]
];
const NAV_ICONS = new Map([
  ["home", "layout-dashboard"],
  ["reports", "chart-no-axes-combined"],
  ["inventory", "package-search"],
  ["budget", "file-pen-line"]
]);

export function applyMiShiroBrandV2() {
  injectExtraStyles();
  replaceBrandText();
  replaceNavigationIcons();
  refineHeroCopy();
  requestIconRefresh();
}

function injectExtraStyles() {
  EXTRA_STYLES.forEach(([id, href]) => {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
  });
}

function replaceBrandText() {
  const brandName = document.querySelector(".brand-block strong");
  const brandTagline = document.querySelector(".brand-block span");
  document.title = BRAND_NAME;
  if (brandName) brandName.textContent = BRAND_NAME;
  if (brandTagline) brandTagline.textContent = BRAND_TAGLINE;
}

function replaceNavigationIcons() {
  NAV_ICONS.forEach((iconName, screenName) => {
    const icon = document.querySelector(`[data-screen-target='${screenName}']`)?.querySelector("[data-lucide]");
    if (icon) icon.setAttribute("data-lucide", iconName);
  });
  setIconForSelector("[data-home-action='inventory']", "package-plus");
  setIconForSelector("[data-home-action='budget']", "sparkles");
  setIconForSelector("[data-home-action='reports']", "chart-spline");
  setIconForSelector("#quickNewItemButton", "circle-plus");
  setIconForSelector("#openItemModalButton", "package-plus");
  setIconForSelector("#exportInventoryBackupButton", "archive");
  setIconForSelector("#importInventoryBackupButton", "folder-input");
  setIconForSelector("#restoreReferenceStockButton", "refresh-ccw-dot");
}

function refineHeroCopy() {
  setText(".hero-card .eyebrow", "MiShiro Tattoo • App de gestão");
  setText("#homeTitle", "Um painel simples, bonito e rápido para orçar, agendar e controlar o estoque.");
  setText(".hero-card p", "A interface foi ajustada para celular primeiro: botões maiores, cards mais espaçados, logo inteira sem corte e textos mais diretos para atendimento rápido no estúdio.");
  const flowSteps = document.querySelectorAll(".flow-card article");
  setStep(flowSteps[0], "Estoque sempre à mão", "Cadastre materiais com custo real e encontre tudo rápido pelo celular.");
  setStep(flowSteps[1], "Orçamento sem bagunça", "Monte a proposta com cliente, referência, insumos, horas, margem e desconto.");
  setStep(flowSteps[2], "Fluxo profissional", "Envie PDF, marque aceite, agende a sessão e só então baixe o estoque.");
}

function setIconForSelector(selector, iconName) {
  const icon = document.querySelector(selector)?.querySelector("[data-lucide]");
  if (icon) icon.setAttribute("data-lucide", iconName);
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function setStep(step, title, description) {
  if (!step) return;
  const heading = step.querySelector("h3");
  const paragraph = step.querySelector("p");
  if (heading) heading.textContent = title;
  if (paragraph) paragraph.textContent = description;
}

function requestIconRefresh() {
  if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
}
