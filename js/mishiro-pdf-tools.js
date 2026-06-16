const DATABASE_NAME = "CalculadoraTattooDB";
const DATABASE_VERSION = 1;
const APP_STATE_STORE = "appState";
const APP_STATE_ID = "current";
const FALLBACK_STATE_KEY = "CALCULADORA_TATTOO_STATE_V5";
const CLIENT_PDF_META_KEY = "MISHIRO_CLIENT_PDF_META_V1";
const BRAND_NAME = "MiShiro Orçamentos";
const EXPORT_SETTLE_DELAY_MS = 260;
const PDF_RENDER_TIMEOUT_MS = 8000;
const MEASURE_UNIT = "un";
const MEASURE_ML = "ml";
const MEASURE_GRAM = "g";
const MEASURE_METER = "m";
const PURCHASE_MODE_SINGLE = "single";
const UNIT_PURCHASE_CATEGORIES = ["Agulhas e Cartuchos", "Biossegurança e Descartáveis", "Limpeza e Finalização"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

let currentMetaBudgetId = "";

export function setupMiShiroPdfExports() {
  const originalExportButton = document.querySelector("#exportPdfButton");

  if (!originalExportButton || document.querySelector("#exportClientPdfButton")) {
    return;
  }

  injectClientPdfFields();
  replaceExportButtons(originalExportButton);
  bindMetadataRefreshHooks();
}

function injectClientPdfFields() {
  const imageUploadCard = document.querySelector(".image-upload-card");

  if (!imageUploadCard || document.querySelector("#clientPdfOptions")) {
    return;
  }

  const optionsSection = document.createElement("section");
  optionsSection.id = "clientPdfOptions";
  optionsSection.className = "client-pdf-options";
  optionsSection.innerHTML = `
    <div class="section-mini-header">
      <div>
        <span>PDF para cliente</span>
        <h3>Dados visíveis na proposta</h3>
      </div>
    </div>
    <div class="form-grid two-columns">
      <label class="form-field">
        <span>Medida da tatuagem</span>
        <input id="tattooSizeInput" type="text" placeholder="Ex: 18 cm x 12 cm" />
      </label>
      <label class="form-field">
        <span>Cores / quantidade de cores</span>
        <input id="tattooColorsInput" type="text" placeholder="Ex: preto e vermelho / 2 cores" />
      </label>
      <label class="form-field full-client-field">
        <span>Observação simples para o cliente</span>
        <textarea id="clientPdfNotesInput" placeholder="Ex: valor sujeito a ajuste se houver alteração na arte ou tamanho."></textarea>
      </label>
    </div>
  `;
  imageUploadCard.insertAdjacentElement("beforebegin", optionsSection);

  optionsSection.addEventListener("input", () => saveActiveClientPdfMeta());
  loadActiveClientPdfMeta().catch(() => {});
}

function replaceExportButtons(originalExportButton) {
  const internalPdfButton = originalExportButton.cloneNode(true);
  internalPdfButton.id = "exportInternalPdfButton";
  internalPdfButton.innerHTML = `${createIconHtml("file-down")}PDF do estúdio`;
  internalPdfButton.title = "Exportar orçamento completo para controle interno do estúdio";

  const clientPdfButton = document.createElement("button");
  clientPdfButton.className = "primary-button";
  clientPdfButton.id = "exportClientPdfButton";
  clientPdfButton.type = "button";
  clientPdfButton.innerHTML = `${createIconHtml("send")}PDF para cliente`;
  clientPdfButton.title = "Exportar proposta simplificada para enviar ao cliente";

  originalExportButton.replaceWith(internalPdfButton);
  internalPdfButton.insertAdjacentElement("afterend", clientPdfButton);

  internalPdfButton.addEventListener("click", () => exportMiShiroPdf("internal"));
  clientPdfButton.addEventListener("click", () => exportMiShiroPdf("client"));
  renderIcons();
}

function bindMetadataRefreshHooks() {
  ["#newBudgetButton", "#duplicateBudgetButton"].forEach((selector) => {
    const button = document.querySelector(selector);

    if (button) {
      button.addEventListener("click", () => {
        window.setTimeout(() => loadActiveClientPdfMeta().catch(() => {}), 320);
      });
    }
  });

  document.querySelector("#budgetNameInput")?.addEventListener("focus", () => loadActiveClientPdfMeta().catch(() => {}));
}

async function exportMiShiroPdf(mode) {
  const exportButton = mode === "client" ? document.querySelector("#exportClientPdfButton") : document.querySelector("#exportInternalPdfButton");
  const previousButtonContent = exportButton?.innerHTML || "";

  try {
    setButtonLoading(exportButton, "Gerando PDF...");
    saveActiveClientPdfMeta();
    await delay(EXPORT_SETTLE_DELAY_MS);

    const appState = await loadCurrentAppState();
    const budget = createBudgetSnapshot(appState);
    const inventoryItems = Array.isArray(appState.inventoryItems) ? appState.inventoryItems : [];
    const clientMeta = getActiveClientPdfMeta(budget.id);
    const documentHtml = mode === "client"
      ? buildClientPdfHtml({ budget, inventoryItems, clientMeta })
      : buildInternalPdfHtml({ budget, inventoryItems, clientMeta });
    const fileName = createPdfFileName(mode, budget);

    await renderPdfFromHtml(documentHtml, fileName);
  } catch (error) {
    console.error("MiShiro PDF export error:", error);
    window.alert("Não foi possível gerar o PDF. Recarregue a página e tente novamente.");
  } finally {
    if (exportButton) {
      exportButton.innerHTML = previousButtonContent;
      exportButton.disabled = false;
      renderIcons();
    }
  }
}

function setButtonLoading(button, label) {
  if (!button) {
    return;
  }

  button.disabled = true;
  button.innerHTML = `${createIconHtml("loader-2")} ${escapeHtml(label)}`;
  renderIcons();
}

async function loadCurrentAppState() {
  const indexedState = await readIndexedAppState().catch(() => null);

  if (indexedState) {
    return indexedState;
  }

  return readFallbackAppState();
}

async function readIndexedAppState() {
  if (!("indexedDB" in window)) {
    return null;
  }

  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(APP_STATE_STORE, "readonly");
    const request = transaction.objectStore(APP_STATE_STORE).get(APP_STATE_ID);
    request.addEventListener("success", () => resolve(request.result?.value || null));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(APP_STATE_STORE)) {
        database.createObjectStore(APP_STATE_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => reject(request.error || new Error("Banco local bloqueado.")));
  });
}

