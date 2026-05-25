import {
  calculateMaterialCost,
  calculateTotalCost,
  calculateUnitCost,
  normalizeNumber
} from "./calculation-engine.js";
import { LocalStorageRepository } from "./storage-repository.js";

const APPLICATION_STORAGE_KEY = "CALCULADORA_TATTOO_PRODUCTION_V1";
const DEFAULT_PRICE_TABLE_ID = "base";
const DEFAULT_LABOR_HOURS = 1;
const DEFAULT_HOURLY_RATE = 0;

const BASE_PRICE_TABLE_ITEMS = [
  { name: "Sabonete liquido", packageQuantity: 400, unitLabel: "ml", packagePrice: 37 },
  { name: "Bandagem", packageQuantity: 4.5, unitLabel: "metros", packagePrice: 10 },
  { name: "Lamina", packageQuantity: 7, unitLabel: "un", packagePrice: 7 },
  { name: "Batoque", packageQuantity: 50, unitLabel: "un", packagePrice: 30 },
  { name: "Agulhas", packageQuantity: 1, unitLabel: "un", packagePrice: 15 },
  { name: "Vaselina", packageQuantity: 150, unitLabel: "gramas", packagePrice: 30 },
  { name: "Transfer", packageQuantity: 30, unitLabel: "ml", packagePrice: 28 },
  { name: "Folha stencil", packageQuantity: 1, unitLabel: "folha", packagePrice: 4.5 },
  { name: "Papel toalha", packageQuantity: 200, unitLabel: "folhas", packagePrice: 12 },
  { name: "Mascara", packageQuantity: 100, unitLabel: "un", packagePrice: 25 },
  { name: "Plastico filme", packageQuantity: 70, unitLabel: "metros", packagePrice: 15 },
  { name: "Palito descartavel", packageQuantity: 100, unitLabel: "un", packagePrice: 6 },
  { name: "Luvas", packageQuantity: 100, unitLabel: "un", packagePrice: 30 },
  { name: "Tinta preto linha", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 },
  { name: "Tinta preto tribal", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 },
  { name: "Tinta Raven Clow", packageQuantity: 20, unitLabel: "ml", packagePrice: 79 },
  { name: "Tinta color", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 }
];

const PRICE_TABLES = [
  {
    id: DEFAULT_PRICE_TABLE_ID,
    name: "Base da planilha",
    inventoryData: BASE_PRICE_TABLE_ITEMS
  }
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});

