const BRAND_NAME = "MiShiro Tattoo";
const BRAND_TAGLINE = "Orçamentos, agenda e estoque";
const BRAND_DESCRIPTION = "PWA mobile-first para estoque, agenda, precificação e geração de propostas em PDF para estúdios de tatuagem.";
const BRAND_STYLESHEETS = [
  { id: "mishiro-brand-css", href: "assets/css/identidade.css" },
  { id: "mishiro-pdf-tools-css", href: "assets/css/pdf.css" },
  { id: "mishiro-mvc-css", href: "assets/css/mvc.css" },
  { id: "mishiro-theme-css", href: "assets/css/tema-mishiro.css" },
  { id: "mishiro-logo-img-css", href: "assets/css/logos-img.css" },
  { id: "mishiro-mobile-polish-css", href: "assets/css/polimento-mobile.css" }
];
const LOGOS = {
  simboloClaro: ["img/mishiro-simbolo-claro.jpg", "assets/brand/mishiro-simbolo-claro.svg"],
  simboloEscuro: ["img/mishiro-simbolo-escuro.jpg.jpg", "assets/brand/mishiro-simbolo-escuro.svg"],
  logoClaro: ["img/mishiro-logo-claro.jpg", "assets/brand/mishiro-logo-clara.svg"],
  logoEscuro: ["img/mishiro-logo-escuro.jpg", "assets/brand/mishiro-logo-escura.svg"]
};

export function applyMiShiroBranding() {
  injectBrandStylesheets();
  updateDocumentMetadata();
  updateSidebarBrand();
  updateHeroBrand();
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
    brandMark.replaceChildren(
      createBrandImage(LOGOS.simboloClaro, "brand-logo-clara"),
      createBrandImage(LOGOS.simboloEscuro, "brand-logo-escura")
    );
    brandMark.setAttribute("aria-label", BRAND_NAME);
    brandMark.setAttribute("title", BRAND_NAME);
  }

  if (brandName) brandName.textContent = BRAND_NAME;
  if (brandTagline) brandTagline.textContent = BRAND_TAGLINE;
  if (sidebarFooterLabel) sidebarFooterLabel.textContent = "Banco local seguro";
}

function updateHeroBrand() {
  const heroCard = document.querySelector(".hero-card");
  if (!heroCard || heroCard.querySelector(".mishiro-hero-brand")) return;

  const heroLogo = document.createElement("div");
  heroLogo.className = "mishiro-hero-brand";
  heroLogo.append(
    createBrandImage(LOGOS.logoClaro, "mishiro-hero-logo brand-logo-clara"),
    createBrandImage(LOGOS.logoEscuro, "mishiro-hero-logo brand-logo-escura")
  );
  heroCard.prepend(heroLogo);
}

function updateHomeCopy() {
  setText(".hero-card .eyebrow", "MiShiro Tattoo • Gestão do estúdio");
  setText("#homeTitle", "Orçamentos bonitos, estoque organizado e agenda pronta para o dia a dia do estúdio.");
  setText(".hero-card p", "Monte propostas com identidade visual, acompanhe insumos, organize atendimentos e mantenha seus dados salvos localmente. Pensado primeiro para celular, mas confortável também no computador.");

  const flowSteps = document.querySelectorAll(".flow-card article");
  updateFlowStep(flowSteps[0], "Cadastre os materiais", "Registre cartuchos, tintas, descartáveis e demais insumos com custo real de uso.");
  updateFlowStep(flowSteps[1], "Monte a proposta", "Some materiais, tempo de sessão, margem, desconto e imagem de referência em uma ficha clara.");
  updateFlowStep(flowSteps[2], "Acompanhe o fechamento", "Exporte o PDF, marque aceite, agende a sessão e só desconte o estoque quando o trabalho for confirmado.");

  const pdfFeatureCard = Array.from(document.querySelectorAll(".feature-card")).find((card) => card.textContent.includes("PDF"));
  if (pdfFeatureCard) {
    setTextWithin(pdfFeatureCard, "span", "Proposta visual");
    setTextWithin(pdfFeatureCard, "strong", "PDF para cliente");
    setTextWithin(pdfFeatureCard, "p", "Gera uma proposta mais limpa, com dados essenciais, imagem de referência e valor final pronto para envio.");
  }
}

function updatePdfCopy() {
  const exportPdfButton = document.querySelector("#exportPdfButton");
  if (exportPdfButton) exportPdfButton.setAttribute("title", "Gerar proposta em PDF com resumo, itens e valor final");
}

function createBrandImage(sourceList, className) {
  const image = document.createElement("img");
  image.alt = "";
  image.className = className;
  image.decoding = "async";
  image.loading = "eager";
  image.dataset.sourceIndex = "0";
  image.dataset.sources = JSON.stringify(sourceList);
  image.src = sourceList[0];
  image.addEventListener("error", handleImageFallback);
  return image;
}

function handleImageFallback(event) {
  const image = event.currentTarget;
  const sources = JSON.parse(image.dataset.sources || "[]");
  const currentIndex = Number(image.dataset.sourceIndex || 0);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= sources.length) {
    image.removeEventListener("error", handleImageFallback);
    return;
  }

  image.dataset.sourceIndex = String(nextIndex);
  image.src = sources[nextIndex];
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
