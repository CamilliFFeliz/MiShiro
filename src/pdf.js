const PDF_RENDER_TIMEOUT_MS = 8000;
const PDF_BRAND_NAME = "MiShiro Orçamentos";

export async function exportBudgetPdf({ html, fileName }) {
  const normalizedHtml = enhanceInvoiceHtml(html);
  const printDocument = document.querySelector("#invoiceDocument");

  if (printDocument) {
    printDocument.innerHTML = normalizedHtml;
  }

  const renderRoot = document.createElement("section");
  renderRoot.className = "pdf-render-root";
  renderRoot.innerHTML = normalizedHtml;
  Object.assign(renderRoot.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "794px",
    maxWidth: "794px",
    background: "#FFFFFF",
    zIndex: "2147483647",
    pointerEvents: "none"
  });
  document.body.append(renderRoot);

  try {
    const invoicePage = renderRoot.querySelector(".invoice-page") || renderRoot;

    if (typeof window.html2pdf !== "function") {
      window.print();
      return;
    }

    await preparePdfDocument(invoicePage);

    await window.html2pdf()
      .set({
        filename: normalizePdfFileName(fileName),
        margin: [8, 8, 8, 8],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: Math.min(window.devicePixelRatio || 2, 2.4),
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#FFFFFF",
          letterRendering: true,
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".invoice-header", ".invoice-summary-grid", ".invoice-footer", "tr"]
        }
      })
      .from(invoicePage)
      .save();
  } finally {
    renderRoot.remove();
  }
}

function enhanceInvoiceHtml(html) {
  return String(html || "")
    .replaceAll("CalculadoraTattoo", PDF_BRAND_NAME)
    .replaceAll("Orçamento gerado localmente no navegador.", `PDF gerado localmente pelo ${PDF_BRAND_NAME}. Esta proposta não substitui documento fiscal.`);
}

async function preparePdfDocument(rootElement) {
  const fontReadyPromise = document.fonts?.ready || Promise.resolve();
  const imageReadyPromise = waitForImages(rootElement);
  await withTimeout(Promise.all([fontReadyPromise, imageReadyPromise]), PDF_RENDER_TIMEOUT_MS);
}

function waitForImages(rootElement) {
  const images = Array.from(rootElement.querySelectorAll("img"));

  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(images.map((imageElement) => {
    if (imageElement.complete && imageElement.naturalWidth > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      imageElement.addEventListener("load", resolve, { once: true });
      imageElement.addEventListener("error", resolve, { once: true });
    });
  }));
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, timeoutMs);
    promise
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timeoutId);
        resolve();
      });
  });
}

function normalizePdfFileName(fileName) {
  const safeFileName = String(fileName || "orcamento.pdf").trim();
  return safeFileName.toLowerCase().endsWith(".pdf") ? safeFileName : `${safeFileName}.pdf`;
}
