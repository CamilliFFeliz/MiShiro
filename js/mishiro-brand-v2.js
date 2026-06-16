const SVG_NS = "http://www.w3.org/2000/svg";
const BRAND_NAME = "MiShiro Orçamentos";
const BRAND_TAGLINE = "Custos, proposta e PDF para tattoo";
const EXTRA_STYLES = [
  ["mishiro-ux-css", "mishiro-ux.css"]
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
  replaceBrandLogo();
  replaceNavigationIcons();
  refineHeroCopy();
  requestIconRefresh();
}

function injectExtraStyles() {
  EXTRA_STYLES.forEach(([id, href]) => {
    if (document.getElementById(id)) {
      return;
    }

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

  if (brandName) {
    brandName.textContent = BRAND_NAME;
  }

  if (brandTagline) {
    brandTagline.textContent = BRAND_TAGLINE;
  }
}

function replaceBrandLogo() {
  const mark = document.querySelector(".brand-mark");

  if (!mark) {
    return;
  }

  mark.replaceChildren(createLogo());
  mark.setAttribute("aria-label", BRAND_NAME);
  mark.setAttribute("title", BRAND_NAME);
}

function replaceNavigationIcons() {
  NAV_ICONS.forEach((iconName, screenName) => {
    const navButton = document.querySelector(`[data-screen-target='${screenName}']`);
    const icon = navButton?.querySelector("[data-lucide]");

    if (icon) {
      icon.setAttribute("data-lucide", iconName);
    }
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
  setText("#homeTitle", "Precificação mais clara, proposta mais bonita e controle real dos custos da tattoo.");
  setText(".hero-card p", "O MiShiro organiza estoque, mão de obra, margem, desconto e referência visual em uma experiência mais fluida. O foco é transformar custos soltos em um orçamento profissional para o estúdio e em uma proposta simples para o cliente.");

  const flowSteps = document.querySelectorAll(".flow-card article");
  setStep(flowSteps[0], "Monte a base de custos", "Cadastre insumos por unidade, ml, g ou metro e evite estimativas soltas no orçamento.");
  setStep(flowSteps[1], "Simule o atendimento", "Some materiais, tempo, valor por hora, margem e desconto em uma visão única.");
  setStep(flowSteps[2], "Exporte o documento certo", "Use o PDF interno para controle do estúdio e o PDF simplificado para enviar ao cliente.");
}

function createLogo() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  addPath(svg, "logo-orb", "M32 6a26 26 0 1 0 0 52 26 26 0 0 0 0-52Z");
  addPath(svg, "logo-m-left", "M18 43V22l14 15");
  addPath(svg, "logo-m-right", "M32 37l14-15v21");
  addPath(svg, "logo-needle-line", "M42 20 54 8");
  addPath(svg, "logo-needle-tip", "M53 7l6-2-2 6z");
  addPath(svg, "logo-glow", "M16 13l2.2 4.8L23 21l-4.8 2.2L16 28l-2.2-4.8L9 21l4.8-2.2z");
  addPath(svg, "logo-spark", "M48 43l1.5 3.2L53 48l-3.5 1.8L48 53l-1.5-3.2L43 48l3.5-1.8z");
  return svg;
}

function addPath(svg, className, pathData) {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", className);
  path.setAttribute("d", pathData);
  svg.append(path);
}

function setIconForSelector(selector, iconName) {
  const icon = document.querySelector(selector)?.querySelector("[data-lucide]");

  if (icon) {
    icon.setAttribute("data-lucide", iconName);
  }
}

function setText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function setStep(step, title, description) {
  if (!step) {
    return;
  }

  const heading = step.querySelector("h3");
  const paragraph = step.querySelector("p");

  if (heading) {
    heading.textContent = title;
  }

  if (paragraph) {
    paragraph.textContent = description;
  }
}

function requestIconRefresh() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
