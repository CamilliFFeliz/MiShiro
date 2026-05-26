import {
  calculateMaterialCost,
  calculateTotalCost,
  calculateUnitCost,
  normalizeNumber
} from "./calculation-engine.js";
import { createApplicationRepository } from "./application-repository.js";
import { assertRepositoryContract } from "./data-contracts.js";

const APPLICATION_DATABASE_NAME = "CALCULADORA_TATTOO_DATABASE";
const APPLICATION_STORE_NAME = "APPLICATION_STATE_STORE";
const APPLICATION_STATE_KEY = "CALCULADORA_TATTOO_STATE_V1";
const DEFAULT_LABOR_HOURS = 1;
const DEFAULT_HOURLY_RATE = 0;
const ALL_CATEGORIES_FILTER = "Todos";
const CARTRIDGE_CATEGORY_NAME = "Cartuchos";
const CSV_PROCESS_BATCH_SIZE = 24;
const JSPDF_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const STOCK_LOW_PERCENTAGE = 25;

const INVENTORY_CATEGORY_OPTIONS = [
  "Cartuchos",
  "Tintas",
  "Biossegurança",
  "Descartáveis",
  "Outros"
];

const INVENTORY_FILTER_OPTIONS = [
  ALL_CATEGORIES_FILTER,
  ...INVENTORY_CATEGORY_OPTIONS
];

const UNIT_MEASURE_OPTIONS = [
  "ml",
  "gramas",
  "mg",
  "unidade",
  "folhas",
  "metros"
];

const UNIT_MEASURE_LABELS = {
  ml: "ml",
  gramas: "gramas",
  mg: "mg",
  unidade: "unidade",
  folhas: "folhas",
  metros: "metros"
};

const DEFAULT_CSV_COLUMN_INDEXES = {
  name: 0,
  packageQuantity: 1,
  unitLabel: 2,
  packagePrice: 3,
  category: 4,
  brand: 5,
  specification: 6
};

const CSV_HEADER_ALIASES = {
  name: ["nome", "material", "produto", "insumo", "name"],
  category: ["categoria", "category", "tipoitem"],
  packageQuantity: ["quantidadeembalagem", "qtdembalagem", "qtdpacote", "quantidadepacote", "quantidade", "packagequantity"],
  unitLabel: ["unidade", "un", "unit", "unitlabel"],
  packagePrice: ["precopacote", "precoembalagem", "preco", "valor", "packageprice"],
  currentStock: ["estoque", "estoqueatual", "stock", "currentstock"],
  brand: ["marca", "brand"],
  specification: ["especificacao", "numeracao", "numero", "tipo", "modelo", "codigotipo", "specification"]
};

const BASE_INVENTORY_ITEMS = [
  { name: "Cartucho White Head", category: "Cartuchos", packageQuantity: 20, unitLabel: "unidade", packagePrice: 300, currentStock: 20, brand: "White Head", specification: "RL0310" },
  { name: "Tinta preto linha", category: "Tintas", packageQuantity: 20, unitLabel: "ml", packagePrice: 50, currentStock: 20 },
  { name: "Tinta Raven Clow", category: "Tintas", packageQuantity: 20, unitLabel: "ml", packagePrice: 79, currentStock: 20 },
  { name: "Luvas", category: "Biossegurança", packageQuantity: 100, unitLabel: "unidade", packagePrice: 30, currentStock: 100 },
  { name: "Máscara", category: "Biossegurança", packageQuantity: 100, unitLabel: "unidade", packagePrice: 25, currentStock: 100 },
  { name: "Batoque", category: "Descartáveis", packageQuantity: 50, unitLabel: "unidade", packagePrice: 30, currentStock: 50 },
  { name: "Papel toalha", category: "Descartáveis", packageQuantity: 200, unitLabel: "folhas", packagePrice: 12, currentStock: 200 },
  { name: "Folha stencil", category: "Descartáveis", packageQuantity: 1, unitLabel: "folha", packagePrice: 4.5, currentStock: 1 },
  { name: "Transfer", category: "Outros", packageQuantity: 30, unitLabel: "ml", packagePrice: 28, currentStock: 30 }
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});

const PDF_COLORS = Object.freeze({
  PURPLE_DARK: [45, 11, 64],
  PURPLE: [106, 27, 154],
  PURPLE_LIGHT: [225, 190, 231],
  BLACK: [18, 18, 18],
  WHITE: [255, 255, 255]
});

