export async function exportBudgetPdf({ html, fileName }) {
  const renderRoot = document.createElement("section");
  renderRoot.className = "pdf-render-root";
  renderRoot.setAttribute("aria-hidden", "true");
  renderRoot.innerHTML = html;
  document.body.append(renderRoot);

  try {
    const invoicePage = renderRoot.querySelector(".invoice-page");

    if (!invoicePage || typeof window.html2pdf !== "function") {
      window.print();
      return;
    }

    await window.html2pdf()
      .set({
        filename: fileName,
        margin: 8,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FFFFFF"
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        },
        pagebreak: { mode: ["css", "legacy"] }
      })
      .from(invoicePage)
      .save();
  } finally {
    renderRoot.remove();
  }
}
