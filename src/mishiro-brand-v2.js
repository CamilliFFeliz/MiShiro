const BRAND_NAME = "MiShiro Tattoo";
const BRAND_TAGLINE = "Custos, proposta e agenda para tattoo";
const EXTRA_STYLES = [
  ["mishiro-ux-css", "assets/css/experiencia.css"],
  ["mishiro-studio-pro-css", "assets/css/estudio-pro.css"],
  ["mishiro-theme-css", "assets/css/tema-mishiro.css"]
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
  setText(".hero-card .eyebrow", BRAND_NAME);
  setText("#homeTitle", "A rotina do estúdio organizada com a identidade MiShiro.");
  setText(".hero-card p", "Da entrada do insumo ao PDF final, o app agora usa a paleta da marca: roxo profundo, branco limpo, preto de contraste e cards mais consistentes para o atendimento do estúdio.");
  const flowSteps = document.querySelectorAll(".flow-card article");
  setStep(flowSteps[0], "Monte a base de custos", "Cadastre insumos por unidade, ml, g ou metro e evite estimativas soltas no orçamento.");
  setStep(flowSteps[1], "Simule o atendimento", "Some materiais, tempo, valor por hora, margem e desconto em uma visão única.");
  setStep(flowSteps[2], "Exporte o documento certo", "Use o PDF interno para controle do estúdio e o PDF simplificado para enviar ao cliente.");
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