function readFallbackAppState() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function createBudgetSnapshot(appState) {
  const budgets = Array.isArray(appState.budgets) ? appState.budgets : [];
  const fallbackBudget = budgets[0] || { id: "budget-default", name: "Orçamento", clientName: "", items: [] };
  const activeBudget = budgets.find((budget) => budget.id === appState.activeBudgetId) || fallbackBudget;

  return {
    ...activeBudget,
    name: sanitizeText(document.querySelector("#budgetNameInput")?.value) || activeBudget.name || "Orçamento",
    clientName: sanitizeText(document.querySelector("#clientNameInput")?.value) || activeBudget.clientName || "",
    hourlyRate: normalizeNumber(document.querySelector("#hourlyRateInput")?.value || activeBudget.hourlyRate),
    sessionDuration: normalizeNumber(document.querySelector("#sessionDurationInput")?.value || activeBudget.sessionDuration),
    profitMarginPercent: normalizePercent(document.querySelector("#profitMarginInput")?.value || activeBudget.profitMarginPercent),
    discountPercent: normalizePercent(document.querySelector("#discountPercentInput")?.value || activeBudget.discountPercent),
    items: Array.isArray(activeBudget.items) ? activeBudget.items : []
  };
}

function buildInternalPdfHtml({ budget, inventoryItems, clientMeta }) {
  const totals = calculateBudgetTotals(budget, inventoryItems);
  const rows = createInternalRows(budget, inventoryItems);
  const referenceImage = createReferenceImageHtml(budget.referenceImage);

  return createPdfShell(`
    <article class="mishiro-pdf-page internal-pdf-page">
      <header class="pdf-hero pdf-no-break">
        <div>
          <span>${BRAND_NAME}</span>
          <h1>Orçamento interno do estúdio</h1>
          <p>${escapeHtml(budget.name || "Orçamento")} · Cliente: <strong>${escapeHtml(budget.clientName || "Não informado")}</strong></p>
        </div>
        ${referenceImage}
      </header>

      <section class="pdf-summary-grid pdf-no-break">
        ${createSummaryCard("Insumos", formatCurrency(totals.materialCost))}
        ${createSummaryCard("Mão de obra", formatCurrency(totals.laborCost))}
        ${createSummaryCard("Custo base", formatCurrency(totals.totalCost))}
        ${createSummaryCard("Lucro / custos fixos", `${formatNumber(budget.profitMarginPercent)}% · ${formatCurrency(totals.marginCost)}`)}
        ${createSummaryCard("Valor antes do desconto", formatCurrency(totals.suggestedPrice))}
        ${createSummaryCard("Desconto", `${formatNumber(budget.discountPercent)}% · -${formatCurrency(totals.discountAmount)}`)}
        ${createSummaryCard("Valor final", formatCurrency(totals.finalPrice), true)}
      </section>

      <section class="pdf-detail-card pdf-no-break">
        <h2>Dados de cálculo</h2>
        <p><strong>Tempo estimado:</strong> ${formatNumber(budget.sessionDuration)} hora(s)</p>
        <p><strong>Valor da hora:</strong> ${formatCurrency(budget.hourlyRate)}</p>
        <p><strong>Mão de obra:</strong> ${formatNumber(budget.sessionDuration)} h × ${formatCurrency(budget.hourlyRate)} = ${formatCurrency(totals.laborCost)}</p>
        <p><strong>Medida informada:</strong> ${escapeHtml(clientMeta.tattooSize || "Não informada")}</p>
        <p><strong>Cores informadas:</strong> ${escapeHtml(clientMeta.tattooColors || "Não informadas")}</p>
      </section>

      <section class="pdf-section">
        <h2>Itens que serão utilizados</h2>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Categoria</th>
              <th>Especificação</th>
              <th>Uso</th>
              <th>Custo unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6">Nenhum item selecionado.</td></tr>`}</tbody>
        </table>
      </section>

      <footer class="pdf-footer pdf-no-break">
        <span>Documento interno: contém custo de material, margem, mão de obra e composição completa.</span>
        <strong>${formatCurrency(totals.finalPrice)}</strong>
      </footer>
    </article>
  `);
}

function buildClientPdfHtml({ budget, inventoryItems, clientMeta }) {
  const totals = calculateBudgetTotals(budget, inventoryItems);
  const referenceImage = createReferenceImageHtml(budget.referenceImage, "Imagem de referência enviada para o orçamento");
  const clientNotes = sanitizeText(clientMeta.clientNotes) || "Valor calculado conforme tamanho, complexidade, cores e referência informada. Alterações na arte ou na medida podem alterar o valor final.";

  return createPdfShell(`
    <article class="mishiro-pdf-page client-pdf-page">
      <header class="pdf-hero client-hero pdf-no-break">
        <div>
          <span>${BRAND_NAME}</span>
          <h1>Proposta de tatuagem</h1>
          <p>Cliente: <strong>${escapeHtml(budget.clientName || "Não informado")}</strong></p>
        </div>
        ${referenceImage}
      </header>

      <section class="client-project-card pdf-no-break">
        <span>Projeto</span>
        <h2>${escapeHtml(budget.name || "Tatuagem personalizada")}</h2>
        <div class="client-info-grid">
          <p><strong>Medida da tatuagem</strong>${escapeHtml(clientMeta.tattooSize || "A definir")}</p>
          <p><strong>Cores</strong>${escapeHtml(clientMeta.tattooColors || "A definir")}</p>
        </div>
      </section>

      <section class="client-price-grid pdf-no-break">
        ${createSummaryCard("Valor da proposta", formatCurrency(totals.suggestedPrice))}
        ${createSummaryCard("Desconto aplicado", `${formatNumber(budget.discountPercent)}% · -${formatCurrency(totals.discountAmount)}`)}
        ${createSummaryCard("Total para o cliente", formatCurrency(totals.finalPrice), true)}
      </section>

      <section class="pdf-detail-card pdf-no-break">
        <h2>Observações</h2>
        <p>${escapeHtml(clientNotes)}</p>
      </section>

      <footer class="pdf-footer client-footer pdf-no-break">
        <span>Proposta simplificada para aprovação do cliente.</span>
        <strong>${formatCurrency(totals.finalPrice)}</strong>
      </footer>
    </article>
  `);
}

function createInternalRows(budget, inventoryItems) {
  return budget.items.map((cartItem) => {
    const inventoryItem = inventoryItems.find((item) => item.id === cartItem.inventoryItemId);

    if (!inventoryItem) {
      return "";
    }

    return `
      <tr>
        <td>${escapeHtml(inventoryItem.name)}</td>
        <td>${escapeHtml(inventoryItem.category)}</td>
        <td>${escapeHtml(getItemSpecification(inventoryItem))}</td>
        <td>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(getMeasureLabel(inventoryItem.measureUnit))}</td>
        <td>${formatCurrency(calculateUnitCost(inventoryItem))}</td>
        <td>${formatCurrency(calculateLineSubtotal(inventoryItem, cartItem.quantityUsed))}</td>
      </tr>
    `;
  }).join("");
}

function createSummaryCard(label, value, featured = false) {
  return `
    <div class="summary-card ${featured ? "is-featured" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function createReferenceImageHtml(imageDataUrl, fallbackText = "Sem imagem de referência") {
  return isImageDataUrl(imageDataUrl)
    ? `<img class="pdf-reference-image" src="${escapeAttribute(imageDataUrl)}" alt="Referência da tatuagem" />`
    : `<div class="pdf-reference-placeholder">${escapeHtml(fallbackText)}</div>`;
}

