const BRAND_NAME = "MiShiro Orçamentos";
const BRAND_TAGLINE = "Propostas e custos para tattoo";
const BRAND_DESCRIPTION = "PWA offline para estoque, precificação e geração de propostas em PDF para estúdios de tatuagem.";
const BRAND_STYLESHEETS = [
  { id: "mishiro-brand-css", href: "mishiro.css" },
  { id: "mishiro-pdf-tools-css", href: "mishiro-pdf-tools.css" },
  { id: "mishiro-mvc-css", href: "mvc-mishiro.css" }
];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function applyMiShiroBranding() {
  injectBrandStylesheets();
  updateDocumentMetadata();
  updateSidebarBrand();
  updateHomeCopy();
  updatePdfCopy();
}

function injectBrandStylesheets() {
  BRAND_STYLESHEETS.forEach(({ id, href }) => {
    if (document.getElementById(id)) {
      return;
    }

    const stylesheetLink = document.createElement("link");
    stylesheetLink.id = id;
    stylesheetLink.rel = "stylesheet";
    stylesheetLink.href = href;
    document.head.append(stylesheetLink);
  });
}

function updateDocumentMetadata() {
  document.title = BRAND_NAME;
  setMetaContent("description", `${BRAND_NAME}: ${BRAND_DESCRIPTION}`);
  setMetaContent("apple-mobile-web-app-title", BRAND_NAME);
}

function setMetaContent(name, content) {
  const metaElement = document.querySelector(`meta[name=\"${name}\"]`);

  if (metaElement) {
    metaElement.setAttribute("content", content);
  }
}

function updateSidebarBrand() {
  const brandMark = document.querySelector(".brand-mark");
  const brandName = document.querySelector(".brand-block strong");
  const brandTagline = document.querySelector(".brand-block span");
  const sidebarFooterLabel = document.querySelector(".sidebar-footer span");

  if (brandMark) {
    brandMark.replaceChildren(createLogoSvg());
  }

  if (brandName) {
    brandName.textContent = BRAND_NAME;
  }

  if (brandTagline) {
    brandTagline.textContent = BRAND_TAGLINE;
  }

  if (sidebarFooterLabel) {
    sidebarFooterLabel.textContent = "Base local";
  }
}

function updateHomeCopy() {
  setText(".hero-card .eyebrow", BRAND_NAME);
  setText("#homeTitle", "Custos reais, preço final claro e PDF pronto para apresentar ao cliente.");
  setText(".hero-card p", "Controle insumos por categoria, calcule mão de obra, margem e desconto, e gere uma proposta visual com referência da tatuagem. A lógica continua local no navegador, mas agora com fluxo mais polido para atendimento e fechamento.");

  const flowSteps = document.querySelectorAll(".flow-card article");
  updateFlowStep(flowSteps[0], "Cadastre o insumo", "Cada categoria usa uma ficha própria para evitar custo errado por unidade, ml, g ou metro.");
  updateFlowStep(flowSteps[1], "Calcule o atendimento", "Some material usado, duração, valor da hora, margem e desconto sem refazer contas manualmente.");
  updateFlowStep(flowSteps[2], "Entregue o PDF", "Gere uma proposta limpa, com resumo financeiro, tabela de itens e imagem de referência.");

  const pdfFeatureCard = Array.from(document.querySelectorAll(".feature-card"))
    .find((card) => card.textContent.includes("PDF"));

  if (pdfFeatureCard) {
    setTextWithin(pdfFeatureCard, "span", "PDF de proposta");
    setTextWithin(pdfFeatureCard, "strong", "Resumo + referência");
    setTextWithin(pdfFeatureCard, "p", "Exporta cliente, imagem, composição de custos, desconto e valor final em um layout mais profissional.");
  }
}

function updatePdfCopy() {
  const exportPdfButton = document.querySelector("#exportPdfButton");

  if (exportPdfButton) {
    exportPdfButton.setAttribute("title", "Gerar proposta em PDF com resumo, itens e valor final");
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function setTextWithin(parent, selector, value) {
  const element = parent?.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function updateFlowStep(stepElement, title, description) {
  setTextWithin(stepElement, "h3", title);
  setTextWithin(stepElement, "p", description);
}

function createLogoSvg() {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  appendLogoPath(svg, "logo-plate", "M15 10h23l11 11v33H15z");
  appendLogoPath(svg, "logo-fold", "M38 10v12h11");
  appendLogoPath(svg, "logo-needle", "M20 45 42 23l5 5-22 22-8 3z");
  appendLogoPath(svg, "logo-spark", "M22 18l2 4 4 2-4 2-2 4-2-4-4-2 4-2z");
  return svg;
}

function appendLogoPath(svg, className, pathData) {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("class", className);
  path.setAttribute("d", pathData);
  svg.append(path);
}