const CalculadoraTattooApp = (() => {
  const stateRepository = new LocalStorageRepository(APPLICATION_STORAGE_KEY, createInitialState);

  let applicationState = normalizeApplicationState(stateRepository.getState());
  let inventorySearchTerm = "";
  let calculatorSearchTerm = "";

  const dom = {};

  function initializeApplication() {
    bindDomReferences();
    renderApplication();
    bindEventListeners();
    registerServiceWorker();
  }

  function bindDomReferences() {
    dom.activeSheetTotal = document.querySelector("#activeSheetTotal");
    dom.applicationScreens = document.querySelectorAll("[data-screen-panel]");
    dom.applyPriceTableButton = document.querySelector("#applyPriceTableButton");
    dom.budgetSheetForm = document.querySelector("#budgetSheetForm");
    dom.budgetSheetSelect = document.querySelector("#budgetSheetSelect");
    dom.budgetTitleInput = document.querySelector("#budgetTitleInput");
    dom.calculatorDashboard = document.querySelector("#calculatorDashboard");
    dom.calculatorItemList = document.querySelector("#calculatorItemList");
    dom.calculatorSearchInput = document.querySelector("#calculatorSearchInput");
    dom.calculatorTotalDetail = document.querySelector("#calculatorTotalDetail");
    dom.calculatorTotalValue = document.querySelector("#calculatorTotalValue");
    dom.clearBudgetSheetButton = document.querySelector("#clearBudgetSheetButton");
    dom.clientNameInput = document.querySelector("#clientNameInput");
    dom.createBudgetSheetButton = document.querySelector("#createBudgetSheetButton");
    dom.downloadBudgetPdfButton = document.querySelector("#downloadBudgetPdfButton");
    dom.emptyStateTemplate = document.querySelector("#emptyStateTemplate");
    dom.hourlyRateInput = document.querySelector("#hourlyRateInput");
    dom.inventoryDashboard = document.querySelector("#inventoryDashboard");
    dom.inventoryList = document.querySelector("#inventoryList");
    dom.inventorySearchInput = document.querySelector("#inventorySearchInput");
    dom.laborHoursInput = document.querySelector("#laborHoursInput");
    dom.laborPreviewValue = document.querySelector("#laborPreviewValue");
    dom.navigationButtons = document.querySelectorAll("[data-screen-target]");
    dom.packagePriceInput = document.querySelector("#packagePriceInput");
    dom.packageQuantityInput = document.querySelector("#packageQuantityInput");
    dom.priceTableSelect = document.querySelector("#priceTableSelect");
    dom.printDocument = document.querySelector("#printDocument");
    dom.resetApplicationButton = document.querySelector("#resetApplicationButton");
    dom.sessionNotesInput = document.querySelector("#sessionNotesInput");
    dom.supplyForm = document.querySelector("#supplyForm");
    dom.supplyNameInput = document.querySelector("#supplyNameInput");
    dom.unitLabelInput = document.querySelector("#unitLabelInput");
  }

  function createInitialState() {
    const inventoryData = createInventoryDataFromPriceTable(DEFAULT_PRICE_TABLE_ID);
    const firstBudgetSheet = createBudgetSheet("Ficha 1", inventoryData);

    return {
      activeScreen: "calculator",
      activePriceTableId: DEFAULT_PRICE_TABLE_ID,
      activeBudgetSheetId: firstBudgetSheet.id,
      inventoryData,
      budgetSheets: [firstBudgetSheet]
    };
  }

  function createInventoryDataFromPriceTable(priceTableId) {
    const priceTable = getPriceTableById(priceTableId);

    return priceTable.inventoryData.map((inventoryItem, inventoryIndex) => ({
      id: `${priceTable.id}-${inventoryIndex + 1}`,
      name: inventoryItem.name,
      packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
      unitLabel: inventoryItem.unitLabel,
      packagePrice: normalizeNumber(inventoryItem.packagePrice)
    }));
  }

  function createBudgetSheet(title, inventoryData) {
    return {
      id: createEntityId("budget-sheet"),
      title,
      clientName: "",
      sessionNotes: "",
      laborHours: DEFAULT_LABOR_HOURS,
      hourlyRate: DEFAULT_HOURLY_RATE,
      materialUsage: createEmptyMaterialUsage(inventoryData),
      createdAt: new Date().toISOString()
    };
  }

  function createEmptyMaterialUsage(inventoryData) {
    return inventoryData.reduce((materialUsage, inventoryItem) => {
      materialUsage[inventoryItem.id] = 0;
      return materialUsage;
    }, {});
  }

  function normalizeApplicationState(rawState) {
    if (!rawState || !Array.isArray(rawState.inventoryData) || !Array.isArray(rawState.budgetSheets)) {
      return createInitialState();
    }

    const inventoryData = rawState.inventoryData.map((inventoryItem) => ({
      id: inventoryItem.id || createEntityId("inventory"),
      name: String(inventoryItem.name || "Novo insumo"),
      packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
      unitLabel: String(inventoryItem.unitLabel || "un"),
      packagePrice: normalizeNumber(inventoryItem.packagePrice)
    }));

    const budgetSheets = rawState.budgetSheets.map((budgetSheet, budgetIndex) => ({
      id: budgetSheet.id || createEntityId("budget-sheet"),
      title: String(budgetSheet.title || `Ficha ${budgetIndex + 1}`),
      clientName: String(budgetSheet.clientName || ""),
      sessionNotes: String(budgetSheet.sessionNotes || ""),
      laborHours: normalizeNumber(budgetSheet.laborHours == null ? DEFAULT_LABOR_HOURS : budgetSheet.laborHours),
      hourlyRate: normalizeNumber(budgetSheet.hourlyRate == null ? DEFAULT_HOURLY_RATE : budgetSheet.hourlyRate),
      materialUsage: normalizeMaterialUsage(budgetSheet.materialUsage, inventoryData),
      createdAt: budgetSheet.createdAt || new Date().toISOString()
    }));

    if (budgetSheets.length === 0) {
      budgetSheets.push(createBudgetSheet("Ficha 1", inventoryData));
    }

    const activeBudgetSheetId = budgetSheets.some((budgetSheet) => budgetSheet.id === rawState.activeBudgetSheetId)
      ? rawState.activeBudgetSheetId
      : budgetSheets[0].id;

    return {
      activeScreen: rawState.activeScreen === "inventory" ? "inventory" : "calculator",
      activePriceTableId: rawState.activePriceTableId || DEFAULT_PRICE_TABLE_ID,
      activeBudgetSheetId,
      inventoryData,
      budgetSheets
    };
  }

  function normalizeMaterialUsage(materialUsage, inventoryData) {
    return inventoryData.reduce((normalizedUsage, inventoryItem) => {
      normalizedUsage[inventoryItem.id] = normalizeNumber(materialUsage ? materialUsage[inventoryItem.id] : 0);
      return normalizedUsage;
    }, {});
  }

  function getPriceTableById(priceTableId) {
    return PRICE_TABLES.find((priceTable) => priceTable.id === priceTableId) || PRICE_TABLES[0];
  }

  function getActiveBudgetSheet() {
    return applicationState.budgetSheets.find((budgetSheet) => budgetSheet.id === applicationState.activeBudgetSheetId)
      || applicationState.budgetSheets[0];
  }

  function getActiveBudgetSummary() {
    return calculateTotalCost({
      inventoryData: applicationState.inventoryData,
      budgetSheet: getActiveBudgetSheet()
    });
  }

  function createEntityId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatCurrency(value) {
    return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
  }

  function formatNumber(value) {
    return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function persistApplicationState() {
    stateRepository.saveState(applicationState);
  }

  function renderApplication() {
    renderActiveScreen();
    renderPriceTableOptions();
    renderBudgetSheetOptions();
    renderBudgetSheetForm();
    renderDashboard();
    renderInventoryList();
    renderCalculatorItemList();
  }

  function renderActiveScreen() {
    dom.applicationScreens.forEach((screenElement) => {
      screenElement.classList.toggle("is-active", screenElement.dataset.screenPanel === applicationState.activeScreen);
    });

    dom.navigationButtons.forEach((navigationButton) => {
      const isActive = navigationButton.dataset.screenTarget === applicationState.activeScreen;
      navigationButton.classList.toggle("is-active", isActive);
      navigationButton.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  function renderPriceTableOptions() {
    dom.priceTableSelect.innerHTML = PRICE_TABLES.map((priceTable) => {
      const selectedAttribute = priceTable.id === applicationState.activePriceTableId ? "selected" : "";
      return `<option value="${escapeHtml(priceTable.id)}" ${selectedAttribute}>${escapeHtml(priceTable.name)}</option>`;
    }).join("");
  }

  function renderBudgetSheetOptions() {
    dom.budgetSheetSelect.innerHTML = applicationState.budgetSheets.map((budgetSheet) => {
      const selectedAttribute = budgetSheet.id === applicationState.activeBudgetSheetId ? "selected" : "";
      return `<option value="${escapeHtml(budgetSheet.id)}" ${selectedAttribute}>${escapeHtml(budgetSheet.title)}</option>`;
    }).join("");
  }

  function renderBudgetSheetForm() {
    const activeBudgetSheet = getActiveBudgetSheet();
    const activeBudgetSummary = getActiveBudgetSummary();

    dom.budgetTitleInput.value = activeBudgetSheet.title;
    dom.clientNameInput.value = activeBudgetSheet.clientName;
    dom.sessionNotesInput.value = activeBudgetSheet.sessionNotes;
    dom.laborHoursInput.value = formatNumber(activeBudgetSheet.laborHours);
    dom.hourlyRateInput.value = activeBudgetSheet.hourlyRate > 0 ? formatNumber(activeBudgetSheet.hourlyRate) : "";
    dom.laborPreviewValue.textContent = formatCurrency(activeBudgetSummary.laborTotal);
  }

  function renderDashboard() {
    const activeBudgetSummary = getActiveBudgetSummary();
    const inventorySummary = calculateInventoryDashboard();

    dom.activeSheetTotal.textContent = formatCurrency(activeBudgetSummary.totalCost);
    dom.calculatorTotalValue.textContent = formatCurrency(activeBudgetSummary.totalCost);
    dom.calculatorTotalDetail.textContent = `${activeBudgetSummary.selectedItemCount} ${activeBudgetSummary.selectedItemCount === 1 ? "insumo selecionado" : "insumos selecionados"}`;

    dom.inventoryDashboard.innerHTML = `
      <article class="metric-card">
        <span>Insumos</span>
        <strong>${inventorySummary.itemCount}</strong>
      </article>
      <article class="metric-card">
        <span>Pacotes</span>
        <strong>${formatCurrency(inventorySummary.packageTotal)}</strong>
      </article>
      <article class="metric-card">
        <span>Media unidade</span>
        <strong>${formatCurrency(inventorySummary.averageUnitCost)}</strong>
      </article>
      <article class="metric-card">
        <span>Na ficha</span>
        <strong>${activeBudgetSummary.selectedItemCount}</strong>
      </article>
    `;

    dom.calculatorDashboard.innerHTML = `
      <article class="metric-card">
        <span>Selecionados</span>
        <strong>${activeBudgetSummary.selectedItemCount}</strong>
      </article>
      <article class="metric-card">
        <span>Materiais</span>
        <strong>${formatCurrency(activeBudgetSummary.materialTotal)}</strong>
      </article>
      <article class="metric-card">
        <span>Mao de obra</span>
        <strong>${formatCurrency(activeBudgetSummary.laborTotal)}</strong>
      </article>
      <article class="metric-card">
        <span>Total final</span>
        <strong>${formatCurrency(activeBudgetSummary.totalCost)}</strong>
      </article>
    `;
  }

  function calculateInventoryDashboard() {
    const itemCount = applicationState.inventoryData.length;
    const packageTotal = applicationState.inventoryData.reduce((total, inventoryItem) => total + normalizeNumber(inventoryItem.packagePrice), 0);
    const averageUnitCost = itemCount > 0
      ? applicationState.inventoryData.reduce((total, inventoryItem) => total + calculateUnitCost(inventoryItem), 0) / itemCount
      : 0;

    return {
      itemCount,
      packageTotal,
      averageUnitCost
    };
  }

  function renderInventoryList() {
    const filteredInventoryData = getFilteredInventoryData(inventorySearchTerm);

    if (filteredInventoryData.length === 0) {
      renderEmptyState(dom.inventoryList);
      return;
    }

    dom.inventoryList.innerHTML = filteredInventoryData.map(createInventoryCardHtml).join("");
  }

  function getFilteredInventoryData(searchTerm) {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return applicationState.inventoryData;
    }

    return applicationState.inventoryData.filter((inventoryItem) => {
      const searchableText = `${inventoryItem.name} ${inventoryItem.unitLabel}`.toLowerCase();
      return searchableText.includes(normalizedSearchTerm);
    });
  }

  function createInventoryCardHtml(inventoryItem) {
    return `
      <article class="data-card" data-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h2>${escapeHtml(inventoryItem.name)}</h2>
            <span>${formatNumber(inventoryItem.packageQuantity)} ${escapeHtml(inventoryItem.unitLabel)} por pacote</span>
          </div>
          <span class="pill">${formatCurrency(calculateUnitCost(inventoryItem))}/un</span>
        </div>

        <div class="editable-grid">
          <label class="form-field">
            <span>Material</span>
            <input type="text" value="${escapeHtml(inventoryItem.name)}" data-inventory-field="name" />
          </label>
          <label class="form-field">
            <span>Qtd.</span>
            <input type="text" inputmode="decimal" value="${escapeHtml(inventoryItem.packageQuantity)}" data-inventory-field="packageQuantity" />
          </label>
          <label class="form-field">
            <span>Unidade</span>
            <input type="text" value="${escapeHtml(inventoryItem.unitLabel)}" data-inventory-field="unitLabel" />
          </label>
          <label class="form-field">
            <span>Preco</span>
            <input type="text" inputmode="decimal" value="${escapeHtml(inventoryItem.packagePrice)}" data-inventory-field="packagePrice" />
          </label>
        </div>

        <div class="card-actions">
          <button class="button button-primary" type="button" data-add-inventory-item-to-budget>Usar na calculadora</button>
          <button class="button button-danger" type="button" data-remove-inventory-item>Excluir</button>
        </div>
      </article>
    `;
  }

  function renderCalculatorItemList() {
    const filteredInventoryData = getFilteredInventoryData(calculatorSearchTerm);

    if (filteredInventoryData.length === 0) {
      renderEmptyState(dom.calculatorItemList);
      return;
    }

    dom.calculatorItemList.innerHTML = filteredInventoryData.map(createCalculatorItemHtml).join("");
  }

  function createCalculatorItemHtml(inventoryItem) {
    const activeBudgetSheet = getActiveBudgetSheet();
    const quantityUsed = normalizeNumber(activeBudgetSheet.materialUsage[inventoryItem.id]);
    const isSelected = quantityUsed > 0;

    return `
      <article class="data-card budget-item ${isSelected ? "is-selected" : ""}" data-calculator-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h3>${escapeHtml(inventoryItem.name)}</h3>
            <span>${formatCurrency(calculateUnitCost(inventoryItem))} por ${escapeHtml(inventoryItem.unitLabel)}</span>
          </div>
          <span class="pill">${formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed))}</span>
        </div>

        <div class="budget-item-control">
          <button class="select-button" type="button" data-toggle-calculator-item aria-pressed="${isSelected}">
            ${isSelected ? "Usando" : "Adicionar"}
          </button>
          <label class="quantity-field">
            <span>Qtd.</span>
            <span class="quantity-input-row">
              <input type="text" inputmode="decimal" value="${quantityUsed > 0 ? escapeHtml(quantityUsed) : ""}" placeholder="0" data-material-usage />
              <span>${escapeHtml(inventoryItem.unitLabel)}</span>
            </span>
          </label>
        </div>

        <div class="line-total">
          <span>Custo neste item</span>
          <strong data-line-total>${formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed))}</strong>
        </div>
      </article>
    `;
  }

  function renderEmptyState(container) {
    const emptyState = dom.emptyStateTemplate.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(emptyState);
  }

  function setActiveScreen(screenName) {
    applicationState.activeScreen = screenName;
    persistApplicationState();
    renderActiveScreen();
  }

  function applyPriceTable() {
    const selectedPriceTableId = dom.priceTableSelect.value;
    const selectedPriceTable = getPriceTableById(selectedPriceTableId);
    const shouldApply = window.confirm(`Usar a tabela "${selectedPriceTable.name}" e substituir os insumos atuais?`);

    if (!shouldApply) {
      dom.priceTableSelect.value = applicationState.activePriceTableId;
      return;
    }

    applicationState.activePriceTableId = selectedPriceTableId;
    applicationState.inventoryData = createInventoryDataFromPriceTable(selectedPriceTableId);
    applicationState.budgetSheets = applicationState.budgetSheets.map((budgetSheet) => ({
      ...budgetSheet,
      materialUsage: createEmptyMaterialUsage(applicationState.inventoryData)
    }));
    persistApplicationState();
    renderApplication();
  }

  function addInventoryItemFromForm() {
    const inventoryName = dom.supplyNameInput.value.trim();
    const packageQuantity = normalizeNumber(dom.packageQuantityInput.value);
    const unitLabel = dom.unitLabelInput.value.trim();
    const packagePrice = normalizeNumber(dom.packagePriceInput.value);

    dom.packageQuantityInput.setCustomValidity("");

    if (packageQuantity <= 0) {
      dom.packageQuantityInput.setCustomValidity("Informe uma quantidade maior que zero.");
    }

    if (!inventoryName || !unitLabel || packageQuantity <= 0) {
      dom.supplyForm.reportValidity();
      return;
    }

    const createdInventoryItem = {
      id: createEntityId("inventory"),
      name: inventoryName,
      packageQuantity,
      unitLabel,
      packagePrice
    };

    applicationState.inventoryData.unshift(createdInventoryItem);
    applicationState.budgetSheets = applicationState.budgetSheets.map((budgetSheet) => ({
      ...budgetSheet,
      materialUsage: {
        ...budgetSheet.materialUsage,
        [createdInventoryItem.id]: 0
      }
    }));

    dom.supplyForm.reset();
    persistApplicationState();
    renderApplication();
  }

  function updateInventoryItem(inventoryItemId, fieldName, value) {
    applicationState.inventoryData = applicationState.inventoryData.map((inventoryItem) => {
      if (inventoryItem.id !== inventoryItemId) {
        return inventoryItem;
      }

      if (["packageQuantity", "packagePrice"].includes(fieldName)) {
        return {
          ...inventoryItem,
          [fieldName]: normalizeNumber(value)
        };
      }

      return {
        ...inventoryItem,
        [fieldName]: String(value)
      };
    });

    persistApplicationState();
    renderApplication();
  }

  function removeInventoryItem(inventoryItemId) {
    applicationState.inventoryData = applicationState.inventoryData.filter((inventoryItem) => inventoryItem.id !== inventoryItemId);
    applicationState.budgetSheets = applicationState.budgetSheets.map((budgetSheet) => {
      const materialUsage = { ...budgetSheet.materialUsage };
      delete materialUsage[inventoryItemId];

      return {
        ...budgetSheet,
        materialUsage
      };
    });

    persistApplicationState();
    renderApplication();
  }

  function addInventoryItemToBudget(inventoryItemId) {
    updateActiveBudgetSheet((budgetSheet) => {
      const currentQuantity = normalizeNumber(budgetSheet.materialUsage[inventoryItemId]);
      budgetSheet.materialUsage[inventoryItemId] = currentQuantity > 0 ? currentQuantity : 1;
    });
    applicationState.activeScreen = "calculator";
    persistApplicationState();
    renderApplication();
  }

  function createNewBudgetSheet() {
    const newBudgetSheet = createBudgetSheet(`Ficha ${applicationState.budgetSheets.length + 1}`, applicationState.inventoryData);
    applicationState.budgetSheets.unshift(newBudgetSheet);
    applicationState.activeBudgetSheetId = newBudgetSheet.id;
    persistApplicationState();
    renderApplication();
  }

  function updateActiveBudgetSheet(mutator) {
    const activeBudgetSheet = getActiveBudgetSheet();
    mutator(activeBudgetSheet);
  }

  function updateBudgetSheetField(fieldName, value) {
    updateActiveBudgetSheet((budgetSheet) => {
      budgetSheet[fieldName] = value;
    });
    persistApplicationState();
    renderBudgetSheetOptions();
    renderDashboard();
  }

  function updateLaborField(fieldName, value) {
    updateActiveBudgetSheet((budgetSheet) => {
      budgetSheet[fieldName] = normalizeNumber(value);
    });
    persistApplicationState();
    renderDashboard();
    dom.laborPreviewValue.textContent = formatCurrency(getActiveBudgetSummary().laborTotal);
  }

  function updateMaterialUsage(inventoryItemId, value) {
    updateActiveBudgetSheet((budgetSheet) => {
      budgetSheet.materialUsage[inventoryItemId] = normalizeNumber(value);
    });
    persistApplicationState();
    renderDashboard();
    updateCalculatorItemState(inventoryItemId);
  }

  function toggleCalculatorItem(inventoryItemId) {
    updateActiveBudgetSheet((budgetSheet) => {
      const currentQuantity = normalizeNumber(budgetSheet.materialUsage[inventoryItemId]);
      budgetSheet.materialUsage[inventoryItemId] = currentQuantity > 0 ? 0 : 1;
    });
    persistApplicationState();
    renderApplication();
  }

  function updateCalculatorItemState(inventoryItemId) {
    const activeBudgetSheet = getActiveBudgetSheet();
    const inventoryItem = applicationState.inventoryData.find((item) => item.id === inventoryItemId);
    const calculatorItem = Array.from(dom.calculatorItemList.querySelectorAll("[data-calculator-item-id]")).find((item) => {
      return item.dataset.calculatorItemId === inventoryItemId;
    });

    if (!activeBudgetSheet || !inventoryItem || !calculatorItem) {
      return;
    }

    const quantityUsed = normalizeNumber(activeBudgetSheet.materialUsage[inventoryItemId]);
    const isSelected = quantityUsed > 0;
    const lineTotal = calculatorItem.querySelector("[data-line-total]");
    const topPill = calculatorItem.querySelector(".pill");
    const toggleButton = calculatorItem.querySelector("[data-toggle-calculator-item]");

    calculatorItem.classList.toggle("is-selected", isSelected);
    toggleButton.textContent = isSelected ? "Usando" : "Adicionar";
    toggleButton.setAttribute("aria-pressed", String(isSelected));
    lineTotal.textContent = formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed));
    topPill.textContent = formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed));
  }

  function clearActiveBudgetSheetItems() {
    updateActiveBudgetSheet((budgetSheet) => {
      budgetSheet.materialUsage = createEmptyMaterialUsage(applicationState.inventoryData);
    });
    persistApplicationState();
    renderApplication();
  }

  function changeActiveBudgetSheet(budgetSheetId) {
    applicationState.activeBudgetSheetId = budgetSheetId;
    persistApplicationState();
    renderApplication();
  }

  function resetApplication() {
    const shouldReset = window.confirm("Restaurar dados iniciais e apagar dados salvos neste navegador?");

    if (!shouldReset) {
      return;
    }

    applicationState = stateRepository.resetState();
    inventorySearchTerm = "";
    calculatorSearchTerm = "";
    dom.inventorySearchInput.value = "";
    dom.calculatorSearchInput.value = "";
    renderApplication();
  }

  function renderPrintDocument() {
    const activeBudgetSheet = getActiveBudgetSheet();
    const activeBudgetSummary = getActiveBudgetSummary();
    const budgetTitle = activeBudgetSheet.title || "Orcamento de tatuagem";
    const clientName = activeBudgetSheet.clientName || "Cliente nao informado";
    const sessionNotes = activeBudgetSheet.sessionNotes || "Sem observacoes.";

    const itemRows = activeBudgetSummary.selectedItems.length > 0
      ? activeBudgetSummary.selectedItems.map((budgetItem) => `
          <tr>
            <td>${escapeHtml(budgetItem.inventoryItem.name)}</td>
            <td>${formatNumber(budgetItem.quantityUsed)} ${escapeHtml(budgetItem.inventoryItem.unitLabel)}</td>
            <td>${formatCurrency(budgetItem.unitCost)}</td>
            <td>${formatCurrency(budgetItem.materialCost)}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="4">Nenhum insumo selecionado.</td>
          </tr>
        `;

    dom.printDocument.innerHTML = `
      <header class="print-header">
        <span>CalculadoraTattoo</span>
        <h1>${escapeHtml(budgetTitle)}</h1>
        <p>${escapeHtml(clientName)}</p>
      </header>

      <section class="print-section">
        <h2>Resumo</h2>
        <dl class="print-summary">
          <div>
            <dt>Materiais</dt>
            <dd>${formatCurrency(activeBudgetSummary.materialTotal)}</dd>
          </div>
          <div>
            <dt>Mao de obra</dt>
            <dd>${formatCurrency(activeBudgetSummary.laborTotal)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>${formatCurrency(activeBudgetSummary.totalCost)}</dd>
          </div>
        </dl>
      </section>

      <section class="print-section">
        <h2>Itens usados</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Qtd.</th>
              <th>Custo un.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </section>

      <section class="print-section">
        <h2>Mao de obra</h2>
        <p>${formatNumber(activeBudgetSummary.laborHours)} h x ${formatCurrency(activeBudgetSummary.hourlyRate)} por hora = <strong>${formatCurrency(activeBudgetSummary.laborTotal)}</strong></p>
      </section>

      <section class="print-section">
        <h2>Observacoes</h2>
        <p>${escapeHtml(sessionNotes)}</p>
      </section>
    `;
  }

  function downloadBudgetPdf() {
    renderPrintDocument();
    window.print();
  }

  function bindEventListeners() {
    dom.navigationButtons.forEach((navigationButton) => {
      navigationButton.addEventListener("click", () => {
        setActiveScreen(navigationButton.dataset.screenTarget);
      });
    });

    dom.applyPriceTableButton.addEventListener("click", applyPriceTable);
    dom.createBudgetSheetButton.addEventListener("click", createNewBudgetSheet);
    dom.clearBudgetSheetButton.addEventListener("click", clearActiveBudgetSheetItems);
    dom.downloadBudgetPdfButton.addEventListener("click", downloadBudgetPdf);
    dom.resetApplicationButton.addEventListener("click", resetApplication);

    dom.budgetSheetSelect.addEventListener("change", (event) => {
      changeActiveBudgetSheet(event.target.value);
    });

    dom.supplyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addInventoryItemFromForm();
    });

    dom.budgetSheetForm.addEventListener("input", (event) => {
      updateBudgetSheetField(event.target.name, event.target.value);
    });

    dom.laborHoursInput.addEventListener("input", (event) => {
      updateLaborField("laborHours", event.target.value);
    });

    dom.hourlyRateInput.addEventListener("input", (event) => {
      updateLaborField("hourlyRate", event.target.value);
    });

    dom.inventorySearchInput.addEventListener("input", (event) => {
      inventorySearchTerm = event.target.value;
      renderInventoryList();
    });

    dom.calculatorSearchInput.addEventListener("input", (event) => {
      calculatorSearchTerm = event.target.value;
      renderCalculatorItemList();
    });

    dom.inventoryList.addEventListener("change", (event) => {
      const inventoryCard = event.target.closest("[data-inventory-item-id]");
      const fieldName = event.target.dataset.inventoryField;

      if (!inventoryCard || !fieldName) {
        return;
      }

      updateInventoryItem(inventoryCard.dataset.inventoryItemId, fieldName, event.target.value);
    });

    dom.inventoryList.addEventListener("click", (event) => {
      const inventoryCard = event.target.closest("[data-inventory-item-id]");

      if (!inventoryCard) {
        return;
      }

      if (event.target.closest("[data-add-inventory-item-to-budget]")) {
        addInventoryItemToBudget(inventoryCard.dataset.inventoryItemId);
        return;
      }

      if (event.target.closest("[data-remove-inventory-item]")) {
        removeInventoryItem(inventoryCard.dataset.inventoryItemId);
      }
    });

    dom.calculatorItemList.addEventListener("input", (event) => {
      if (!event.target.matches("[data-material-usage]")) {
        return;
      }

      const calculatorItem = event.target.closest("[data-calculator-item-id]");
      updateMaterialUsage(calculatorItem.dataset.calculatorItemId, event.target.value);
    });

    dom.calculatorItemList.addEventListener("click", (event) => {
      const toggleButton = event.target.closest("[data-toggle-calculator-item]");

      if (!toggleButton) {
        return;
      }

      const calculatorItem = toggleButton.closest("[data-calculator-item-id]");
      toggleCalculatorItem(calculatorItem.dataset.calculatorItemId);
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  return {
    initializeApplication
  };
})();

CalculadoraTattooApp.initializeApplication();