function createPdfShell(pageHtml) {
  return `
    <style>
      .mishiro-pdf-stage, .mishiro-pdf-stage * { box-sizing: border-box; }
      .mishiro-pdf-stage { width: 794px; background: #ffffff; color: #17121f; font-family: Arial, Helvetica, sans-serif; }
      .mishiro-pdf-page { width: 794px; min-height: 1123px; padding: 34px; background: #ffffff; color: #17121f; }
      .pdf-no-break, .summary-card, .pdf-detail-card, .client-project-card, tr { break-inside: avoid; page-break-inside: avoid; }
      .pdf-hero { display: grid; grid-template-columns: minmax(0, 1fr) 176px; gap: 24px; align-items: stretch; padding: 0 0 22px; border-bottom: 3px solid #2d0b40; }
      .pdf-hero > div { position: relative; min-height: 86px; padding-left: 82px; }
      .pdf-hero > div::before { content: "M"; position: absolute; left: 0; top: 0; display: grid; width: 64px; height: 64px; place-items: center; border-radius: 20px; background: linear-gradient(135deg, #6a1b9a, #2d0b40); color: #fff; font-size: 30px; font-weight: 900; }
      .pdf-hero span, .summary-card span, .client-project-card span { display: block; color: #6a1b9a; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
      .pdf-hero h1 { margin: 8px 0 8px; color: #17121f; font-size: 30px; line-height: 1.05; }
      .pdf-hero p { margin: 0; color: #43394f; font-size: 13px; line-height: 1.45; }
      .pdf-reference-image, .pdf-reference-placeholder { width: 176px; height: 176px; border: 1px solid rgba(45, 11, 64, .16); border-radius: 24px; background: #f7f2fb; }
      .pdf-reference-image { object-fit: cover; }
      .pdf-reference-placeholder { display: grid; place-items: center; padding: 18px; color: #62546f; font-size: 12px; text-align: center; }
      .pdf-summary-grid, .client-price-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 22px 0 16px; }
      .summary-card, .pdf-detail-card, .client-project-card, .pdf-footer { padding: 13px; border: 1px solid rgba(45, 11, 64, .12); border-radius: 16px; background: #fbf8fd; }
      .summary-card strong { display: block; margin-top: 6px; color: #17121f; font-size: 16px; line-height: 1.18; }
      .summary-card.is-featured { background: linear-gradient(135deg, #2d0b40, #6a1b9a); color: #ffffff; }
      .summary-card.is-featured span, .summary-card.is-featured strong { color: #ffffff; }
      .summary-card.is-featured strong { font-size: 21px; }
      .pdf-detail-card { display: grid; gap: 6px; margin: 0 0 16px; font-size: 12px; line-height: 1.46; }
      .pdf-detail-card h2, .pdf-section h2, .client-project-card h2 { margin: 0; color: #2d0b40; font-size: 17px; }
      .pdf-detail-card p { margin: 0; }
      .pdf-section h2 { margin: 18px 0 10px; }
      .pdf-table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border: 1px solid rgba(45, 11, 64, .14); border-radius: 16px; font-size: 10.3px; }
      .pdf-table th { background: #2d0b40; color: #ffffff; font-size: 9.2px; letter-spacing: .04em; text-align: left; text-transform: uppercase; }
      .pdf-table th, .pdf-table td { padding: 9px; border-bottom: 1px solid rgba(45, 11, 64, .1); vertical-align: top; }
      .pdf-table tbody tr:nth-child(even) td { background: #fbf8fd; }
      .pdf-table tbody tr:last-child td { border-bottom: 0; }
      .client-project-card { margin: 22px 0 14px; }
      .client-project-card h2 { margin-top: 8px; font-size: 22px; }
      .client-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
      .client-info-grid p { margin: 0; padding: 12px; border-radius: 14px; background: #ffffff; color: #40374d; font-size: 13px; }
      .client-info-grid strong { display: block; margin-bottom: 5px; color: #2d0b40; }
      .pdf-footer { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-top: 18px; color: #40374d; font-size: 11px; }
      .pdf-footer strong { color: #2d0b40; font-size: 20px; white-space: nowrap; }
      .client-footer { margin-top: 20px; background: linear-gradient(135deg, rgba(125, 211, 199, .14), rgba(106, 27, 154, .08)), #fbf8fd; }
    </style>
    ${pageHtml}
  `;
}

