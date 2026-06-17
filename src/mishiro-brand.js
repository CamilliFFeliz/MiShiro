const BRAND_NAME = "MiShiro Tattoo";
const BRAND_TAGLINE = "Estúdio, proposta e custos";
const BRAND_DESCRIPTION = "PWA offline para estoque, precificação e geração de propostas em PDF para estúdios de tatuagem.";
const BRAND_STYLESHEETS = [
  { id: "mishiro-brand-css", href: "assets/css/identidade.css" },
  { id: "mishiro-pdf-tools-css", href: "assets/css/pdf.css" },
  { id: "mishiro-mvc-css", href: "assets/css/mvc.css" },
  { id: "mishiro-theme-css", href: "assets/css/tema-mishiro.css" },
  { id: "mishiro-logo-img-css", href: "assets/css/logos-img.css" }
];
const LOGOS = {
  simboloClaro: [
    "img/mishiro-simbolo-claro.jpg",
    "img/mishiro-simbolo-claro.jpeg",
    "img/logo-simbolo-claro.jpg",
    "img/logo-clara.jpg",
    "img/file_000000009ac071f58efa72eb3e63c450.jpg",
    "assets/brand/mishiro-simbolo-claro.svg"
  ],
  simboloEscuro: [
    "img/mishiro-simbolo-escuro.jpg",
    "img/mishiro-simbolo-escuro.jpeg",
    "img/logo-simbolo-escuro.jpg",
    "img/logo-escura.jpg",
    "img/file_000000001580720e9165a282ed095498.jpg",
    "assets/brand/mishiro-simbolo-escuro.svg"
  ],
  logoClara: [
    "img/mishiro-logo-clara.jpg",
    "img/mishiro-logo-clara.jpeg",
    "img/logo-clara.jpg",
    "img/file_000000004b84720e9c9aa771dda79440.jpg",
    "assets/brand/mishiro-logo-clara.svg"
  ],
  logoEscura: [
    "img/mishiro-logo-escura.jpg",
    "img/mishiro-logo-escura.jpeg",
    "img/logo-escura.jpg",
    "img/file_00000000d01c720e8a24e33fcaafef80.webp",
    "assets/brand/mishiro-logo-escura.svg"
  ]
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
  if (sidebarFooterLabel) sidebarFooterLabel.textContent = "Base local";
}

function updateHeroBrand() {
  const heroCard = document.querySelector(".hero-card");
  if (!heroCard || heroCard.querySelector(".mishiro-hero-brand")) return;

  const heroLogo = document.createElement("div");
  heroLogo.className = "mishiro-hero-brand";
  heroLogo.append(
    createBrandImage(LOGOS.logoClara, "mishiro-hero-logo brand-logo-clara"),
    createBrandImage(LOGOS.logoEscura, "mishiro-hero-logo brand-logo-escura")
  );
  heroCard.prepend(heroLogo);
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
