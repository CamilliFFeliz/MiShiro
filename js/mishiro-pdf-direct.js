const DATABASE_NAME = "CalculadoraTattooDB";
const DATABASE_VERSION = 1;
const APP_STATE_STORE = "appState";
const APP_STATE_ID = "current";
const FALLBACK_STATE_KEY = "CALCULADORA_TATTOO_STATE_V5";
const CLIENT_PDF_META_KEY = "MISHIRO_CLIENT_PDF_META_V1";
const BRAND_NAME = "MiShiro Orçamentos";
const PAGE = { width: 210, height: 297, margin: 14 };
const MEASURE_LABELS = { un: "unidade", ml: "ml", g: "g", m: "m" };
const UNIT_PURCHASE_CATEGORIES = ["Agulhas e Cartuchos", "Biossegurança e Descartáveis", "Limpeza e Finalização"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numberFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function setupDirectPdfExport() {
  attachDirectHandler("#exportInternalPdfButton", "internal");
  attachDirectHandler("#exportClientPdfButton", "client");
}

function attachDirectHandler(selector, mode) {
  const button = document.querySelector(selector);

  if (!button || button.dataset.directPdfReady === "true") {
    return;
  }

  button.dataset.directPdfReady = "true";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    await exportDirectPdf(mode, button);
  }, { capture: true });
}