async function renderPdfFromHtml(documentHtml, fileName) {
  if (typeof window.html2pdf !== "function") {
    renderPrintableFallback(documentHtml);
    window.print();
    return;
  }

  const stage = document.createElement("section");
  stage.className = "mishiro-pdf-stage";
  stage.innerHTML = documentHtml;
  Object.assign(stage.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "794px",
    maxWidth: "794px",
    background: "#ffffff",
    zIndex: "2147483647",
    pointerEvents: "none"
  });
  document.body.append(stage);

  try {
    await preparePdfStage(stage);
    await window.html2pdf()
      .set({
        filename: fileName,
        margin: [8, 8, 8, 8],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: Math.min(window.devicePixelRatio || 2, 2.4),
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
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
          avoid: [".pdf-no-break", ".summary-card", "tr"]
        }
      })
      .from(stage)
      .save();
  } finally {
    stage.remove();
  }
}

function renderPrintableFallback(documentHtml) {
  const invoiceDocument = document.querySelector("#invoiceDocument");

  if (invoiceDocument) {
    invoiceDocument.innerHTML = documentHtml;
  }
}

async function preparePdfStage(stage) {
  const fontPromise = document.fonts?.ready || Promise.resolve();
  const imagePromise = waitForImages(stage);
  await withTimeout(Promise.all([fontPromise, imagePromise]), PDF_RENDER_TIMEOUT_MS);
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
    promise.catch(() => {}).finally(() => {
      window.clearTimeout(timeoutId);
      resolve();
    });
  });
}

