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
  { name: "Cartucho White Head", category: "Cartuchos", packageQuantity: 20, unitLabel: "un", packagePrice: 300, currentStock: 20, brand: "White Head", specification: "RL0310" },
  { name: "Tinta preto linha", category: "Tintas", packageQuantity: 20, unitLabel: "ml", packagePrice: 50, currentStock: 20 },
  { name: "Tinta Raven Clow", category: "Tintas", packageQuantity: 20, unitLabel: "ml", packagePrice: 79, currentStock: 20 },
  { name: "Luvas", category: "Biossegurança", packageQuantity: 100, unitLabel: "un", packagePrice: 30, currentStock: 100 },
  { name: "Máscara", category: "Biossegurança", packageQuantity: 100, unitLabel: "un", packagePrice: 25, currentStock: 100 },
  { name: "Batoque", category: "Descartáveis", packageQuantity: 50, unitLabel: "un", packagePrice: 30, currentStock: 50 },
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
    elementReferences.cancelSupplyModalButton = document.querySelector("#cancelSupplyModalButton");
    elementReferences.cartridgeBrandInput = document.querySelector("#cartridgeBrandInput");
    elementReferences.cartridgeExtraFields = document.querySelector("#cartridgeExtraFields");
    elementReferences.cartridgeSpecificationInput = document.querySelector("#cartridgeSpecificationInput");
    elementReferences.clearProjectButton = document.querySelector("#clearProjectButton");
    elementReferences.closeCsvImportModalButton = document.querySelector("#closeCsvImportModalButton");
    elementReferences.closeDrawerButton = document.querySelector("#closeDrawerButton");
    elementReferences.closeProjectItemSheetButton = document.querySelector("#closeProjectItemSheetButton");
    elementReferences.closeProjectModalButton = document.querySelector("#closeProjectModalButton");
    elementReferences.closeSupplyModalButton = document.querySelector("#closeSupplyModalButton");
    elementReferences.createProjectButton = document.querySelector("#createProjectButton");
    elementReferences.currentStockInput = document.querySelector("#currentStockInput");
    elementReferences.csvFileInput = document.querySelector("#csvFileInput");
    elementReferences.csvImportForm = document.querySelector("#csvImportForm");
    elementReferences.csvImportModal = document.querySelector("#csvImportModal");
    elementReferences.csvImportProgress = document.querySelector("#csvImportProgress");
    elementReferences.downloadBackupButton = document.querySelector("#downloadBackupButton");
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
    elementReferences.laborHoursInput = document.querySelector("#laborHoursInput");
    elementReferences.laborPreviewValue = document.querySelector("#laborPreviewValue");
    elementReferences.navigationButtons = document.querySelectorAll("[data-screen-target]");
    elementReferences.newProjectNameInput = document.querySelector("#newProjectNameInput");
    elementReferences.openCsvImportModalButton = document.querySelector("#openCsvImportModalButton");
    elementReferences.openDrawerButton = document.querySelector("#openDrawerButton");
    elementReferences.openProjectItemSheetButton = document.querySelector("#openProjectItemSheetButton");
    elementReferences.openReportsButton = document.querySelector("#openReportsButton");
    elementReferences.openSettingsButton = document.querySelector("#openSettingsButton");
    elementReferences.packagePriceInput = document.querySelector("#packagePriceInput");
    elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
    elementReferences.printDocument = document.querySelector("#printDocument");
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
    elementReferences.resetApplicationButton = document.querySelector("#resetApplicationButton");
    elementReferences.saveSupplyButton = document.querySelector("#saveSupplyButton");
    elementReferences.supplyCategorySelect = document.querySelector("#supplyCategorySelect");
    elementReferences.supplyForm = document.querySelector("#supplyForm");
    elementReferences.supplyModalKicker = document.querySelector("#supplyModalKicker");
    elementReferences.supplyModalTitle = document.querySelector("#supplyModalTitle");
    elementReferences.supplyModal = document.querySelector("#supplyModal");
    elementReferences.supplyNameInput = document.querySelector("#supplyNameInput");
    elementReferences.supplyUnitCostPreview = document.querySelector("#supplyUnitCostPreview");
    elementReferences.unitLabelInput = document.querySelector("#unitLabelInput");
  }

  function createInitialState() {
    const inventoryData = BASE_INVENTORY_ITEMS.map((inventoryItem, inventoryIndex) => ({
      id: `base-inventory-${inventoryIndex + 1}`,
      name: inventoryItem.name,
      category: normalizeInventoryCategory(inventoryItem.category),
      packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
      unitLabel: inventoryItem.unitLabel || "un",
      packagePrice: normalizeNumber(inventoryItem.packagePrice),
      currentStock: normalizeNumber(inventoryItem.currentStock || inventoryItem.packageQuantity),
      brand: inventoryItem.brand || "",
      specification: inventoryItem.specification || "",
      createdAt: new Date().toISOString()
    }));
    const firstProject = createProject("Projeto 1", inventoryData);

    return {
      activeScreen: "home",
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
        unitLabel: String(inventoryItem.unitLabel || "un"),
        packagePrice: normalizeNumber(inventoryItem.packagePrice),
        currentStock: normalizeNumber(inventoryItem.currentStock == null ? packageQuantity : inventoryItem.currentStock),
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
      activeScreen: ["home", "inventory", "projects"].includes(rawState.activeScreen) ? rawState.activeScreen : "home",
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
        <span>Projetos</span>
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
    const isLowStock = availableStock <= 0;

    return `
      <article class="data-card inventory-card ${isLowStock ? "is-low-stock" : ""}" data-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h2>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h2>
            <span>${escapeHtml(getInventorySubtitle(inventoryItem))}</span>
          </div>
          <span class="pill">${formatCurrency(calculateUnitCost(inventoryItem))}/un</span>
        </div>

        <div class="stock-row">
          <div>
            <span>Disponível</span>
            <strong>${formatNumber(availableStock)} ${escapeHtml(inventoryItem.unitLabel)}</strong>
          </div>
          <div>
            <span>Reservado</span>
            <strong>${formatNumber(reservedStock)} ${escapeHtml(inventoryItem.unitLabel)}</strong>
          </div>
        </div>

        <div class="inventory-card-actions">
          <button class="button button-primary" type="button" data-edit-inventory-item>Editar</button>
          <button class="button button-quiet" type="button" data-decrease-inventory-stock>Diminuir</button>
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
    const packageText = `${formatNumber(inventoryItem.packageQuantity)} ${inventoryItem.unitLabel} por embalagem`;
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
      <article class="data-card project-item is-selected" data-project-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h3>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h3>
            <span>${escapeHtml(getInventorySubtitle(inventoryItem))}</span>
          </div>
          <span class="pill">${formatCurrency(projectItem.materialCost)}</span>
        </div>

        <div class="project-item-control">
          <label class="quantity-field">
            <span>Quantidade usada</span>
            <span class="quantity-input-row">
              <input type="text" inputmode="decimal" value="${escapeHtml(projectItem.quantityUsed)}" placeholder="0" data-material-usage />
              <span>${escapeHtml(inventoryItem.unitLabel)}</span>
            </span>
          </label>
          <button class="button button-danger" type="button" data-remove-project-item>Remover</button>
        </div>

        <div class="line-total">
          <span>${formatCurrency(projectItem.unitCost)} por unidade</span>
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

    return `
      <article class="sheet-item ${quantityUsed > 0 ? "is-selected" : ""}" data-sheet-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="sheet-item-main">
          <div class="card-title-group">
            <h4>${escapeHtml(getInventoryDisplayName(inventoryItem))}</h4>
            <span>Disponível: ${formatNumber(availableStock)} ${escapeHtml(inventoryItem.unitLabel)}</span>
          </div>
          <span class="pill">${formatCurrency(calculateUnitCost(inventoryItem))}/un</span>
        </div>

        <div class="sheet-item-control">
          <label class="quantity-field">
            <span>Usar</span>
            <span class="quantity-input-row">
              <input type="text" inputmode="decimal" value="${quantityUsed > 0 ? escapeHtml(quantityUsed) : ""}" placeholder="0" data-sheet-material-usage />
              <span>${escapeHtml(inventoryItem.unitLabel)}</span>
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
    updateSupplyCategoryFields();
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
    elementReferences.supplyNameInput.value = inventoryItem.name;
    elementReferences.cartridgeBrandInput.value = inventoryItem.brand || "";
    elementReferences.cartridgeSpecificationInput.value = inventoryItem.specification || "";
    elementReferences.packageQuantityInput.value = formatEditableNumber(inventoryItem.packageQuantity);
    elementReferences.currentStockInput.value = formatEditableNumber(inventoryItem.currentStock);
    elementReferences.unitLabelInput.value = inventoryItem.unitLabel;
    elementReferences.packagePriceInput.value = formatEditableNumber(inventoryItem.packagePrice);
    updateSupplyCategoryFields();
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
    const currentStock = elementReferences.currentStockInput.value.trim()
      ? normalizeNumber(elementReferences.currentStockInput.value)
      : packageQuantity;
    const unitLabel = elementReferences.unitLabelInput.value.trim();
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
    const unitLabel = getCsvColumnValue(csvRow, columnIndexes.unitLabel).trim() || "un";

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

  function showPlaceholderFeedback(label) {
    closeDrawer();
    window.alert(`${label} será conectado na próxima etapa.`);
  }

  function renderPrintDocument() {
    const activeProject = getActiveProject();
    const activeProjectSummary = getActiveProjectSummary();
    const projectName = activeProject.projectName || "Projeto de tatuagem";
    const clientName = activeProject.clientName || "Cliente não informado";
    const projectNotes = activeProject.projectNotes || "Sem observações.";

    const itemRows = activeProjectSummary.selectedItems.length > 0
      ? activeProjectSummary.selectedItems.map((projectItem) => `
          <tr>
            <td>${escapeHtml(getInventoryDisplayName(projectItem.inventoryItem))}</td>
            <td>${formatNumber(projectItem.quantityUsed)} ${escapeHtml(projectItem.inventoryItem.unitLabel)}</td>
            <td>${formatCurrency(projectItem.unitCost)}</td>
            <td>${formatCurrency(projectItem.materialCost)}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="4">Nenhum insumo selecionado.</td>
          </tr>
        `;

    elementReferences.printDocument.innerHTML = `
      <header class="print-header">
        <span>CalculadoraTattoo</span>
        <h1>${escapeHtml(projectName)}</h1>
        <p>${escapeHtml(clientName)}</p>
      </header>

      <section class="print-section">
        <h2>Resumo</h2>
        <dl class="print-summary">
          <div>
            <dt>Materiais</dt>
            <dd>${formatCurrency(activeProjectSummary.materialTotal)}</dd>
          </div>
          <div>
            <dt>Mão de obra</dt>
            <dd>${formatCurrency(activeProjectSummary.laborTotal)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>${formatCurrency(activeProjectSummary.totalCost)}</dd>
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
        <h2>Mão de obra</h2>
        <p>${formatNumber(activeProjectSummary.laborHours)} h x ${formatCurrency(activeProjectSummary.hourlyRate)} por hora = <strong>${formatCurrency(activeProjectSummary.laborTotal)}</strong></p>
      </section>

      <section class="print-section">
        <h2>Observações</h2>
        <p>${escapeHtml(projectNotes)}</p>
      </section>
    `;
  }

  function downloadProjectPdf() {
    renderPrintDocument();
    window.print();
  }

  function bindEventListeners() {
    elementReferences.openDrawerButton.addEventListener("click", openDrawer);
    elementReferences.closeDrawerButton.addEventListener("click", closeDrawer);
    elementReferences.drawerBackdrop.addEventListener("click", closeDrawer);
    elementReferences.openCsvImportModalButton.addEventListener("click", openCsvImportModal);
    elementReferences.openSettingsButton.addEventListener("click", () => showPlaceholderFeedback("Configurações"));
    elementReferences.openReportsButton.addEventListener("click", () => showPlaceholderFeedback("Relatórios"));
    elementReferences.downloadBackupButton.addEventListener("click", downloadBackup);
    elementReferences.resetApplicationButton.addEventListener("click", resetApplication);

    elementReferences.navigationButtons.forEach((navigationButton) => {
      navigationButton.addEventListener("click", () => {
        setActiveScreen(navigationButton.dataset.screenTarget);
      });
    });

    document.querySelectorAll("[data-screen-shortcut]").forEach((shortcutButton) => {
      shortcutButton.addEventListener("click", () => {
        setActiveScreen(shortcutButton.dataset.screenShortcut);
      });
    });

    document.querySelector("[data-open-entry-shortcut]").addEventListener("click", openSupplyModal);

    elementReferences.cancelSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.closeSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.cancelProjectModalButton.addEventListener("click", () => closeModal(elementReferences.projectModal));
    elementReferences.closeProjectModalButton.addEventListener("click", () => closeModal(elementReferences.projectModal));
    elementReferences.cancelCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));
    elementReferences.closeCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));
    elementReferences.closeProjectItemSheetButton.addEventListener("click", () => closeModal(elementReferences.projectItemSheet));

    elementReferences.floatingActionButton.addEventListener("click", openSupplyModal);
    elementReferences.supplyCategorySelect.addEventListener("change", updateSupplyCategoryFields);
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
        openInventoryEditModal(inventoryCard.dataset.inventoryItemId, true);
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
