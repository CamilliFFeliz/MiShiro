const BRAND_NAME = "MiShiro Tattoo";
const BRAND_TAGLINE = "Estúdio, proposta e custos";
const BRAND_DESCRIPTION = "PWA offline para estoque, precificação e geração de propostas em PDF para estúdios de tatuagem.";
const BRAND_STYLESHEETS = [
  { id: "mishiro-brand-css", href: "assets/css/identidade.css" },
  { id: "mishiro-pdf-tools-css", href: "assets/css/pdf.css" },
  { id: "mishiro-mvc-css", href: "assets/css/mvc.css" },
  { id: "mishiro-theme-css", href: "assets/css/tema-mishiro.css" }
];
const LOGO_CLARA = "assets/brand/mishiro-simbolo-claro.svg";
const LOGO_ESCURA = "assets/brand/mishiro-simbolo-escuro.svg";

export function applyMiShiroBranding() {
  injectBrandStylesheets();
  updateDocumentMetadata();
  updateSidebarBrand();
  updateHomeCopy();
  updatePdfCopy();
}

function injectBrandStylesheets() {
  BRAND_STYLESHEETS.forEach(({ id, href }) => {
    if (document.getElementById(id)) return;
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
  if (metaElement) metaElement.setAttribute("content", content);
}

function updateSidebarBrand() {
  const brandMark = document.querySelector(".brand-mark");
  const brandName = document.querySelector(".brand-block strong");
  const brandTagline = document.querySelector(".brand-block span");
  const sidebarFooterLabel = document.querySelector(".sidebar-footer span");

  if (brandMark) {
    brandMark.replaceChildren(createBrandImage(LOGO_CLARA, "brand-logo-clara"), createBrandImage(LOGO_ESCURA, "brand-logo-escura"));
    brandMark.setAttribute("aria-label", BRAND_NAME);
    brandMark.setAttribute("title", BRAND_NAME);
  }

  if (brandName) brandName.textContent = BRAND_NAME;
  if (brandTagline) brandTagline.textContent = BRAND_TAGLINE;
  if (sidebarFooterLabel) sidebarFooterLabel.textContent = "Base local";
}

function updateHomeCopy() {
  setText(".hero-card .eyebrow", BRAND_NAME);
  setText("#homeTitle", "Orçamento, agenda e estoque com a identidade da MiShiro Tattoo.");
  setText(".hero-card p", "Controle insumos, monte propostas, acompanhe a agenda e gere PDFs com uma estética alinhada ao estúdio: roxo profundo, contraste limpo e visual inspirado na marca MiShiro.");

  const flowSteps = document.querySelectorAll(".flow-card article");
  updateFlowStep(flowSteps[0], "Cadastre o insumo", "Cada categoria usa uma ficha própria para evitar custo errado por unidade, ml, g ou metro.");
  updateFlowStep(flowSteps[1], "Calcule o atendimento", "Some materiais, tempo, valor da hora, margem e desconto sem refazer contas manualmente.");
  updateFlowStep(flowSteps[2], "Entregue o PDF", "Gere uma proposta limpa, com resumo financeiro, tabela de itens e imagem de referência.");

  const pdfFeatureCard = Array.from(document.querySelectorAll(".feature-card")).find((card) => card.textContent.includes("PDF"));
  if (pdfFeatureCard) {
    setTextWithin(pdfFeatureCard, "span", "PDF de proposta");
    setTextWithin(pdfFeatureCard, "strong", "Resumo + referência");
    setTextWithin(pdfFeatureCard, "p", "Exporta cliente, imagem, composição de custos, desconto e valor final em um layout mais profissional.");
  }
}

function updatePdfCopy() {
  const exportPdfButton = document.querySelector("#exportPdfButton");
  if (exportPdfButton) exportPdfButton.setAttribute("title", "Gerar proposta em PDF com resumo, itens e valor final");
}

function createBrandImage(src, className) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = "";
  image.className = className;
  image.decoding = "async";
  image.loading = "eager";
  return image;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setTextWithin(parent, selector, value) {
  const element = parent?.querySelector(selector);
  if (element) element.textContent = value;
}

function updateFlowStep(stepElement, title, description) {
  setTextWithin(stepElement, "h3", title);
  setTextWithin(stepElement, "p", description);
}