function getActiveClientPdfMeta(budgetId) {
  const allMeta = readClientPdfMetaMap();
  return allMeta[budgetId] || { tattooSize: "", tattooColors: "", clientNotes: "" };
}

async function loadActiveClientPdfMeta() {
  const appState = await loadCurrentAppState();
  const budget = createBudgetSnapshot(appState);
  const meta = getActiveClientPdfMeta(budget.id);
  currentMetaBudgetId = budget.id;
  setInputValue("#tattooSizeInput", meta.tattooSize);
  setInputValue("#tattooColorsInput", meta.tattooColors);
  setInputValue("#clientPdfNotesInput", meta.clientNotes);
}

function saveActiveClientPdfMeta() {
  const budgetId = currentMetaBudgetId || readFallbackAppState().activeBudgetId || "budget-default";
  const allMeta = readClientPdfMetaMap();
  allMeta[budgetId] = {
    tattooSize: sanitizeText(document.querySelector("#tattooSizeInput")?.value),
    tattooColors: sanitizeText(document.querySelector("#tattooColorsInput")?.value),
    clientNotes: sanitizeText(document.querySelector("#clientPdfNotesInput")?.value)
  };
  localStorage.setItem(CLIENT_PDF_META_KEY, JSON.stringify(allMeta));
}