async function exportDirectPdf(mode, button) {
  const previousContent = button.innerHTML;

  try {
    button.disabled = true;
    button.textContent = "Gerando PDF...";

    const JsPdfConstructor = getJsPdfConstructor();

    if (!JsPdfConstructor) {
      openPrintableFallback(mode);
      return;
    }

    const appState = await loadCurrentAppState();
    const budget = createBudgetSnapshot(appState);
    const inventoryItems = Array.isArray(appState.inventoryItems) ? appState.inventoryItems : [];
    const clientMeta = readCurrentClientMeta(budget.id);
    const doc = new JsPdfConstructor({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

    if (mode === "client") {
      await drawClientPdf(doc, budget, inventoryItems, clientMeta);
    } else {
      await drawInternalPdf(doc, budget, inventoryItems, clientMeta);
    }

    doc.save(createFileName(mode, budget));
  } catch (error) {
    console.error("Erro ao gerar PDF direto do MiShiro:", error);
    openPrintableFallback(mode);
  } finally {
    button.disabled = false;
    button.innerHTML = previousContent;
    refreshIcons();
  }
}

function getJsPdfConstructor() {
  return window.jspdf?.jsPDF || window.jsPDF || null;
}

async function drawInternalPdf(doc, budget, inventoryItems, clientMeta) {
  const totals = calculateBudgetTotals(budget, inventoryItems);
  let y = await drawHeader(doc, {
    title: "Orçamento interno do estúdio",
    subtitle: `${budget.name || "Orçamento"} · Cliente: ${budget.clientName || "Não informado"}`,
    imageDataUrl: budget.referenceImage
  });

  y = drawSummaryGrid(doc, y, [
    ["Insumos", formatCurrency(totals.materialCost)],
    ["Mão de obra", formatCurrency(totals.laborCost)],
    ["Custo base", formatCurrency(totals.totalCost)],
    ["Lucro / custos fixos", `${formatNumber(budget.profitMarginPercent)}% · ${formatCurrency(totals.marginCost)}`],
    ["Antes do desconto", formatCurrency(totals.suggestedPrice)],
    ["Desconto", `${formatNumber(budget.discountPercent)}% · -${formatCurrency(totals.discountAmount)}`],
    ["Valor final", formatCurrency(totals.finalPrice)]
  ]);

  y = drawInfoBox(doc, y, "Dados de cálculo", [
    `Tempo estimado: ${formatNumber(budget.sessionDuration)} hora(s)`,
    `Valor da hora: ${formatCurrency(budget.hourlyRate)}`,
    `Mão de obra: ${formatNumber(budget.sessionDuration)} h x ${formatCurrency(budget.hourlyRate)} = ${formatCurrency(totals.laborCost)}`,
    `Medida informada: ${clientMeta.tattooSize || "Não informada"}`,
    `Cores informadas: ${clientMeta.tattooColors || "Não informadas"}`
  ]);

  y = drawSectionTitle(doc, y + 2, "Itens que serão utilizados");
  y = drawInternalTable(doc, y, budget, inventoryItems);
  drawFooter(doc, `Valor final: ${formatCurrency(totals.finalPrice)}`, "Documento interno: contém custo de material, margem, mão de obra e composição completa.");
}

async function drawClientPdf(doc, budget, inventoryItems, clientMeta) {
  const totals = calculateBudgetTotals(budget, inventoryItems);
  let y = await drawHeader(doc, {
    title: "Proposta de tatuagem",
    subtitle: `Cliente: ${budget.clientName || "Não informado"}`,
    imageDataUrl: budget.referenceImage
  });

  y = drawInfoBox(doc, y, budget.name || "Tatuagem personalizada", [
    `Medida da tatuagem: ${clientMeta.tattooSize || "A definir"}`,
    `Cores: ${clientMeta.tattooColors || "A definir"}`
  ]);

  y = drawSummaryGrid(doc, y, [
    ["Valor da proposta", formatCurrency(totals.suggestedPrice)],
    ["Desconto aplicado", `${formatNumber(budget.discountPercent)}% · -${formatCurrency(totals.discountAmount)}`],
    ["Total para o cliente", formatCurrency(totals.finalPrice)]
  ]);

  const notes = clientMeta.clientNotes || "Valor calculado conforme tamanho, complexidade, cores e referência informada. Alterações na arte ou na medida podem alterar o valor final.";
  y = drawInfoBox(doc, y, "Observações", [notes]);
  drawFooter(doc, `Total: ${formatCurrency(totals.finalPrice)}`, "Proposta simplificada para aprovação do cliente.");
}

async function drawHeader(doc, { title, subtitle, imageDataUrl }) {
  doc.setFillColor(45, 11, 64);
  doc.roundedRect(PAGE.margin, PAGE.margin, 40, 22, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MS", PAGE.margin + 20, PAGE.margin + 14, { align: "center" });

  doc.setTextColor(106, 27, 154);
  doc.setFontSize(8);
  doc.text(BRAND_NAME.toUpperCase(), PAGE.margin + 48, PAGE.margin + 7);

  doc.setTextColor(22, 18, 31);
  doc.setFontSize(19);
  doc.text(wrap(doc, title, 92), PAGE.margin + 48, PAGE.margin + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(65, 56, 78);
  doc.text(wrap(doc, subtitle, 92), PAGE.margin + 48, PAGE.margin + 24);

  await drawReferenceImage(doc, imageDataUrl, 160, PAGE.margin, 36, 36);

  doc.setDrawColor(45, 11, 64);
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin, PAGE.margin + 42, PAGE.width - PAGE.margin, PAGE.margin + 42);
  return PAGE.margin + 51;
}

async function drawReferenceImage(doc, imageDataUrl, x, y, width, height) {
  doc.setDrawColor(226, 214, 235);
  doc.setFillColor(247, 242, 251);
  doc.roundedRect(x, y, width, height, 5, 5, "FD");

  if (!isImageDataUrl(imageDataUrl)) {
    doc.setTextColor(98, 84, 111);
    doc.setFontSize(7);
    doc.text("Sem imagem", x + width / 2, y + height / 2, { align: "center" });
    return;
  }

  try {
    const image = await normalizeImageForPdf(imageDataUrl);
    doc.addImage(image.dataUrl, image.type, x + 1.5, y + 1.5, width - 3, height - 3, undefined, "FAST");
  } catch {
    doc.setTextColor(98, 84, 111);
    doc.setFontSize(7);
    doc.text("Imagem não renderizada", x + width / 2, y + height / 2, { align: "center" });
  }
}

function drawSummaryGrid(doc, y, cards) {
  const gap = 4;
  const columns = 3;
  const cardWidth = (PAGE.width - (PAGE.margin * 2) - (gap * (columns - 1))) / columns;
  const cardHeight = 22;

  cards.forEach(([label, value], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PAGE.margin + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);
    const isLast = index === cards.length - 1;

    if (isLast) {
      doc.setFillColor(45, 11, 64);
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(251, 248, 253);
      doc.setTextColor(22, 18, 31);
    }

    doc.setDrawColor(226, 214, 235);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(wrap(doc, label.toUpperCase(), cardWidth - 8), x + 4, cardY + 6);
    doc.setFontSize(isLast ? 12 : 10);
    doc.text(wrap(doc, value, cardWidth - 8), x + 4, cardY + 15);
  });

  return y + Math.ceil(cards.length / columns) * (cardHeight + gap) + 4;
}

function drawInfoBox(doc, y, title, lines) {
  const maxWidth = PAGE.width - PAGE.margin * 2 - 10;
  const wrappedLines = lines.flatMap((line) => wrap(doc, line, maxWidth));
  const height = 12 + wrappedLines.length * 5;

  y = ensureSpace(doc, y, height + 4);
  doc.setFillColor(251, 248, 253);
  doc.setDrawColor(226, 214, 235);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, height, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(45, 11, 64);
  doc.text(wrap(doc, title, maxWidth), PAGE.margin + 5, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 43, 61);
  wrappedLines.forEach((line, index) => doc.text(line, PAGE.margin + 5, y + 15 + index * 5));
  return y + height + 7;
}

function drawSectionTitle(doc, y, title) {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(45, 11, 64);
  doc.text(title, PAGE.margin, y);
  return y + 6;
}

function drawInternalTable(doc, y, budget, inventoryItems) {
  const columns = [48, 29, 34, 22, 28, 29];
  const headers = ["Insumo", "Categoria", "Especificação", "Uso", "Unitário", "Subtotal"];
  const rows = budget.items.map((cartItem) => {
    const inventoryItem = inventoryItems.find((item) => item.id === cartItem.inventoryItemId);

    if (!inventoryItem) {
      return null;
    }

    return [
      inventoryItem.name || "Item",
      inventoryItem.category || "-",
      getItemSpecification(inventoryItem),
      `${formatNumber(cartItem.quantityUsed)} ${getMeasureLabel(inventoryItem.measureUnit)}`,
      formatCurrency(calculateUnitCost(inventoryItem)),
      formatCurrency(calculateLineSubtotal(inventoryItem, cartItem.quantityUsed))
    ];
  }).filter(Boolean);

  y = drawTableHeader(doc, y, columns, headers);

  if (rows.length === 0) {
    return drawTableRow(doc, y, columns, ["Nenhum item selecionado.", "", "", "", "", ""]);
  }

  rows.forEach((row) => {
    y = drawTableRow(doc, y, columns, row);
  });

  return y;
}

function drawTableHeader(doc, y, columns, headers) {
  y = ensureSpace(doc, y, 12);
  let x = PAGE.margin;
  doc.setFillColor(45, 11, 64);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.rect(PAGE.margin, y, columns.reduce((a, b) => a + b, 0), 9, "F");
  headers.forEach((header, index) => {
    doc.text(header, x + 2, y + 6);
    x += columns[index];
  });
  return y + 9;
}

function drawTableRow(doc, y, columns, row) {
  const wrappedCells = row.map((cell, index) => wrap(doc, cell, columns[index] - 4));
  const height = Math.max(9, Math.max(...wrappedCells.map((cell) => cell.length)) * 4 + 4);
  y = ensureSpace(doc, y, height + 4);

  let x = PAGE.margin;
  doc.setDrawColor(226, 214, 235);
  doc.setTextColor(38, 32, 47);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.rect(PAGE.margin, y, columns.reduce((a, b) => a + b, 0), height);

  wrappedCells.forEach((lines, index) => {
    lines.forEach((line, lineIndex) => doc.text(line, x + 2, y + 5 + lineIndex * 4));
    x += columns[index];
  });

  return y + height;
}

function drawFooter(doc, valueText, note) {
  const y = PAGE.height - 20;
  doc.setDrawColor(226, 214, 235);
  doc.line(PAGE.margin, y - 6, PAGE.width - PAGE.margin, y - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(78, 65, 91);
  doc.text(wrap(doc, note, 120), PAGE.margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(45, 11, 64);
  doc.text(valueText, PAGE.width - PAGE.margin, y, { align: "right" });
}

function ensureSpace(doc, y, requiredHeight) {
  if (y + requiredHeight <= PAGE.height - 28) {
    return y;
  }

  doc.addPage();
  return PAGE.margin;
}

function wrap(doc, text, maxWidth) {
  const safeText = String(text || "");
  return doc.splitTextToSize(safeText, maxWidth);
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

  if (UNIT_PURCHASE_CATEGORIES.includes(item?.category) && item?.purchaseMode === "single") {
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
  return MEASURE_LABELS[measureUnit] || measureUnit || "unidade";
}

async function normalizeImageForPdf(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const maxSize = 780;
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), type: "JPEG" };
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function loadCurrentAppState() {
  const indexedState = await readIndexedAppState().catch(() => null);
  return indexedState || readFallbackAppState();
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
  const activeBudget = budgets.find((budget) => budget.id === appState.activeBudgetId) || budgets[0] || { id: "budget-default", items: [] };

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

function readCurrentClientMeta(budgetId) {
  const storedMeta = readClientPdfMetaMap()[budgetId] || {};
  return {
    tattooSize: sanitizeText(document.querySelector("#tattooSizeInput")?.value) || storedMeta.tattooSize || "",
    tattooColors: sanitizeText(document.querySelector("#tattooColorsInput")?.value) || storedMeta.tattooColors || "",
    clientNotes: sanitizeText(document.querySelector("#clientPdfNotesInput")?.value) || storedMeta.clientNotes || ""
  };
}

function readClientPdfMetaMap() {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_PDF_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function openPrintableFallback(mode) {
  const message = mode === "client"
    ? "A biblioteca de PDF não carregou. Use a impressão do navegador e escolha Salvar como PDF."
    : "A biblioteca de PDF não carregou. Use a impressão do navegador e escolha Salvar como PDF.";
  window.alert(message);
}

function createFileName(mode, budget) {
  const prefix = mode === "client" ? "proposta-cliente" : "orcamento-interno";
  return `${prefix}-${sanitizeFileName(budget.name || budget.clientName || "mishiro")}.pdf`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
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