const CalculadoraTattooApp = (() => {
  const stateRepository = createApplicationRepository({
    databaseName: APPLICATION_DATABASE_NAME,
    storeName: APPLICATION_STORE_NAME,
    stateKey: APPLICATION_STATE_KEY,
    fallbackFactory: createInitialState
  });

  assertRepositoryContract(stateRepository);

  const elementReferences = {};
  let applicationState = createInitialState();
  let activeInventoryCategory = ALL_CATEGORIES_FILTER;
  let adjustingInventoryItemId = null;
  let editingInventoryItemId = null;
  let inventorySearchTerm = "";
  let projectItemSheetSearchTerm = "";
  let shouldSyncCurrentStockWithPackageQuantity = false;

  async function initializeApplication() {
    bindElementReferences();
    bindEventListeners();

    try {
      applicationState = normalizeApplicationState(await stateRepository.getState());
    } catch {
      applicationState = createInitialState();
    }

    renderApplication();
    registerServiceWorker();
  }

  function bindElementReferences() {
    elementReferences.activeProjectTotal = document.querySelector("#activeProjectTotal");
    elementReferences.applicationScreens = document.querySelectorAll("[data-screen-panel]");
    elementReferences.cancelCsvImportModalButton = document.querySelector("#cancelCsvImportModalButton");
    elementReferences.cancelProjectModalButton = document.querySelector("#cancelProjectModalButton");
    elementReferences.cancelStockAdjustmentModalButton = document.querySelector("#cancelStockAdjustmentModalButton");
    elementReferences.cancelSupplyModalButton = document.querySelector("#cancelSupplyModalButton");
    elementReferences.cartridgeBrandInput = document.querySelector("#cartridgeBrandInput");
    elementReferences.cartridgeExtraFields = document.querySelector("#cartridgeExtraFields");
    elementReferences.cartridgeSpecificationInput = document.querySelector("#cartridgeSpecificationInput");
    elementReferences.clearProjectButton = document.querySelector("#clearProjectButton");
    elementReferences.closeCsvImportModalButton = document.querySelector("#closeCsvImportModalButton");
    elementReferences.closeDrawerButton = document.querySelector("#closeDrawerButton");
    elementReferences.closeProjectItemSheetButton = document.querySelector("#closeProjectItemSheetButton");
    elementReferences.closeProjectModalButton = document.querySelector("#closeProjectModalButton");
    elementReferences.closeStockAdjustmentModalButton = document.querySelector("#closeStockAdjustmentModalButton");
    elementReferences.closeSupplyModalButton = document.querySelector("#closeSupplyModalButton");
    elementReferences.createProjectButton = document.querySelector("#createProjectButton");
    elementReferences.currentStockInput = document.querySelector("#currentStockInput");
    elementReferences.currentStockLabel = document.querySelector("#currentStockLabel");
    elementReferences.csvFileInput = document.querySelector("#csvFileInput");
    elementReferences.csvImportForm = document.querySelector("#csvImportForm");
    elementReferences.csvImportModal = document.querySelector("#csvImportModal");
    elementReferences.csvImportProgress = document.querySelector("#csvImportProgress");
    elementReferences.downloadBackupButton = document.querySelector("#downloadBackupButton");
    elementReferences.downloadBackupBottomButton = document.querySelector("#downloadBackupBottomButton");
    elementReferences.downloadProjectPdfButton = document.querySelector("#downloadProjectPdfButton");
    elementReferences.drawerBackdrop = document.querySelector("#drawerBackdrop");
    elementReferences.drawerMenu = document.querySelector("#drawerMenu");
    elementReferences.emptyStateTemplate = document.querySelector("#emptyStateTemplate");
    elementReferences.floatingActionButton = document.querySelector("#openSupplyModalButton");
    elementReferences.homeDashboard = document.querySelector("#homeDashboard");
    elementReferences.homeHeroDetail = document.querySelector("#homeHeroDetail");
    elementReferences.homeHeroTotal = document.querySelector("#homeHeroTotal");
    elementReferences.hourlyRateInput = document.querySelector("#hourlyRateInput");
    elementReferences.inventoryCategoryFilterList = document.querySelector("#inventoryCategoryFilterList");
    elementReferences.inventoryDashboard = document.querySelector("#inventoryDashboard");
    elementReferences.inventoryList = document.querySelector("#inventoryList");
    elementReferences.inventorySearchInput = document.querySelector("#inventorySearchInput");
    elementReferences.invoiceDocument = document.querySelector("#invoiceDocument");
    elementReferences.laborHoursInput = document.querySelector("#laborHoursInput");
    elementReferences.laborPreviewValue = document.querySelector("#laborPreviewValue");
    elementReferences.navigationButtons = document.querySelectorAll("[data-screen-target]");
    elementReferences.newProjectNameInput = document.querySelector("#newProjectNameInput");
    elementReferences.openCsvImportModalButton = document.querySelector("#openCsvImportModalButton");
    elementReferences.openCsvImportBottomButton = document.querySelector("#openCsvImportBottomButton");
    elementReferences.openDrawerButton = document.querySelector("#openDrawerButton");
    elementReferences.openProjectItemSheetButton = document.querySelector("#openProjectItemSheetButton");
    elementReferences.packagePriceInput = document.querySelector("#packagePriceInput");
    elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
    elementReferences.packageQuantityLabel = document.querySelector("#packageQuantityLabel");
    elementReferences.processCsvButton = document.querySelector("#processCsvButton");
    elementReferences.projectClientInput = document.querySelector("#projectClientInput");
    elementReferences.projectCreationForm = document.querySelector("#projectCreationForm");
    elementReferences.projectDashboard = document.querySelector("#projectDashboard");
    elementReferences.projectForm = document.querySelector("#projectForm");
    elementReferences.projectItemList = document.querySelector("#projectItemList");
    elementReferences.projectItemSheet = document.querySelector("#projectItemSheet");
    elementReferences.projectItemSheetList = document.querySelector("#projectItemSheetList");
    elementReferences.projectItemSheetSearchInput = document.querySelector("#projectItemSheetSearchInput");
    elementReferences.projectModal = document.querySelector("#projectModal");
    elementReferences.projectNameInput = document.querySelector("#projectNameInput");
    elementReferences.projectNotesInput = document.querySelector("#projectNotesInput");
    elementReferences.projectSelect = document.querySelector("#projectSelect");
    elementReferences.projectTotalDetail = document.querySelector("#projectTotalDetail");
    elementReferences.projectTotalValue = document.querySelector("#projectTotalValue");
    elementReferences.saveSupplyButton = document.querySelector("#saveSupplyButton");
    elementReferences.stockModeSelect = document.querySelector("#stockModeSelect");
    elementReferences.stockAdjustmentCurrentValue = document.querySelector("#stockAdjustmentCurrentValue");
    elementReferences.stockAdjustmentForm = document.querySelector("#stockAdjustmentForm");
    elementReferences.stockAdjustmentHelperText = document.querySelector("#stockAdjustmentHelperText");
    elementReferences.stockAdjustmentModal = document.querySelector("#stockAdjustmentModal");
    elementReferences.stockAdjustmentProjectedValue = document.querySelector("#stockAdjustmentProjectedValue");
    elementReferences.stockAdjustmentReservedValue = document.querySelector("#stockAdjustmentReservedValue");
    elementReferences.stockDecreaseQuantityInput = document.querySelector("#stockDecreaseQuantityInput");
    elementReferences.supplyCategorySelect = document.querySelector("#supplyCategorySelect");
    elementReferences.supplyForm = document.querySelector("#supplyForm");
    elementReferences.supplyModalKicker = document.querySelector("#supplyModalKicker");
    elementReferences.supplyModalTitle = document.querySelector("#supplyModalTitle");
    elementReferences.supplyModal = document.querySelector("#supplyModal");
    elementReferences.supplyNameInput = document.querySelector("#supplyNameInput");
    elementReferences.supplyUnitCostDetail = document.querySelector("#supplyUnitCostDetail");
    elementReferences.supplyUnitCostPreview = document.querySelector("#supplyUnitCostPreview");
    elementReferences.unitLabelInput = document.querySelector("#unitLabelInput");
  }

  function createInitialState() {
    const inventoryData = BASE_INVENTORY_ITEMS.map((inventoryItem, inventoryIndex) => ({
      id: `base-inventory-${inventoryIndex + 1}`,
      name: inventoryItem.name,
      category: normalizeInventoryCategory(inventoryItem.category),
      packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
      unitLabel: normalizeUnitMeasure(inventoryItem.unitLabel),
      packagePrice: normalizeNumber(inventoryItem.packagePrice),
      currentStock: normalizeNumber(inventoryItem.currentStock || inventoryItem.packageQuantity),
      stockMode: "fractional",
      brand: inventoryItem.brand || "",
      specification: inventoryItem.specification || "",
      createdAt: new Date().toISOString()
    }));
    const firstProject = createProject("Projeto 1", inventoryData);

    return {
      activeScreen: "inventory",
      activeProjectId: firstProject.id,
      inventoryData,
      projects: [firstProject]
    };
  }

  function createProject(projectName, inventoryData) {
    return {
      id: createEntityId("project"),
      projectName,
      clientName: "",
      projectNotes: "",
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
    if (!rawState || !Array.isArray(rawState.inventoryData)) {
      return createInitialState();
    }

    const inventoryData = rawState.inventoryData.map((inventoryItem) => {
      const itemName = String(inventoryItem.name || "Novo item");
      const itemCategory = normalizeInventoryCategory(inventoryItem.category || inferInventoryCategory(itemName));
      const packageQuantity = normalizeNumber(inventoryItem.packageQuantity);

      return {
        id: inventoryItem.id || createEntityId("inventory"),
        name: itemName,
        category: itemCategory,
        packageQuantity,
        unitLabel: normalizeUnitMeasure(inventoryItem.unitLabel),
        packagePrice: normalizeNumber(inventoryItem.packagePrice),
        currentStock: normalizeNumber(inventoryItem.currentStock == null ? packageQuantity : inventoryItem.currentStock),
        stockMode: ["fractional", "sealedPackages"].includes(inventoryItem.stockMode) ? inventoryItem.stockMode : "fractional",
        brand: String(inventoryItem.brand || ""),
        specification: String(inventoryItem.specification || inventoryItem.needleSpecification || inventoryItem.needleType || ""),
        createdAt: inventoryItem.createdAt || new Date().toISOString()
      };
    });

    const rawProjects = Array.isArray(rawState.projects) ? rawState.projects : [];
    const projects = rawProjects.map((projectData, projectIndex) => ({
      id: projectData.id || createEntityId("project"),
      projectName: String(projectData.projectName || projectData.title || `Projeto ${projectIndex + 1}`),
      clientName: String(projectData.clientName || ""),
      projectNotes: String(projectData.projectNotes || projectData.sessionNotes || ""),
      laborHours: normalizeNumber(projectData.laborHours == null ? DEFAULT_LABOR_HOURS : projectData.laborHours),
      hourlyRate: normalizeNumber(projectData.hourlyRate == null ? DEFAULT_HOURLY_RATE : projectData.hourlyRate),
      materialUsage: normalizeMaterialUsage(projectData.materialUsage, inventoryData),
      createdAt: projectData.createdAt || new Date().toISOString()
    }));

    if (projects.length === 0) {
      projects.push(createProject("Projeto 1", inventoryData));
    }

    const activeProjectId = projects.some((projectData) => projectData.id === rawState.activeProjectId)
      ? rawState.activeProjectId
      : projects[0].id;

    return {
      activeScreen: ["inventory", "projects"].includes(rawState.activeScreen) ? rawState.activeScreen : "inventory",
      activeProjectId,
      inventoryData,
      projects
    };
  }

  function normalizeMaterialUsage(materialUsage, inventoryData) {
    return inventoryData.reduce((normalizedUsage, inventoryItem) => {
      normalizedUsage[inventoryItem.id] = normalizeNumber(materialUsage ? materialUsage[inventoryItem.id] : 0);
      return normalizedUsage;
    }, {});
  }

  function getActiveProject() {
    return applicationState.projects.find((projectData) => projectData.id === applicationState.activeProjectId)
      || applicationState.projects[0];
  }

  function getActiveProjectSummary() {
    return calculateTotalCost({
      inventoryData: applicationState.inventoryData,
      projectData: getActiveProject()
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

  function formatEditableNumber(value) {
    const normalizedValue = normalizeNumber(value);
    return String(normalizedValue).replace(".", ",");
  }

  function findInventoryItemById(inventoryItemId) {
    return applicationState.inventoryData.find((inventoryItem) => inventoryItem.id === inventoryItemId);
  }

  function normalizeUnitMeasure(unitMeasure) {
    const normalizedUnit = normalizeTextForSearch(unitMeasure).replace(/[^a-z0-9]/g, "");

    if (["un", "und", "unid", "unidade", "unidades", "unit", "units"].includes(normalizedUnit)) {
      return "unidade";
    }

    if (["g", "grama", "gramas", "gram", "grams"].includes(normalizedUnit)) {
      return "gramas";
    }

    if (["metro", "metros", "m"].includes(normalizedUnit)) {
      return "metros";
    }

    if (["folha", "folhas"].includes(normalizedUnit)) {
      return "folhas";
    }

    if (["ml", "mililitro", "mililitros"].includes(normalizedUnit)) {
      return "ml";
    }

    if (["mg", "miligrama", "miligramas"].includes(normalizedUnit)) {
      return "mg";
    }

    return UNIT_MEASURE_OPTIONS.includes(unitMeasure) ? unitMeasure : "unidade";
  }

  function getUnitMeasureLabel(unitMeasure) {
    return UNIT_MEASURE_LABELS[normalizeUnitMeasure(unitMeasure)] || "unidade";
  }

  function getStockProgress(inventoryItem) {
    const packageQuantity = normalizeNumber(inventoryItem.packageQuantity);
    const availableStock = getAvailableStock(inventoryItem.id);

    if (packageQuantity <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (availableStock / packageQuantity) * 100));
  }

  function getStockStatus(inventoryItem) {
    const stockProgress = getStockProgress(inventoryItem);

    if (stockProgress <= 0) {
      return {
        className: "is-stock-empty",
        label: "Esgotado"
      };
    }

    if (stockProgress <= STOCK_LOW_PERCENTAGE) {
      return {
        className: "is-stock-low",
        label: "Baixo estoque"
      };
    }

    return {
      className: "is-stock-ok",
      label: "Estoque ok"
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeTextForSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function persistApplicationState() {
    stateRepository.saveState(applicationState).catch(() => {});
  }

  function renderApplication() {
    renderActiveScreen();
    renderHomeDashboard();
    renderProjectOptions();
    renderProjectForm();
    renderDashboard();
    renderInventoryCategoryFilters();
    renderInventoryList();
    renderProjectItemList();
    renderProjectItemSheet();
    updateSupplyCategoryFields();
    updateSupplyMeasurementFields();
    updateSupplyUnitCostPreview();
  }

  function renderActiveScreen() {
    elementReferences.applicationScreens.forEach((screenElement) => {
      screenElement.classList.toggle("is-active", screenElement.dataset.screenPanel === applicationState.activeScreen);
    });

    elementReferences.navigationButtons.forEach((navigationButton) => {
      const isActive = navigationButton.dataset.screenTarget === applicationState.activeScreen;
      navigationButton.classList.toggle("is-active", isActive);
      navigationButton.setAttribute("aria-current", isActive ? "page" : "false");
    });

    elementReferences.floatingActionButton.hidden = applicationState.activeScreen !== "inventory";
  }

  function renderHomeDashboard() {
    const activeProjectSummary = getActiveProjectSummary();
    const inventorySummary = calculateInventoryDashboard();

    elementReferences.homeHeroTotal.textContent = formatCurrency(activeProjectSummary.totalCost);
    elementReferences.homeHeroDetail.textContent = `${activeProjectSummary.selectedItemCount} ${activeProjectSummary.selectedItemCount === 1 ? "insumo em uso" : "insumos em uso"}`;

    elementReferences.homeDashboard.innerHTML = `
      <article class="metric-card">
        <span>Itens em estoque</span>
        <strong>${inventorySummary.itemCount}</strong>
      </article>
      <article class="metric-card">
        <span>Disponível</span>
        <strong>${formatNumber(inventorySummary.availableStock)}</strong>
      </article>
      <article class="metric-card">
        <span>Reservado</span>
        <strong>${formatNumber(inventorySummary.reservedStock)}</strong>
      </article>
      <article class="metric-card">
        <span>Orçamentos</span>
        <strong>${applicationState.projects.length}</strong>
      </article>
    `;
  }

  function renderProjectOptions() {
    elementReferences.projectSelect.innerHTML = applicationState.projects.map((projectData) => {
      const selectedAttribute = projectData.id === applicationState.activeProjectId ? "selected" : "";
      return `<option value="${escapeHtml(projectData.id)}" ${selectedAttribute}>${escapeHtml(projectData.projectName)}</option>`;
    }).join("");
  }

  function renderProjectForm() {
    const activeProject = getActiveProject();
    const activeProjectSummary = getActiveProjectSummary();

    elementReferences.projectNameInput.value = activeProject.projectName;
    elementReferences.projectClientInput.value = activeProject.clientName;
    elementReferences.projectNotesInput.value = activeProject.projectNotes;
    elementReferences.laborHoursInput.value = formatNumber(activeProject.laborHours);
    elementReferences.hourlyRateInput.value = activeProject.hourlyRate > 0 ? formatNumber(activeProject.hourlyRate) : "";
    elementReferences.laborPreviewValue.textContent = formatCurrency(activeProjectSummary.laborTotal);
  }

  function renderDashboard() {
    const activeProjectSummary = getActiveProjectSummary();
    const inventorySummary = calculateInventoryDashboard();

    elementReferences.activeProjectTotal.textContent = formatCurrency(activeProjectSummary.totalCost);
    elementReferences.projectTotalValue.textContent = formatCurrency(activeProjectSummary.totalCost);
    elementReferences.projectTotalDetail.textContent = `${activeProjectSummary.selectedItemCount} ${activeProjectSummary.selectedItemCount === 1 ? "insumo selecionado" : "insumos selecionados"}`;

    elementReferences.inventoryDashboard.innerHTML = `
      <article class="metric-card">
        <span>Itens</span>
        <strong>${inventorySummary.itemCount}</strong>
      </article>
      <article class="metric-card">
        <span>Disponível</span>
        <strong>${formatNumber(inventorySummary.availableStock)}</strong>
      </article>
      <article class="metric-card">
        <span>Reservado</span>
        <strong>${formatNumber(inventorySummary.reservedStock)}</strong>
      </article>
      <article class="metric-card">
        <span>Valor estoque</span>
        <strong>${formatCurrency(inventorySummary.stockValue)}</strong>
      </article>
    `;

    elementReferences.projectDashboard.innerHTML = `
      <article class="metric-card">
        <span>Selecionados</span>
        <strong>${activeProjectSummary.selectedItemCount}</strong>
      </article>
      <article class="metric-card">
        <span>Materiais</span>
        <strong>${formatCurrency(activeProjectSummary.materialTotal)}</strong>
      </article>
      <article class="metric-card">
        <span>Mão de obra</span>
        <strong>${formatCurrency(activeProjectSummary.laborTotal)}</strong>
      </article>
      <article class="metric-card">
        <span>Total final</span>
        <strong>${formatCurrency(activeProjectSummary.totalCost)}</strong>
      </article>
    `;
  }

  function calculateInventoryDashboard() {
    const itemCount = applicationState.inventoryData.length;
    const reservedStock = applicationState.inventoryData.reduce((total, inventoryItem) => total + getTotalUsedQuantity(inventoryItem.id), 0);
    const availableStock = applicationState.inventoryData.reduce((total, inventoryItem) => total + getAvailableStock(inventoryItem.id), 0);
    const stockValue = applicationState.inventoryData.reduce((total, inventoryItem) => {
      return total + calculateUnitCost(inventoryItem) * getAvailableStock(inventoryItem.id);
    }, 0);

    return {
      itemCount,
      availableStock,
      reservedStock,
      stockValue
    };
  }

  function renderInventoryCategoryFilters() {
    elementReferences.inventoryCategoryFilterList.innerHTML = INVENTORY_FILTER_OPTIONS.map((categoryName) => {
      const isActive = categoryName === activeInventoryCategory;
      const itemCount = getInventoryCountByCategory(categoryName);

      return `
        <button class="filter-chip ${isActive ? "is-active" : ""}" type="button" data-inventory-category-filter="${escapeHtml(categoryName)}" aria-pressed="${isActive}">
          <span>${escapeHtml(categoryName)}</span>
          <strong>${itemCount}</strong>
        </button>
      `;
    }).join("");
  }

  function getInventoryCountByCategory(categoryName) {
    if (categoryName === ALL_CATEGORIES_FILTER) {
      return applicationState.inventoryData.length;
    }

    return applicationState.inventoryData.filter((inventoryItem) => inventoryItem.category === categoryName).length;
  }

  function renderInventoryList() {
    const filteredInventoryData = getFilteredInventoryData(inventorySearchTerm, activeInventoryCategory);

    if (filteredInventoryData.length === 0) {
      renderEmptyState(elementReferences.inventoryList);
      return;
    }

    elementReferences.inventoryList.innerHTML = filteredInventoryData.map(createInventoryCardHtml).join("");
  }

  function getFilteredInventoryData(searchTerm, categoryFilter = ALL_CATEGORIES_FILTER) {
    const normalizedSearchTerm = normalizeTextForSearch(searchTerm).trim();

    return applicationState.inventoryData.filter((inventoryItem) => {
      const matchesCategory = categoryFilter === ALL_CATEGORIES_FILTER || inventoryItem.category === categoryFilter;
      const matchesSearch = !normalizedSearchTerm || getInventorySearchText(inventoryItem).includes(normalizedSearchTerm);
      return matchesCategory && matchesSearch;
    });
  }

  function getInventorySearchText(inventoryItem) {
    return normalizeTextForSearch([
      inventoryItem.name,
      inventoryItem.category,
      inventoryItem.unitLabel,
      inventoryItem.brand,
      inventoryItem.specification
    ].join(" "));
  }

  function createInventoryCardHtml(inventoryItem) {
    const availableStock = getAvailableStock(inventoryItem.id);
    const reservedStock = getTotalUsedQuantity(inventoryItem.id);
    const unitMeasureLabel = getUnitMeasureLabel(inventoryItem.unitLabel);
    const stockProgress = getStockProgress(inventoryItem);
    const stockStatus = getStockStatus(inventoryItem);

    return `
      <article class="data-card inventory-card ${stockStatus.className}" data-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="product-card-topline">
          <span class="category-pill">${escapeHtml(inventoryItem.category)}</span>
          <span class="unit-sale-tag">Vendido por ${escapeHtml(unitMeasureLabel)}</span>
        </div>

        <div class="product-card-identity">
          <div>
            <h2>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h2>
            <span>${escapeHtml(getInventorySubtitle(inventoryItem))}</span>
          </div>
          <div class="product-card-price">
            <span>Custo unitário</span>
            <strong>${formatCurrency(calculateUnitCost(inventoryItem))}</strong>
            <small>por ${escapeHtml(unitMeasureLabel)}</small>
          </div>
        </div>

        <div class="stock-row">
          <div>
            <span>Cadastrado</span>
            <strong>${formatNumber(inventoryItem.currentStock)} ${escapeHtml(unitMeasureLabel)}</strong>
          </div>
          <div>
            <span>Disponível</span>
            <strong>${formatNumber(availableStock)} ${escapeHtml(unitMeasureLabel)}</strong>
          </div>
          <div>
            <span>Reservado</span>
            <strong>${formatNumber(reservedStock)} ${escapeHtml(unitMeasureLabel)}</strong>
          </div>
        </div>

        <div class="stock-meter" aria-label="${escapeHtml(stockStatus.label)}">
          <div class="stock-meter-label">
            <span>${escapeHtml(stockStatus.label)}</span>
            <strong>${formatNumber(stockProgress)}%</strong>
          </div>
          <span class="stock-meter-track">
            <span class="stock-meter-fill" style="width: ${stockProgress}%"></span>
          </span>
        </div>

        <div class="inventory-card-actions">
          <button class="button button-primary" type="button" data-edit-inventory-item>Editar</button>
          <button class="button button-quiet" type="button" data-decrease-inventory-stock ${availableStock <= 0 ? "disabled" : ""}>Diminuir</button>
          <button class="button button-danger" type="button" data-delete-inventory-item>Excluir</button>
        </div>
      </article>
    `;
  }

  function getInventoryDisplayName(inventoryItem) {
    if (inventoryItem.category !== CARTRIDGE_CATEGORY_NAME) {
      return inventoryItem.name;
    }

    const cartridgeIdentity = [inventoryItem.brand, inventoryItem.specification].filter(Boolean).join(" - ");
    return cartridgeIdentity || inventoryItem.name;
  }

  function getInventorySubtitle(inventoryItem) {
    const packageText = `${formatNumber(inventoryItem.packageQuantity)} ${getUnitMeasureLabel(inventoryItem.unitLabel)} por embalagem fechada`;
    return `${inventoryItem.category} | ${packageText}`;
  }

  function renderProjectItemList() {
    const activeProjectSummary = getActiveProjectSummary();

    if (activeProjectSummary.selectedItems.length === 0) {
      elementReferences.projectItemList.innerHTML = `
        <article class="empty-state">
          <strong>Nenhum insumo no projeto</strong>
          <span>Use Adicionar insumo para montar o orçamento.</span>
        </article>
      `;
      return;
    }

    elementReferences.projectItemList.innerHTML = activeProjectSummary.selectedItems.map(createSelectedProjectItemHtml).join("");
  }

  function createSelectedProjectItemHtml(projectItem) {
    const inventoryItem = projectItem.inventoryItem;

    return `
      <article class="data-card project-item cart-item is-selected" data-project-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h3>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h3>
            <span>${escapeHtml(getInventorySubtitle(inventoryItem))}</span>
          </div>
          <span class="pill">Subtotal ${formatCurrency(projectItem.materialCost)}</span>
        </div>

        <div class="project-item-control">
          <label class="quantity-field">
            <span>Quantidade no carrinho</span>
            <span class="quantity-input-row">
              <input type="text" inputmode="decimal" value="${escapeHtml(projectItem.quantityUsed)}" placeholder="0" data-material-usage />
              <span>${escapeHtml(getUnitMeasureLabel(inventoryItem.unitLabel))}</span>
            </span>
          </label>
          <button class="button button-danger" type="button" data-remove-project-item>Remover</button>
        </div>

        <div class="line-total">
          <span>${formatCurrency(projectItem.unitCost)} por ${escapeHtml(getUnitMeasureLabel(inventoryItem.unitLabel))}</span>
          <strong data-line-total>${formatCurrency(projectItem.materialCost)}</strong>
        </div>
      </article>
    `;
  }

  function renderProjectItemSheet() {
    const filteredInventoryData = getFilteredInventoryData(projectItemSheetSearchTerm, ALL_CATEGORIES_FILTER);

    if (filteredInventoryData.length === 0) {
      renderEmptyState(elementReferences.projectItemSheetList);
      return;
    }

    elementReferences.projectItemSheetList.innerHTML = INVENTORY_CATEGORY_OPTIONS.map((categoryName) => {
      const categoryItems = filteredInventoryData.filter((inventoryItem) => inventoryItem.category === categoryName);

      if (categoryItems.length === 0) {
        return "";
      }

      return `
        <section class="sheet-category-group">
          <div class="sheet-category-header">
            <h3>${escapeHtml(categoryName)}</h3>
            <span>${categoryItems.length}</span>
          </div>
          <div class="sheet-category-items">
            ${categoryItems.map(createProjectSheetItemHtml).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  function createProjectSheetItemHtml(inventoryItem) {
    const activeProject = getActiveProject();
    const quantityUsed = normalizeNumber(activeProject.materialUsage[inventoryItem.id]);
    const availableStock = getAvailableStock(inventoryItem.id);
    const materialCost = calculateMaterialCost(inventoryItem, quantityUsed);
    const unitMeasureLabel = getUnitMeasureLabel(inventoryItem.unitLabel);

    return `
      <article class="sheet-item ${quantityUsed > 0 ? "is-selected" : ""}" data-sheet-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="sheet-item-main">
          <div class="card-title-group">
            <h4>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h4>
            <span>Disponível: ${formatNumber(availableStock)} ${escapeHtml(unitMeasureLabel)}</span>
          </div>
          <span class="pill">${formatCurrency(calculateUnitCost(inventoryItem))}/${escapeHtml(unitMeasureLabel)}</span>
        </div>

        <div class="sheet-item-control">
          <label class="quantity-field">
            <span>Usar</span>
            <span class="quantity-input-row">
              <input type="text" inputmode="decimal" value="${quantityUsed > 0 ? escapeHtml(quantityUsed) : ""}" placeholder="0" data-sheet-material-usage />
              <span>${escapeHtml(unitMeasureLabel)}</span>
            </span>
          </label>
          <button class="button button-primary" type="button" data-sheet-select-item>${quantityUsed > 0 ? "Atualizar" : "Adicionar"}</button>
        </div>

        <div class="line-total">
          <span>Custo no projeto</span>
          <strong data-sheet-line-total>${formatCurrency(materialCost)}</strong>
        </div>
      </article>
    `;
  }

  function renderEmptyState(container) {
    const emptyState = elementReferences.emptyStateTemplate.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(emptyState);
  }

  function setActiveScreen(screenName) {
    applicationState.activeScreen = screenName;
    persistApplicationState();
    renderApplication();
  }

  function openSupplyModal() {
    editingInventoryItemId = null;
    shouldSyncCurrentStockWithPackageQuantity = true;
    elementReferences.supplyForm.reset();
    clearSupplyFormValidation();
    elementReferences.supplyModalKicker.textContent = "Ferramenta de entrada";
    elementReferences.supplyModalTitle.textContent = "Nova entrada";
    elementReferences.saveSupplyButton.textContent = "Salvar entrada";
    elementReferences.supplyCategorySelect.value = "Outros";
    elementReferences.unitLabelInput.value = "unidade";
    elementReferences.stockModeSelect.value = "fractional";
    updateSupplyCategoryFields();
    updateSupplyMeasurementFields();
    updateSupplyUnitCostPreview();
    openModal(elementReferences.supplyModal);
    elementReferences.supplyNameInput.focus();
  }

  function openInventoryEditModal(inventoryItemId, shouldFocusCurrentStock = false) {
    const inventoryItem = findInventoryItemById(inventoryItemId);

    if (!inventoryItem) {
      return;
    }

    editingInventoryItemId = inventoryItem.id;
    shouldSyncCurrentStockWithPackageQuantity = false;
    clearSupplyFormValidation();
    elementReferences.supplyForm.reset();
    elementReferences.supplyModalKicker.textContent = "Gestão de estoque";
    elementReferences.supplyModalTitle.textContent = "Editar insumo";
    elementReferences.saveSupplyButton.textContent = "Salvar alterações";
    elementReferences.supplyCategorySelect.value = inventoryItem.category;
    elementReferences.unitLabelInput.value = normalizeUnitMeasure(inventoryItem.unitLabel);
    elementReferences.stockModeSelect.value = "fractional";
    elementReferences.supplyNameInput.value = inventoryItem.name;
    elementReferences.cartridgeBrandInput.value = inventoryItem.brand || "";
    elementReferences.cartridgeSpecificationInput.value = inventoryItem.specification || "";
    elementReferences.packageQuantityInput.value = formatEditableNumber(inventoryItem.packageQuantity);
    elementReferences.currentStockInput.value = formatEditableNumber(inventoryItem.currentStock);
    elementReferences.packagePriceInput.value = formatEditableNumber(inventoryItem.packagePrice);
    updateSupplyCategoryFields();
    updateSupplyMeasurementFields();
    updateSupplyUnitCostPreview();
    openModal(elementReferences.supplyModal);

    if (shouldFocusCurrentStock) {
      elementReferences.currentStockInput.focus();
      elementReferences.currentStockInput.select();
      return;
    }

    elementReferences.supplyNameInput.focus();
    elementReferences.supplyNameInput.select();
  }

  function openStockAdjustmentModal(inventoryItemId) {
    const inventoryItem = findInventoryItemById(inventoryItemId);

    if (!inventoryItem) {
      return;
    }

    adjustingInventoryItemId = inventoryItem.id;
    elementReferences.stockAdjustmentForm.reset();
    elementReferences.stockDecreaseQuantityInput.setCustomValidity("");
    updateStockAdjustmentPreview();
    openModal(elementReferences.stockAdjustmentModal);
    elementReferences.stockDecreaseQuantityInput.focus();
  }

  function updateStockAdjustmentPreview() {
    const inventoryItem = findInventoryItemById(adjustingInventoryItemId);

    if (!inventoryItem) {
      return;
    }

    const reservedStock = getTotalUsedQuantity(inventoryItem.id);
    const decreaseQuantity = normalizeNumber(elementReferences.stockDecreaseQuantityInput.value);
    const projectedStock = Math.max(reservedStock, normalizeNumber(inventoryItem.currentStock) - decreaseQuantity);
    const maximumDecrease = getMaximumStockDecrease(inventoryItem.id);
    const stockTextSuffix = ` ${getUnitMeasureLabel(inventoryItem.unitLabel)}`;

    elementReferences.stockAdjustmentCurrentValue.textContent = `${formatNumber(inventoryItem.currentStock)}${stockTextSuffix}`;
    elementReferences.stockAdjustmentReservedValue.textContent = `${formatNumber(reservedStock)}${stockTextSuffix}`;
    elementReferences.stockAdjustmentProjectedValue.textContent = `${formatNumber(projectedStock)}${stockTextSuffix}`;
    elementReferences.stockAdjustmentHelperText.textContent = `Máximo para baixa agora: ${formatNumber(maximumDecrease)} ${getUnitMeasureLabel(inventoryItem.unitLabel)}.`;
  }

  function applyStockDecreaseFromForm() {
    const inventoryItem = findInventoryItemById(adjustingInventoryItemId);

    if (!inventoryItem) {
      return;
    }

    const decreaseQuantity = normalizeNumber(elementReferences.stockDecreaseQuantityInput.value);
    const maximumDecrease = getMaximumStockDecrease(inventoryItem.id);
    elementReferences.stockDecreaseQuantityInput.setCustomValidity("");

    if (decreaseQuantity <= 0) {
      elementReferences.stockDecreaseQuantityInput.setCustomValidity("Informe uma quantidade maior que zero.");
    }

    if (decreaseQuantity > maximumDecrease) {
      elementReferences.stockDecreaseQuantityInput.setCustomValidity(`Você pode diminuir no máximo ${formatNumber(maximumDecrease)} ${getUnitMeasureLabel(inventoryItem.unitLabel)}.`);
    }

    if (decreaseQuantity <= 0 || decreaseQuantity > maximumDecrease) {
      elementReferences.stockAdjustmentForm.reportValidity();
      return;
    }

    updateInventoryItem({
      ...inventoryItem,
      currentStock: normalizeNumber(inventoryItem.currentStock) - decreaseQuantity,
      updatedAt: new Date().toISOString()
    });

    adjustingInventoryItemId = null;
    closeModal(elementReferences.stockAdjustmentModal);
    persistApplicationState();
    renderApplication();
  }

  function openCsvImportModal() {
    closeDrawer();
    elementReferences.csvImportForm.reset();
    setCsvImportProgress("Aguardando arquivo CSV");
    elementReferences.processCsvButton.disabled = false;
    openModal(elementReferences.csvImportModal);
  }

  function openProjectCreationModal() {
    elementReferences.projectCreationForm.reset();
    elementReferences.newProjectNameInput.value = `Projeto ${applicationState.projects.length + 1}`;
    openModal(elementReferences.projectModal);
    elementReferences.newProjectNameInput.select();
  }

  function openProjectItemSheet() {
    projectItemSheetSearchTerm = "";
    elementReferences.projectItemSheetSearchInput.value = "";
    renderProjectItemSheet();
    openModal(elementReferences.projectItemSheet);
    elementReferences.projectItemSheetSearchInput.focus();
  }

  function openModal(modalElement) {
    if (typeof modalElement.showModal === "function") {
      modalElement.showModal();
      return;
    }

    modalElement.setAttribute("open", "");
  }

  function closeModal(modalElement) {
    if (typeof modalElement.close === "function" && modalElement.open) {
      modalElement.close();
      return;
    }

    modalElement.removeAttribute("open");
  }

  function openDrawer() {
    elementReferences.drawerMenu.classList.add("is-open");
    elementReferences.drawerMenu.setAttribute("aria-hidden", "false");
    elementReferences.drawerBackdrop.hidden = false;
  }

  function closeDrawer() {
    elementReferences.drawerMenu.classList.remove("is-open");
    elementReferences.drawerMenu.setAttribute("aria-hidden", "true");
    elementReferences.drawerBackdrop.hidden = true;
  }

  function updateSupplyCategoryFields() {
    const isCartridgeCategory = elementReferences.supplyCategorySelect.value === CARTRIDGE_CATEGORY_NAME;

    elementReferences.cartridgeExtraFields.hidden = !isCartridgeCategory;
    elementReferences.cartridgeBrandInput.required = isCartridgeCategory;
    elementReferences.cartridgeSpecificationInput.required = isCartridgeCategory;

    if (isCartridgeCategory && !elementReferences.supplyNameInput.value.trim()) {
      elementReferences.supplyNameInput.value = "Cartucho";
    }
  }

  function updateSupplyMeasurementFields() {
    const unitMeasureLabel = getUnitMeasureLabel(elementReferences.unitLabelInput.value);
    const isSealedPackageStock = elementReferences.stockModeSelect.value === "sealedPackages";

    elementReferences.packageQuantityLabel.textContent = `Quantidade da embalagem fechada (${unitMeasureLabel})`;
    elementReferences.currentStockLabel.textContent = isSealedPackageStock
      ? "Embalagens fechadas em estoque"
      : `Estoque atual (${unitMeasureLabel})`;
    elementReferences.currentStockInput.placeholder = isSealedPackageStock ? "2" : "50";
    updateSupplyUnitCostPreview();
  }

  function clearSupplyFormValidation() {
    elementReferences.packageQuantityInput.setCustomValidity("");
    elementReferences.currentStockInput.setCustomValidity("");
  }

  function updateSupplyUnitCostPreview() {
    const unitCost = calculateUnitCost({
      packageQuantity: elementReferences.packageQuantityInput.value,
      packagePrice: elementReferences.packagePriceInput.value
    });

    elementReferences.supplyUnitCostPreview.textContent = formatCurrency(unitCost);
    elementReferences.supplyUnitCostDetail.textContent = `${formatCurrency(normalizeNumber(elementReferences.packagePriceInput.value))} / ${formatNumber(normalizeNumber(elementReferences.packageQuantityInput.value))} ${getUnitMeasureLabel(elementReferences.unitLabelInput.value)}`;
  }

  function syncCurrentStockWithPackageQuantity() {
    if (!shouldSyncCurrentStockWithPackageQuantity) {
      return;
    }

    elementReferences.currentStockInput.value = elementReferences.packageQuantityInput.value;
  }

  function saveInventoryItemFromForm() {
    const itemName = elementReferences.supplyNameInput.value.trim();
    const itemCategory = normalizeInventoryCategory(elementReferences.supplyCategorySelect.value);
    const packageQuantity = normalizeNumber(elementReferences.packageQuantityInput.value);
    const stockMode = elementReferences.stockModeSelect.value;
    const defaultCurrentStock = stockMode === "sealedPackages" ? 1 : packageQuantity;
    const rawCurrentStock = elementReferences.currentStockInput.value.trim()
      ? normalizeNumber(elementReferences.currentStockInput.value)
      : defaultCurrentStock;
    const unitLabel = normalizeUnitMeasure(elementReferences.unitLabelInput.value);
    const currentStock = stockMode === "sealedPackages"
      ? rawCurrentStock * packageQuantity
      : rawCurrentStock;
    const packagePrice = normalizeNumber(elementReferences.packagePriceInput.value);
    const reservedStock = editingInventoryItemId ? getTotalUsedQuantity(editingInventoryItemId) : 0;

    clearSupplyFormValidation();

    if (packageQuantity <= 0) {
      elementReferences.packageQuantityInput.setCustomValidity("Informe uma quantidade maior que zero.");
    }

    if (currentStock < 0) {
      elementReferences.currentStockInput.setCustomValidity("O estoque atual não pode ser negativo.");
    }

    if (currentStock < reservedStock) {
      elementReferences.currentStockInput.setCustomValidity(`Este item já está usado em projetos: mínimo ${formatNumber(reservedStock)}.`);
    }

    if (!itemName || !unitLabel || packageQuantity <= 0 || currentStock < 0 || currentStock < reservedStock) {
      elementReferences.supplyForm.reportValidity();
      return;
    }

    const existingInventoryItem = editingInventoryItemId ? findInventoryItemById(editingInventoryItemId) : null;
    const savedInventoryItem = {
      id: existingInventoryItem ? existingInventoryItem.id : createEntityId("inventory"),
      name: itemName,
      category: itemCategory,
      packageQuantity,
      unitLabel,
      packagePrice,
      currentStock,
      stockMode,
      brand: itemCategory === CARTRIDGE_CATEGORY_NAME ? elementReferences.cartridgeBrandInput.value.trim() : "",
      specification: itemCategory === CARTRIDGE_CATEGORY_NAME ? elementReferences.cartridgeSpecificationInput.value.trim() : "",
      createdAt: existingInventoryItem ? existingInventoryItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingInventoryItem) {
      updateInventoryItem(savedInventoryItem);
    } else {
      addInventoryItems([savedInventoryItem]);
    }

    elementReferences.supplyForm.reset();
    editingInventoryItemId = null;
    closeModal(elementReferences.supplyModal);
    applicationState.activeScreen = "inventory";
    persistApplicationState();
    renderApplication();
  }

  function updateInventoryItem(updatedInventoryItem) {
    applicationState.inventoryData = applicationState.inventoryData.map((inventoryItem) => {
      if (inventoryItem.id !== updatedInventoryItem.id) {
        return inventoryItem;
      }

      return updatedInventoryItem;
    });
  }

  function deleteInventoryItem(inventoryItemId) {
    const inventoryItem = findInventoryItemById(inventoryItemId);

    if (!inventoryItem) {
      return;
    }

    const usedQuantity = getTotalUsedQuantity(inventoryItemId);
    const confirmationMessage = usedQuantity > 0
      ? `Excluir "${getInventoryDisplayName(inventoryItem)}"? Ele está usado em projetos e será removido desses orçamentos.`
      : `Excluir "${getInventoryDisplayName(inventoryItem)}" do estoque?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    applicationState.inventoryData = applicationState.inventoryData.filter((item) => item.id !== inventoryItemId);
    applicationState.projects = applicationState.projects.map((projectData) => {
      const materialUsage = { ...projectData.materialUsage };
      delete materialUsage[inventoryItemId];

      return {
        ...projectData,
        materialUsage
      };
    });

    persistApplicationState();
    renderApplication();
  }

  function addInventoryItems(inventoryItems) {
    applicationState.inventoryData = [...inventoryItems, ...applicationState.inventoryData];
    applicationState.projects = applicationState.projects.map((projectData) => {
      const materialUsage = { ...projectData.materialUsage };

      inventoryItems.forEach((inventoryItem) => {
        materialUsage[inventoryItem.id] = 0;
      });

      return {
        ...projectData,
        materialUsage
      };
    });

    persistApplicationState();
    renderApplication();
  }

  function createNewProjectFromForm() {
    const suggestedProjectName = `Projeto ${applicationState.projects.length + 1}`;
    const projectName = elementReferences.newProjectNameInput.value.trim() || suggestedProjectName;
    const newProject = createProject(projectName, applicationState.inventoryData);

    applicationState.projects.unshift(newProject);
    applicationState.activeProjectId = newProject.id;
    applicationState.activeScreen = "projects";
    persistApplicationState();
    renderApplication();
    closeModal(elementReferences.projectModal);
    elementReferences.projectNameInput.focus();
  }

  function updateActiveProject(mutator) {
    const activeProject = getActiveProject();
    mutator(activeProject);
  }

  function updateProjectField(fieldName, value) {
    updateActiveProject((projectData) => {
      projectData[fieldName] = value;
    });
    persistApplicationState();
    renderProjectOptions();
    renderDashboard();
    renderHomeDashboard();
  }

  function updateLaborField(fieldName, value) {
    updateActiveProject((projectData) => {
      projectData[fieldName] = normalizeNumber(value);
    });
    persistApplicationState();
    renderDashboard();
    renderHomeDashboard();
    elementReferences.laborPreviewValue.textContent = formatCurrency(getActiveProjectSummary().laborTotal);
  }

  function setProjectItemQuantity(inventoryItemId, value) {
    const quantityUsed = normalizeNumber(value);
    const allowedQuantity = Math.min(quantityUsed, getMaximumQuantityForActiveProject(inventoryItemId));

    updateActiveProject((projectData) => {
      projectData.materialUsage[inventoryItemId] = allowedQuantity;
    });

    persistApplicationState();
    renderApplication();
  }

  function removeProjectItem(inventoryItemId) {
    setProjectItemQuantity(inventoryItemId, 0);
  }

  function clearActiveProjectItems() {
    updateActiveProject((projectData) => {
      projectData.materialUsage = createEmptyMaterialUsage(applicationState.inventoryData);
    });
    persistApplicationState();
    renderApplication();
  }

  function changeActiveProject(projectId) {
    applicationState.activeProjectId = projectId;
    persistApplicationState();
    renderApplication();
  }

  async function resetApplication() {
    const shouldReset = window.confirm("Restaurar dados iniciais e apagar dados salvos neste navegador?");

    if (!shouldReset) {
      return;
    }

    applicationState = normalizeApplicationState(await stateRepository.resetState());
    activeInventoryCategory = ALL_CATEGORIES_FILTER;
    inventorySearchTerm = "";
    projectItemSheetSearchTerm = "";
    elementReferences.inventorySearchInput.value = "";
    elementReferences.projectItemSheetSearchInput.value = "";
    closeDrawer();
    renderApplication();
  }

  function handleCsvImportFormSubmit(event) {
    event.preventDefault();

    const selectedFile = elementReferences.csvFileInput.files[0];
    elementReferences.csvFileInput.setCustomValidity("");

    if (!selectedFile) {
      elementReferences.csvFileInput.setCustomValidity("Selecione um arquivo CSV.");
      elementReferences.csvImportForm.reportValidity();
      return;
    }

    elementReferences.processCsvButton.disabled = true;
    setCsvImportProgress("Lendo arquivo CSV");
    readCsvFile(selectedFile);
  }

  function readCsvFile(selectedFile) {
    const fileReader = new FileReader();

    fileReader.onerror = () => {
      elementReferences.processCsvButton.disabled = false;
      setCsvImportProgress("Não foi possível ler o arquivo CSV");
    };

    fileReader.onload = () => {
      const csvText = String(fileReader.result || "");
      const csvRows = parseCsvText(csvText);
      const importPlan = createCsvImportPlan(csvRows);
      processCsvRowsInBatches(importPlan);
    };

    fileReader.readAsText(selectedFile, "utf-8");
  }

  function createCsvImportPlan(csvRows) {
    const nonEmptyRows = csvRows.filter((csvRow) => csvRow.some((cellValue) => String(cellValue).trim()));
    const firstRow = nonEmptyRows[0] || [];
    const headerColumnIndexes = createCsvHeaderColumnIndexes(firstRow);
    const hasHeader = Object.values(headerColumnIndexes).some((columnIndex) => columnIndex > -1);

    return {
      columnIndexes: hasHeader ? headerColumnIndexes : DEFAULT_CSV_COLUMN_INDEXES,
      dataRows: hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows
    };
  }

  function createCsvHeaderColumnIndexes(headerRow) {
    const normalizedHeaders = headerRow.map(normalizeCsvHeaderName);

    return Object.keys(CSV_HEADER_ALIASES).reduce((columnIndexes, fieldName) => {
      columnIndexes[fieldName] = normalizedHeaders.findIndex((headerName) => {
        return CSV_HEADER_ALIASES[fieldName].includes(headerName);
      });
      return columnIndexes;
    }, {});
  }

  function normalizeCsvHeaderName(headerName) {
    return normalizeTextForSearch(headerName).replace(/[^a-z0-9]/g, "");
  }

  function processCsvRowsInBatches(importPlan) {
    const importedInventoryItems = [];
    const totalItemCount = importPlan.dataRows.length;
    let processedItemCount = 0;

    setCsvImportProgress(`Carregando itens: 0 | ${totalItemCount}`);

    if (totalItemCount === 0) {
      elementReferences.processCsvButton.disabled = false;
      setCsvImportProgress("Nenhum item encontrado: 0 | 0");
      return;
    }

    function processNextBatch() {
      const nextBatchLimit = Math.min(processedItemCount + CSV_PROCESS_BATCH_SIZE, totalItemCount);

      while (processedItemCount < nextBatchLimit) {
        const inventoryItem = createInventoryItemFromCsvRow(importPlan.dataRows[processedItemCount], importPlan.columnIndexes);

        if (inventoryItem) {
          importedInventoryItems.push(inventoryItem);
        }

        processedItemCount += 1;
      }

      setCsvImportProgress(`Carregando itens: ${processedItemCount} | ${totalItemCount}`);

      if (processedItemCount < totalItemCount) {
        window.requestAnimationFrame(processNextBatch);
        return;
      }

      finishCsvImport(importedInventoryItems, totalItemCount);
    }

    window.requestAnimationFrame(processNextBatch);
  }

  function createInventoryItemFromCsvRow(csvRow, columnIndexes) {
    const itemName = getCsvColumnValue(csvRow, columnIndexes.name).trim();
    const itemCategory = normalizeInventoryCategory(getCsvColumnValue(csvRow, columnIndexes.category).trim() || inferInventoryCategory(itemName));
    const packageQuantity = normalizeNumber(getCsvColumnValue(csvRow, columnIndexes.packageQuantity));
    const packagePrice = normalizeNumber(getCsvColumnValue(csvRow, columnIndexes.packagePrice));
    const currentStock = normalizeNumber(getCsvColumnValue(csvRow, columnIndexes.currentStock)) || packageQuantity;
    const unitLabel = normalizeUnitMeasure(getCsvColumnValue(csvRow, columnIndexes.unitLabel).trim() || "unidade");

    if (!itemName || packageQuantity <= 0) {
      return null;
    }

    return {
      id: createEntityId("inventory"),
      name: itemName,
      category: itemCategory,
      packageQuantity,
      unitLabel,
      packagePrice,
      currentStock,
      stockMode: "fractional",
      brand: itemCategory === CARTRIDGE_CATEGORY_NAME ? getCsvColumnValue(csvRow, columnIndexes.brand).trim() : "",
      specification: itemCategory === CARTRIDGE_CATEGORY_NAME ? getCsvColumnValue(csvRow, columnIndexes.specification).trim() : "",
      createdAt: new Date().toISOString()
    };
  }

  function getCsvColumnValue(csvRow, columnIndex) {
    if (columnIndex == null || columnIndex < 0 || columnIndex >= csvRow.length) {
      return "";
    }

    return String(csvRow[columnIndex] || "");
  }

  function finishCsvImport(importedInventoryItems, totalItemCount) {
    elementReferences.processCsvButton.disabled = false;

    if (importedInventoryItems.length === 0) {
      setCsvImportProgress(`Nenhum item válido encontrado: 0 | ${totalItemCount}`);
      return;
    }

    addInventoryItems(importedInventoryItems);
    setCsvImportProgress(`Importação concluída: ${importedInventoryItems.length} | ${totalItemCount}`);
  }

  function setCsvImportProgress(message) {
    elementReferences.csvImportProgress.textContent = message;
  }

  function detectCsvDelimiter(csvText) {
    const firstContentLine = csvText.split(/\r?\n/).find((line) => line.trim()) || "";
    const semicolonCount = (firstContentLine.match(/;/g) || []).length;
    const commaCount = (firstContentLine.match(/,/g) || []).length;

    return semicolonCount >= commaCount ? ";" : ",";
  }

  function parseCsvText(csvText) {
    const delimiter = detectCsvDelimiter(csvText);
    const csvRows = [];
    let currentRow = [];
    let currentValue = "";
    let isInsideQuotes = false;

    for (let characterIndex = 0; characterIndex < csvText.length; characterIndex += 1) {
      const currentCharacter = csvText[characterIndex];
      const nextCharacter = csvText[characterIndex + 1];

      if (currentCharacter === "\"") {
        if (isInsideQuotes && nextCharacter === "\"") {
          currentValue += "\"";
          characterIndex += 1;
        } else {
          isInsideQuotes = !isInsideQuotes;
        }
        continue;
      }

      if (currentCharacter === delimiter && !isInsideQuotes) {
        currentRow.push(currentValue.trim());
        currentValue = "";
        continue;
      }

      if ((currentCharacter === "\n" || currentCharacter === "\r") && !isInsideQuotes) {
        if (currentCharacter === "\r" && nextCharacter === "\n") {
          characterIndex += 1;
        }

        currentRow.push(currentValue.trim());
        csvRows.push(currentRow);
        currentRow = [];
        currentValue = "";
        continue;
      }

      currentValue += currentCharacter;
    }

    if (currentValue || currentRow.length > 0) {
      currentRow.push(currentValue.trim());
      csvRows.push(currentRow);
    }

    return csvRows;
  }

  function normalizeInventoryCategory(categoryName) {
    const normalizedCategoryName = normalizeCsvHeaderName(categoryName);

    if (["agulhas", "cartuchosagulhas", "cartucho", "cartuchos", "needle", "needles"].includes(normalizedCategoryName)) {
      return "Cartuchos";
    }

    if (["biosseguranca", "higiene", "protecao", "seguranca"].includes(normalizedCategoryName)) {
      return "Biossegurança";
    }

    if (["tintas", "tinta", "pigmentos", "pigmento"].includes(normalizedCategoryName)) {
      return "Tintas";
    }

    if (["descartaveis", "descartavel", "consumiveis", "consumivel"].includes(normalizedCategoryName)) {
      return "Descartáveis";
    }

    if (INVENTORY_CATEGORY_OPTIONS.includes(categoryName)) {
      return categoryName;
    }

    return "Outros";
  }

  function inferInventoryCategory(itemName) {
    const normalizedItemName = normalizeTextForSearch(itemName);

    if (normalizedItemName.includes("agulha") || normalizedItemName.includes("cartucho") || normalizedItemName.includes("rl") || normalizedItemName.includes("rs") || normalizedItemName.includes("mag")) {
      return "Cartuchos";
    }

    if (normalizedItemName.includes("tinta") || normalizedItemName.includes("pigmento")) {
      return "Tintas";
    }

    if (normalizedItemName.includes("luva") || normalizedItemName.includes("mascara") || normalizedItemName.includes("sabonete") || normalizedItemName.includes("vaselina") || normalizedItemName.includes("lamina")) {
      return "Biossegurança";
    }

    if (normalizedItemName.includes("batoque") || normalizedItemName.includes("papel") || normalizedItemName.includes("plastico") || normalizedItemName.includes("palito") || normalizedItemName.includes("bandagem") || normalizedItemName.includes("stencil")) {
      return "Descartáveis";
    }

    return "Outros";
  }

  function getTotalUsedQuantity(inventoryItemId) {
    return applicationState.projects.reduce((total, projectData) => {
      return total + normalizeNumber(projectData.materialUsage[inventoryItemId]);
    }, 0);
  }

  function getUsedQuantityOutsideActiveProject(inventoryItemId) {
    const activeProject = getActiveProject();

    return applicationState.projects.reduce((total, projectData) => {
      if (projectData.id === activeProject.id) {
        return total;
      }

      return total + normalizeNumber(projectData.materialUsage[inventoryItemId]);
    }, 0);
  }

  function getMaximumQuantityForActiveProject(inventoryItemId) {
    const inventoryItem = applicationState.inventoryData.find((item) => item.id === inventoryItemId);

    if (!inventoryItem) {
      return 0;
    }

    return Math.max(0, normalizeNumber(inventoryItem.currentStock) - getUsedQuantityOutsideActiveProject(inventoryItemId));
  }

  function getAvailableStock(inventoryItemId) {
    const inventoryItem = applicationState.inventoryData.find((item) => item.id === inventoryItemId);

    if (!inventoryItem) {
      return 0;
    }

    return Math.max(0, normalizeNumber(inventoryItem.currentStock) - getTotalUsedQuantity(inventoryItemId));
  }

  function getMaximumStockDecrease(inventoryItemId) {
    const inventoryItem = findInventoryItemById(inventoryItemId);

    if (!inventoryItem) {
      return 0;
    }

    return Math.max(0, normalizeNumber(inventoryItem.currentStock) - getTotalUsedQuantity(inventoryItemId));
  }

  function downloadBackup() {
    closeDrawer();
    const serializedState = JSON.stringify(applicationState, null, 2);
    const backupBlob = new Blob([serializedState], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(backupBlob);
    const anchorElement = document.createElement("a");

    anchorElement.href = downloadUrl;
    anchorElement.download = `calculadora-tattoo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchorElement.click();
    URL.revokeObjectURL(downloadUrl);
  }

  function renderInvoiceDocument() {
    const activeProject = getActiveProject();
    const activeProjectSummary = getActiveProjectSummary();
    const projectName = activeProject.projectName || "Projeto de tatuagem";
    const clientName = activeProject.clientName || "Cliente não informado";
    const projectNotes = activeProject.projectNotes || "Sem observações.";
    const invoiceCode = createInvoiceCode(activeProject);

    const itemRows = activeProjectSummary.selectedItems.length > 0
      ? activeProjectSummary.selectedItems.map((projectItem) => `
          <tr>
            <td>${escapeHtml(getInventoryDisplayName(projectItem.inventoryItem))}</td>
            <td>${formatNumber(projectItem.quantityUsed)} ${escapeHtml(getUnitMeasureLabel(projectItem.inventoryItem.unitLabel))}</td>
            <td>${formatCurrency(projectItem.unitCost)}</td>
            <td>${formatCurrency(projectItem.materialCost)}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="4">Nenhum insumo selecionado.</td>
          </tr>
        `;

    elementReferences.invoiceDocument.innerHTML = `
      <article class="invoice-template">
        <header class="invoice-header">
          <div class="invoice-logo-space">Logo</div>
          <div>
            <span>Invoice</span>
            <h1>${escapeHtml(projectName)}</h1>
            <p>${escapeHtml(invoiceCode)}</p>
          </div>
        </header>

        <section class="invoice-project-grid">
          <div>
            <span>Cliente</span>
            <strong>${escapeHtml(clientName)}</strong>
          </div>
          <div>
            <span>Emitido em</span>
            <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>${formatCurrency(activeProjectSummary.totalCost)}</strong>
          </div>
        </section>

        <section class="invoice-section">
          <h2>Insumos calculados</h2>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Uso</th>
                <th>Custo unitário</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </section>

        <section class="invoice-total-panel">
          <dl>
            <div>
              <dt>Materiais</dt>
              <dd>${formatCurrency(activeProjectSummary.materialTotal)}</dd>
            </div>
            <div>
              <dt>Mão de obra</dt>
              <dd>${formatCurrency(activeProjectSummary.laborTotal)}</dd>
            </div>
            <div>
              <dt>Total geral</dt>
              <dd>${formatCurrency(activeProjectSummary.totalCost)}</dd>
            </div>
          </dl>
        </section>

        <section class="invoice-section">
          <h2>Observações</h2>
          <p>${escapeHtml(projectNotes)}</p>
        </section>
      </article>
    `;
  }

  function createInvoiceCode(projectData) {
    return `INV-${String(projectData.createdAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "")}-${projectData.id.slice(-5).toUpperCase()}`;
  }

  async function downloadProjectPdf() {
    renderInvoiceDocument();

    const JsPdfConstructor = await getJsPdfConstructor();

    if (!JsPdfConstructor) {
      window.alert("Não foi possível carregar o gerador de PDF. Verifique a conexão e tente novamente.");
      return;
    }

    const activeProject = getActiveProject();
    const activeProjectSummary = getActiveProjectSummary();
    const pdfDocument = new JsPdfConstructor({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    drawInvoicePdf(pdfDocument, activeProject, activeProjectSummary);
    pdfDocument.save(`${createInvoiceCode(activeProject)}.pdf`);
  }

  async function getJsPdfConstructor() {
    if (window.jspdf && typeof window.jspdf.jsPDF === "function") {
      return window.jspdf.jsPDF;
    }

    try {
      await loadExternalScript(JSPDF_CDN_URL);
    } catch {
      return null;
    }

    return window.jspdf && typeof window.jspdf.jsPDF === "function" ? window.jspdf.jsPDF : null;
  }

  function loadExternalScript(scriptUrl) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

      if (existingScript && window.jspdf) {
        resolve();
        return;
      }

      if (existingScript) {
        existingScript.remove();
      }

      const scriptElement = document.createElement("script");
      scriptElement.src = scriptUrl;
      scriptElement.async = true;
      scriptElement.crossOrigin = "anonymous";
      scriptElement.referrerPolicy = "no-referrer";
      scriptElement.addEventListener("load", resolve, { once: true });
      scriptElement.addEventListener("error", reject, { once: true });
      document.head.appendChild(scriptElement);
    });
  }

  function drawInvoicePdf(pdfDocument, activeProject, activeProjectSummary) {
    const pageWidth = pdfDocument.internal.pageSize.getWidth();
    const pageHeight = pdfDocument.internal.pageSize.getHeight();
    const margin = 44;
    let currentY = 48;

    pdfDocument.setFillColor(...PDF_COLORS.PURPLE_DARK);
    pdfDocument.rect(0, 0, pageWidth, 128, "F");
    pdfDocument.setFillColor(...PDF_COLORS.WHITE);
    pdfDocument.roundedRect(margin, 38, 72, 58, 8, 8, "F");
    pdfDocument.setTextColor(...PDF_COLORS.PURPLE_DARK);
    pdfDocument.setFont("helvetica", "bold");
    pdfDocument.setFontSize(14);
    pdfDocument.text("LOGO", margin + 17, 72);

    pdfDocument.setTextColor(...PDF_COLORS.WHITE);
    pdfDocument.setFontSize(10);
    pdfDocument.text("CALCULADORA TATTOO", margin + 92, 54);
    pdfDocument.setFontSize(24);
    pdfDocument.text("Invoice", margin + 92, 82);
    pdfDocument.setFont("helvetica", "normal");
    pdfDocument.setFontSize(10);
    pdfDocument.text(createInvoiceCode(activeProject), margin + 92, 101);

    currentY = 164;
    pdfDocument.setTextColor(...PDF_COLORS.BLACK);
    pdfDocument.setFont("helvetica", "bold");
    pdfDocument.setFontSize(18);
    pdfDocument.text(activeProject.projectName || "Projeto de tatuagem", margin, currentY);
    currentY += 20;

    pdfDocument.setFont("helvetica", "normal");
    pdfDocument.setFontSize(10);
    pdfDocument.text(`Cliente: ${activeProject.clientName || "Cliente não informado"}`, margin, currentY);
    pdfDocument.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - margin - 112, currentY);
    currentY += 36;

    currentY = drawPdfSummary(pdfDocument, activeProjectSummary, margin, currentY);
    currentY += 26;

    pdfDocument.setFont("helvetica", "bold");
    pdfDocument.setFontSize(12);
    pdfDocument.setTextColor(...PDF_COLORS.PURPLE);
    pdfDocument.text("Insumos calculados", margin, currentY);
    currentY += 18;
    currentY = drawPdfItems(pdfDocument, activeProjectSummary, margin, currentY, pageWidth, pageHeight);
    currentY += 24;

    pdfDocument.setFont("helvetica", "bold");
    pdfDocument.setTextColor(...PDF_COLORS.PURPLE);
    pdfDocument.text("Observações", margin, currentY);
    currentY += 16;
    pdfDocument.setFont("helvetica", "normal");
    pdfDocument.setTextColor(...PDF_COLORS.BLACK);
    pdfDocument.text(pdfDocument.splitTextToSize(activeProject.projectNotes || "Sem observações.", pageWidth - margin * 2), margin, currentY);
  }

  function drawPdfSummary(pdfDocument, activeProjectSummary, margin, startY) {
    const summaryItems = [
      ["Materiais", formatCurrency(activeProjectSummary.materialTotal)],
      ["Mão de obra", formatCurrency(activeProjectSummary.laborTotal)],
      ["Total", formatCurrency(activeProjectSummary.totalCost)]
    ];
    const cardWidth = 156;

    summaryItems.forEach((summaryItem, itemIndex) => {
      const xPosition = margin + itemIndex * (cardWidth + 18);
      pdfDocument.setFillColor(...(itemIndex === 2 ? PDF_COLORS.PURPLE : PDF_COLORS.PURPLE_LIGHT));
      pdfDocument.roundedRect(xPosition, startY, cardWidth, 72, 8, 8, "F");
      pdfDocument.setTextColor(...(itemIndex === 2 ? PDF_COLORS.WHITE : PDF_COLORS.PURPLE_DARK));
      pdfDocument.setFont("helvetica", "bold");
      pdfDocument.setFontSize(9);
      pdfDocument.text(summaryItem[0].toUpperCase(), xPosition + 14, startY + 24);
      pdfDocument.setFontSize(15);
      pdfDocument.text(summaryItem[1], xPosition + 14, startY + 50);
    });

    return startY + 72;
  }

  function drawPdfItems(pdfDocument, activeProjectSummary, margin, startY, pageWidth, pageHeight) {
    let currentY = startY;
    const tableWidth = pageWidth - margin * 2;
    const columns = [margin, margin + 220, margin + 312, margin + 420];

    pdfDocument.setFillColor(...PDF_COLORS.PURPLE_DARK);
    pdfDocument.rect(margin, currentY, tableWidth, 28, "F");
    pdfDocument.setTextColor(...PDF_COLORS.WHITE);
    pdfDocument.setFont("helvetica", "bold");
    pdfDocument.setFontSize(9);
    ["Insumo", "Uso", "Custo", "Subtotal"].forEach((heading, index) => {
      pdfDocument.text(heading, columns[index] + 8, currentY + 18);
    });
    currentY += 28;

    if (activeProjectSummary.selectedItems.length === 0) {
      pdfDocument.setTextColor(...PDF_COLORS.BLACK);
      pdfDocument.setFont("helvetica", "normal");
      pdfDocument.text("Nenhum insumo selecionado.", margin + 8, currentY + 20);
      return currentY + 34;
    }

    activeProjectSummary.selectedItems.forEach((projectItem) => {
      if (currentY > pageHeight - 96) {
        pdfDocument.addPage();
        currentY = 48;
      }

      const rowHeight = 34;
      const inventoryItem = projectItem.inventoryItem;
      pdfDocument.setFillColor(...PDF_COLORS.WHITE);
      pdfDocument.rect(margin, currentY, tableWidth, rowHeight, "F");
      pdfDocument.setDrawColor(...PDF_COLORS.PURPLE_LIGHT);
      pdfDocument.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
      pdfDocument.setTextColor(...PDF_COLORS.BLACK);
      pdfDocument.setFont("helvetica", "normal");
      pdfDocument.setFontSize(9);
      pdfDocument.text(pdfDocument.splitTextToSize(getInventoryDisplayName(inventoryItem), 190), columns[0] + 8, currentY + 14);
      pdfDocument.text(`${formatNumber(projectItem.quantityUsed)} ${getUnitMeasureLabel(inventoryItem.unitLabel)}`, columns[1] + 8, currentY + 20);
      pdfDocument.text(formatCurrency(projectItem.unitCost), columns[2] + 8, currentY + 20);
      pdfDocument.setFont("helvetica", "bold");
      pdfDocument.text(formatCurrency(projectItem.materialCost), columns[3] + 8, currentY + 20);
      currentY += rowHeight;
    });

    return currentY;
  }

  function bindEventListeners() {
    elementReferences.openDrawerButton.addEventListener("click", openDrawer);
    elementReferences.closeDrawerButton.addEventListener("click", closeDrawer);
    elementReferences.drawerBackdrop.addEventListener("click", closeDrawer);
    elementReferences.openCsvImportModalButton.addEventListener("click", openCsvImportModal);
    elementReferences.openCsvImportBottomButton.addEventListener("click", openCsvImportModal);
    elementReferences.downloadBackupButton.addEventListener("click", downloadBackup);
    elementReferences.downloadBackupBottomButton.addEventListener("click", downloadBackup);

    elementReferences.navigationButtons.forEach((navigationButton) => {
      navigationButton.addEventListener("click", () => {
        setActiveScreen(navigationButton.dataset.screenTarget);
      });
    });

    document.querySelectorAll("[data-screen-shortcut]").forEach((shortcutButton) => {
      shortcutButton.addEventListener("click", () => {
        setActiveScreen(shortcutButton.dataset.screenShortcut);
        closeDrawer();
      });
    });

    document.querySelector("[data-open-entry-shortcut]").addEventListener("click", openSupplyModal);

    elementReferences.cancelSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.closeSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.cancelProjectModalButton.addEventListener("click", () => closeModal(elementReferences.projectModal));
    elementReferences.cancelStockAdjustmentModalButton.addEventListener("click", () => closeModal(elementReferences.stockAdjustmentModal));
    elementReferences.closeProjectModalButton.addEventListener("click", () => closeModal(elementReferences.projectModal));
    elementReferences.closeStockAdjustmentModalButton.addEventListener("click", () => closeModal(elementReferences.stockAdjustmentModal));
    elementReferences.cancelCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));
    elementReferences.closeCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));
    elementReferences.closeProjectItemSheetButton.addEventListener("click", () => closeModal(elementReferences.projectItemSheet));

    elementReferences.floatingActionButton.addEventListener("click", openSupplyModal);
    elementReferences.supplyCategorySelect.addEventListener("change", updateSupplyCategoryFields);
    elementReferences.unitLabelInput.addEventListener("change", updateSupplyMeasurementFields);
    elementReferences.stockModeSelect.addEventListener("change", () => {
      shouldSyncCurrentStockWithPackageQuantity = elementReferences.stockModeSelect.value === "fractional";
      if (!editingInventoryItemId && elementReferences.stockModeSelect.value === "sealedPackages") {
        elementReferences.currentStockInput.value = "1";
      }
      updateSupplyMeasurementFields();
      syncCurrentStockWithPackageQuantity();
    });
    elementReferences.packageQuantityInput.addEventListener("input", () => {
      updateSupplyUnitCostPreview();
      syncCurrentStockWithPackageQuantity();
    });
    elementReferences.packagePriceInput.addEventListener("input", updateSupplyUnitCostPreview);
    elementReferences.currentStockInput.addEventListener("input", () => {
      shouldSyncCurrentStockWithPackageQuantity = false;
    });
    elementReferences.supplyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveInventoryItemFromForm();
    });
    elementReferences.stockDecreaseQuantityInput.addEventListener("input", updateStockAdjustmentPreview);
    elementReferences.stockAdjustmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyStockDecreaseFromForm();
    });

    elementReferences.csvImportForm.addEventListener("submit", handleCsvImportFormSubmit);
    elementReferences.createProjectButton.addEventListener("click", openProjectCreationModal);
    elementReferences.projectCreationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      createNewProjectFromForm();
    });

    elementReferences.projectSelect.addEventListener("change", (event) => {
      changeActiveProject(event.target.value);
    });

    elementReferences.projectForm.addEventListener("input", (event) => {
      updateProjectField(event.target.name, event.target.value);
    });

    elementReferences.laborHoursInput.addEventListener("input", (event) => {
      updateLaborField("laborHours", event.target.value);
    });

    elementReferences.hourlyRateInput.addEventListener("input", (event) => {
      updateLaborField("hourlyRate", event.target.value);
    });

    elementReferences.downloadProjectPdfButton.addEventListener("click", downloadProjectPdf);
    elementReferences.clearProjectButton.addEventListener("click", clearActiveProjectItems);
    elementReferences.openProjectItemSheetButton.addEventListener("click", openProjectItemSheet);

    elementReferences.inventorySearchInput.addEventListener("input", (event) => {
      inventorySearchTerm = event.target.value;
      renderInventoryList();
    });

    elementReferences.inventoryCategoryFilterList.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-inventory-category-filter]");

      if (!filterButton) {
        return;
      }

      activeInventoryCategory = filterButton.dataset.inventoryCategoryFilter;
      renderInventoryCategoryFilters();
      renderInventoryList();
    });

    elementReferences.inventoryList.addEventListener("click", (event) => {
      const inventoryCard = event.target.closest("[data-inventory-item-id]");

      if (!inventoryCard) {
        return;
      }

      if (event.target.closest("[data-edit-inventory-item]")) {
        openInventoryEditModal(inventoryCard.dataset.inventoryItemId);
        return;
      }

      if (event.target.closest("[data-decrease-inventory-stock]")) {
        openStockAdjustmentModal(inventoryCard.dataset.inventoryItemId);
        return;
      }

      if (event.target.closest("[data-delete-inventory-item]")) {
        deleteInventoryItem(inventoryCard.dataset.inventoryItemId);
      }
    });

    elementReferences.projectItemList.addEventListener("input", (event) => {
      if (!event.target.matches("[data-material-usage]")) {
        return;
      }

      const projectItem = event.target.closest("[data-project-item-id]");
      setProjectItemQuantity(projectItem.dataset.projectItemId, event.target.value);
    });

    elementReferences.projectItemList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-project-item]");

      if (!removeButton) {
        return;
      }

      const projectItem = removeButton.closest("[data-project-item-id]");
      removeProjectItem(projectItem.dataset.projectItemId);
    });

    elementReferences.projectItemSheetSearchInput.addEventListener("input", (event) => {
      projectItemSheetSearchTerm = event.target.value;
      renderProjectItemSheet();
    });

    elementReferences.projectItemSheetList.addEventListener("input", (event) => {
      if (!event.target.matches("[data-sheet-material-usage]")) {
        return;
      }

      const sheetItem = event.target.closest("[data-sheet-inventory-item-id]");
      setProjectItemQuantity(sheetItem.dataset.sheetInventoryItemId, event.target.value);
    });

    elementReferences.projectItemSheetList.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-sheet-select-item]");

      if (!addButton) {
        return;
      }

      const sheetItem = addButton.closest("[data-sheet-inventory-item-id]");
      const quantityInput = sheetItem.querySelector("[data-sheet-material-usage]");
      const quantityUsed = normalizeNumber(quantityInput.value) || 1;
      setProjectItemQuantity(sheetItem.dataset.sheetInventoryItemId, quantityUsed);
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