function readClientPdfMetaMap() {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_PDF_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function setInputValue(selector, value) {
  const input = document.querySelector(selector);

  if (input && document.activeElement !== input) {
    input.value = value || "";
  }
}

function calculateBudgetTotals(budget, inventoryItems) {
  const materialCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = inventoryItems.find((item) => item.id === cartItem.inventoryItemId);
    return inventoryItem ? total + calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const hourlyRate = Math.max(normalizeNumber(budget.hourlyRate), 0);
  const sessionDuration = Math.max(normalizeNumber(budget.sessionDuration), 0);
  const profitMarginPercent = normalizePercent(budget.profitMarginPercent);
  const discountPercent = normalizePercent(budget.discountPercent);
  const laborCost = hourlyRate * sessionDuration;
  const totalCost = materialCost + laborCost;
  const marginCost = totalCost * (profitMarginPercent / 100);
  const suggestedPrice = totalCost + marginCost;
  const discountAmount = suggestedPrice * (discountPercent / 100);
  const finalPrice = Math.max(suggestedPrice - discountAmount, 0);

  return {
    materialCost: roundMoneyValue(materialCost),
    laborCost: roundMoneyValue(laborCost),
    totalCost: roundMoneyValue(totalCost),
    marginCost: roundMoneyValue(marginCost),
    suggestedPrice: roundMoneyValue(suggestedPrice),
    discountAmount: roundMoneyValue(discountAmount),
    finalPrice: roundMoneyValue(finalPrice)
  };
}

function calculateUnitCost(item) {
  const packagePrice = Math.max(normalizeNumber(item?.packagePrice), 0);
  const packageQuantity = Math.max(normalizeNumber(item?.packageQuantity), 0);

  if (UNIT_PURCHASE_CATEGORIES.includes(item?.category) && item?.purchaseMode === PURCHASE_MODE_SINGLE) {
    return packagePrice;
  }

  return packagePrice > 0 && packageQuantity > 0 ? packagePrice / packageQuantity : 0;
}

function calculateLineSubtotal(item, quantityUsed) {
  return calculateUnitCost(item) * Math.max(normalizeNumber(quantityUsed), 0);
}

function getItemSpecification(item) {
  if (item.category === "Agulhas e Cartuchos") {
    return [item.lineType, item.numbering].map(sanitizeText).filter(Boolean).join(" · ") || "Sem especificação";
  }

  if (item.category === "Tintas") {
    return item.color || `${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}`;
  }

  return `${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}`;
}

function getMeasureLabel(measureUnit) {
  const labels = {
    [MEASURE_UNIT]: "unidade",
    [MEASURE_ML]: "ml",
    [MEASURE_GRAM]: "g",
    [MEASURE_METER]: "m"
  };
  return labels[measureUnit] || measureUnit || "unidade";
}

function createPdfFileName(mode, budget) {
  const prefix = mode === "client" ? "proposta-cliente" : "orcamento-interno";
  return `${prefix}-${sanitizeFileName(budget.name || budget.clientName || "mishiro")}.pdf`;
}

function createIconHtml(iconName) {
  return `<i class="inline-icon" data-lucide="${escapeAttribute(iconName)}" aria-hidden="true"></i>`;
}

function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons({ attrs: { "stroke-width": 2, "aria-hidden": "true" } });
  }
}

function delay(timeoutMs) {
  return new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
}

function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const compactValue = value.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const hasComma = compactValue.includes(",");
  const sanitizedValue = hasComma ? compactValue.replace(/\./g, "").replace(",", ".") : compactValue;
  const parsedValue = Number.parseFloat(sanitizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizePercent(value) {
  return Math.min(Math.max(normalizeNumber(value), 0), 100);
}

function roundMoneyValue(value) {
  return Math.round((normalizeNumber(value) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return currencyFormatter.format(normalizeNumber(value));
}

function formatNumber(value) {
  return numberFormatter.format(normalizeNumber(value));
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function sanitizeFileName(value) {
  return sanitizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "mishiro-orcamento";
}

function isImageDataUrl(value) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

function escapeHtml(value) {
  return sanitizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
