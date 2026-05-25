import {
  calculateMaterialCost,
  calculateTotalCost,
  calculateUnitCost,
  normalizeNumber
} from "./calculation-engine.js";
import { LocalStorageRepository } from "./storage-repository.js";

const APPLICATION_STORAGE_KEY = "CALCULADORA_TATTOO_PROJECTS_V1";
const DEFAULT_PRICE_TABLE_ID = "base";
const DEFAULT_LABOR_HOURS = 1;
const DEFAULT_HOURLY_RATE = 0;
const NEEDLE_CATEGORY_NAME = "Agulhas";
const CSV_PROCESS_BATCH_SIZE = 24;

const INVENTORY_CATEGORY_OPTIONS = [
  "Geral",
  "Agulhas",
  "Higiene",
  "Protecao",
  "Pigmentos",
  "Transfer"
];

const DEFAULT_CSV_COLUMN_INDEXES = {
  name: 0,
  packageQuantity: 1,
  unitLabel: 2,
  packagePrice: 3,
  category: 4,
  brand: 5,
  needleType: 6
};

const CSV_HEADER_ALIASES = {
  name: ["nome", "material", "produto", "insumo", "name"],
  category: ["categoria", "category", "tipoitem"],
  packageQuantity: ["quantidadeembalagem", "qtdembalagem", "qtdpacote", "quantidadepacote", "quantidade", "packagequantity"],
  unitLabel: ["unidade", "un", "unit", "unitlabel"],
  packagePrice: ["precopacote", "precoembalagem", "preco", "valor", "packageprice"],
  brand: ["marca", "brand"],
  needleType: ["tipo", "modelo", "codigotipo", "needletype"]
};

const BASE_PRICE_TABLE_ITEMS = [
  { name: "Sabonete liquido", category: "Higiene", packageQuantity: 400, unitLabel: "ml", packagePrice: 37 },
  { name: "Bandagem", category: "Protecao", packageQuantity: 4.5, unitLabel: "metros", packagePrice: 10 },
  { name: "Lamina", category: "Higiene", packageQuantity: 7, unitLabel: "un", packagePrice: 7 },
  { name: "Batoque", category: "Geral", packageQuantity: 50, unitLabel: "un", packagePrice: 30 },
  { name: "Agulhas", category: "Agulhas", packageQuantity: 1, unitLabel: "un", packagePrice: 15, brand: "White Head", needleType: "RL0310" },
  { name: "Vaselina", category: "Higiene", packageQuantity: 150, unitLabel: "gramas", packagePrice: 30 },
  { name: "Transfer", category: "Transfer", packageQuantity: 30, unitLabel: "ml", packagePrice: 28 },
  { name: "Folha stencil", category: "Transfer", packageQuantity: 1, unitLabel: "folha", packagePrice: 4.5 },
  { name: "Papel toalha", category: "Higiene", packageQuantity: 200, unitLabel: "folhas", packagePrice: 12 },
  { name: "Mascara", category: "Protecao", packageQuantity: 100, unitLabel: "un", packagePrice: 25 },
  { name: "Plastico filme", category: "Protecao", packageQuantity: 70, unitLabel: "metros", packagePrice: 15 },
  { name: "Palito descartavel", category: "Geral", packageQuantity: 100, unitLabel: "un", packagePrice: 6 },
  { name: "Luvas", category: "Protecao", packageQuantity: 100, unitLabel: "un", packagePrice: 30 },
  { name: "Tinta preto linha", category: "Pigmentos", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 },
  { name: "Tinta preto tribal", category: "Pigmentos", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 },
  { name: "Tinta Raven Clow", category: "Pigmentos", packageQuantity: 20, unitLabel: "ml", packagePrice: 79 },
  { name: "Tinta color", category: "Pigmentos", packageQuantity: 20, unitLabel: "ml", packagePrice: 50 }
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
  const elementReferences = {};

  let applicationState = normalizeApplicationState(stateRepository.getState());
  let inventorySearchTerm = "";
  let projectSearchTerm = "";

  function initializeApplication() {
    bindElementReferences();
    renderApplication();
    bindEventListeners();
    registerServiceWorker();
  }

  function bindElementReferences() {
    elementReferences.activeProjectTotal = document.querySelector("#activeProjectTotal");
    elementReferences.applicationScreens = document.querySelectorAll("[data-screen-panel]");
    elementReferences.applyPriceTableButton = document.querySelector("#applyPriceTableButton");
    elementReferences.cancelCsvImportModalButton = document.querySelector("#cancelCsvImportModalButton");
    elementReferences.cancelSupplyModalButton = document.querySelector("#cancelSupplyModalButton");
    elementReferences.clearProjectButton = document.querySelector("#clearProjectButton");
    elementReferences.closeCsvImportModalButton = document.querySelector("#closeCsvImportModalButton");
    elementReferences.closeSupplyModalButton = document.querySelector("#closeSupplyModalButton");
    elementReferences.createProjectButton = document.querySelector("#createProjectButton");
    elementReferences.csvFileInput = document.querySelector("#csvFileInput");
    elementReferences.csvImportForm = document.querySelector("#csvImportForm");
    elementReferences.csvImportModal = document.querySelector("#csvImportModal");
    elementReferences.csvImportProgress = document.querySelector("#csvImportProgress");
    elementReferences.downloadProjectPdfButton = document.querySelector("#downloadProjectPdfButton");
    elementReferences.emptyStateTemplate = document.querySelector("#emptyStateTemplate");
    elementReferences.hourlyRateInput = document.querySelector("#hourlyRateInput");
    elementReferences.inventoryDashboard = document.querySelector("#inventoryDashboard");
    elementReferences.inventoryList = document.querySelector("#inventoryList");
    elementReferences.inventorySearchInput = document.querySelector("#inventorySearchInput");
    elementReferences.laborHoursInput = document.querySelector("#laborHoursInput");
    elementReferences.laborPreviewValue = document.querySelector("#laborPreviewValue");
    elementReferences.navigationButtons = document.querySelectorAll("[data-screen-target]");
    elementReferences.needleBrandInput = document.querySelector("#needleBrandInput");
    elementReferences.needleExtraFields = document.querySelector("#needleExtraFields");
    elementReferences.needleTypeInput = document.querySelector("#needleTypeInput");
    elementReferences.openCsvImportModalButton = document.querySelector("#openCsvImportModalButton");
    elementReferences.openSupplyModalButton = document.querySelector("#openSupplyModalButton");
    elementReferences.packagePriceInput = document.querySelector("#packagePriceInput");
    elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
    elementReferences.priceTableSelect = document.querySelector("#priceTableSelect");
    elementReferences.printDocument = document.querySelector("#printDocument");
    elementReferences.processCsvButton = document.querySelector("#processCsvButton");
    elementReferences.projectClientInput = document.querySelector("#projectClientInput");
    elementReferences.projectDashboard = document.querySelector("#projectDashboard");
    elementReferences.projectForm = document.querySelector("#projectForm");
    elementReferences.projectItemList = document.querySelector("#projectItemList");
    elementReferences.projectNameInput = document.querySelector("#projectNameInput");
    elementReferences.projectNotesInput = document.querySelector("#projectNotesInput");
    elementReferences.projectSearchInput = document.querySelector("#projectSearchInput");
    elementReferences.projectSelect = document.querySelector("#projectSelect");
    elementReferences.projectTotalDetail = document.querySelector("#projectTotalDetail");
    elementReferences.projectTotalValue = document.querySelector("#projectTotalValue");
    elementReferences.resetApplicationButton = document.querySelector("#resetApplicationButton");
    elementReferences.supplyCategorySelect = document.querySelector("#supplyCategorySelect");
    elementReferences.supplyForm = document.querySelector("#supplyForm");
    elementReferences.supplyModal = document.querySelector("#supplyModal");
    elementReferences.supplyNameInput = document.querySelector("#supplyNameInput");
    elementReferences.unitLabelInput = document.querySelector("#unitLabelInput");
  }

  function createInitialState() {
    const inventoryData = createInventoryDataFromPriceTable(DEFAULT_PRICE_TABLE_ID);
    const firstProject = createProject("Projeto 1", inventoryData);

    return {
      activeScreen: "projects",
      activePriceTableId: DEFAULT_PRICE_TABLE_ID,
      activeProjectId: firstProject.id,
      inventoryData,
      projects: [firstProject]
    };
  }

  function createInventoryDataFromPriceTable(priceTableId) {
    const priceTable = getPriceTableById(priceTableId);

    return priceTable.inventoryData.map((inventoryItem, inventoryIndex) => ({
      id: `${priceTable.id}-${inventoryIndex + 1}`,
      name: inventoryItem.name,
      category: inventoryItem.category || inferInventoryCategory(inventoryItem.name),
      packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
      unitLabel: inventoryItem.unitLabel || "un",
      packagePrice: normalizeNumber(inventoryItem.packagePrice),
      brand: inventoryItem.brand || "",
      needleType: inventoryItem.needleType || ""
    }));
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
      const inventoryName = String(inventoryItem.name || "Novo insumo");
      const inventoryCategory = String(inventoryItem.category || inferInventoryCategory(inventoryName));

      return {
        id: inventoryItem.id || createEntityId("inventory"),
        name: inventoryName,
        category: inventoryCategory,
        packageQuantity: normalizeNumber(inventoryItem.packageQuantity),
        unitLabel: String(inventoryItem.unitLabel || "un"),
        packagePrice: normalizeNumber(inventoryItem.packagePrice),
        brand: String(inventoryItem.brand || ""),
        needleType: String(inventoryItem.needleType || "")
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

    const requestedActiveProjectId = rawState.activeProjectId;
    const activeProjectId = projects.some((projectData) => projectData.id === requestedActiveProjectId)
      ? requestedActiveProjectId
      : projects[0].id;

    return {
      activeScreen: rawState.activeScreen === "inventory" ? "inventory" : "projects",
      activePriceTableId: rawState.activePriceTableId || DEFAULT_PRICE_TABLE_ID,
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

  function getPriceTableById(priceTableId) {
    return PRICE_TABLES.find((priceTable) => priceTable.id === priceTableId) || PRICE_TABLES[0];
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
    renderProjectOptions();
    renderProjectForm();
    renderDashboard();
    renderInventoryList();
    renderProjectItemList();
    updateSupplyCategoryFields();
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
  }

  function renderPriceTableOptions() {
    elementReferences.priceTableSelect.innerHTML = PRICE_TABLES.map((priceTable) => {
      const selectedAttribute = priceTable.id === applicationState.activePriceTableId ? "selected" : "";
      return `<option value="${escapeHtml(priceTable.id)}" ${selectedAttribute}>${escapeHtml(priceTable.name)}</option>`;
    }).join("");
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
        <span>No projeto</span>
        <strong>${activeProjectSummary.selectedItemCount}</strong>
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
        <span>Mao de obra</span>
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
      renderEmptyState(elementReferences.inventoryList);
      return;
    }

    elementReferences.inventoryList.innerHTML = filteredInventoryData.map(createInventoryCardHtml).join("");
  }

  function getFilteredInventoryData(searchTerm) {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return applicationState.inventoryData;
    }

    return applicationState.inventoryData.filter((inventoryItem) => {
      return getInventorySearchText(inventoryItem).includes(normalizedSearchTerm);
    });
  }

  function getInventorySearchText(inventoryItem) {
    return [
      inventoryItem.name,
      inventoryItem.category,
      inventoryItem.unitLabel,
      inventoryItem.brand,
      inventoryItem.needleType
    ].join(" ").toLowerCase();
  }

  function createInventoryCardHtml(inventoryItem) {
    const needleFieldsHtml = inventoryItem.category === NEEDLE_CATEGORY_NAME
      ? `
          <label class="form-field">
            <span>Marca</span>
            <input type="text" value="${escapeHtml(inventoryItem.brand)}" data-inventory-field="brand" />
          </label>
          <label class="form-field">
            <span>Tipo</span>
            <input type="text" value="${escapeHtml(inventoryItem.needleType)}" data-inventory-field="needleType" />
          </label>
        `
      : "";

    return `
      <article class="data-card" data-inventory-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h2>${escapeHtml(inventoryItem.name)}</h2>
            <span>${escapeHtml(getInventorySubtitle(inventoryItem))}</span>
          </div>
          <span class="pill">${formatCurrency(calculateUnitCost(inventoryItem))}/un</span>
        </div>

        <div class="editable-grid">
          <label class="form-field form-field-wide">
            <span>Material</span>
            <input type="text" value="${escapeHtml(inventoryItem.name)}" data-inventory-field="name" />
          </label>
          <label class="form-field">
            <span>Categoria</span>
            <select data-inventory-field="category">${createInventoryCategoryOptionsHtml(inventoryItem.category)}</select>
          </label>
          ${needleFieldsHtml}
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
          <button class="button button-primary" type="button" data-add-inventory-item-to-project>Usar no projeto</button>
          <button class="button button-danger" type="button" data-remove-inventory-item>Excluir</button>
        </div>
      </article>
    `;
  }

  function createInventoryCategoryOptionsHtml(currentCategory) {
    const categoryOptions = INVENTORY_CATEGORY_OPTIONS.includes(currentCategory)
      ? INVENTORY_CATEGORY_OPTIONS
      : [currentCategory, ...INVENTORY_CATEGORY_OPTIONS];

    return categoryOptions.map((categoryName) => {
      const selectedAttribute = categoryName === currentCategory ? "selected" : "";
      return `<option value="${escapeHtml(categoryName)}" ${selectedAttribute}>${escapeHtml(categoryName)}</option>`;
    }).join("");
  }

  function getInventorySubtitle(inventoryItem) {
    const packageText = `${formatNumber(inventoryItem.packageQuantity)} ${inventoryItem.unitLabel} por embalagem`;

    if (inventoryItem.category === NEEDLE_CATEGORY_NAME) {
      const needleText = [inventoryItem.brand, inventoryItem.needleType].filter(Boolean).join(" ");
      return needleText ? `${inventoryItem.category} | ${needleText} | ${packageText}` : `${inventoryItem.category} | ${packageText}`;
    }

    return `${inventoryItem.category} | ${packageText}`;
  }

  function renderProjectItemList() {
    const filteredInventoryData = getFilteredInventoryData(projectSearchTerm);

    if (filteredInventoryData.length === 0) {
      renderEmptyState(elementReferences.projectItemList);
      return;
    }

    elementReferences.projectItemList.innerHTML = filteredInventoryData.map(createProjectItemHtml).join("");
  }

  function createProjectItemHtml(inventoryItem) {
    const activeProject = getActiveProject();
    const quantityUsed = normalizeNumber(activeProject.materialUsage[inventoryItem.id]);
    const isSelected = quantityUsed > 0;

    return `
      <article class="data-card project-item ${isSelected ? "is-selected" : ""}" data-project-item-id="${escapeHtml(inventoryItem.id)}">
        <div class="card-header">
          <div class="card-title-group">
            <h3>${escapeHtml(inventoryItem.name)}</h3>
            <span>${formatCurrency(calculateUnitCost(inventoryItem))} por ${escapeHtml(inventoryItem.unitLabel)}</span>
          </div>
          <span class="pill">${formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed))}</span>
        </div>

        <div class="project-item-control">
          <button class="select-button" type="button" data-toggle-project-item aria-pressed="${isSelected}">
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
    const emptyState = elementReferences.emptyStateTemplate.content.cloneNode(true);
    container.innerHTML = "";
    container.appendChild(emptyState);
  }

  function setActiveScreen(screenName) {
    applicationState.activeScreen = screenName;
    persistApplicationState();
    renderActiveScreen();
  }

  function applyPriceTable() {
    const selectedPriceTableId = elementReferences.priceTableSelect.value;
    const selectedPriceTable = getPriceTableById(selectedPriceTableId);
    const shouldApply = window.confirm(`Usar a tabela "${selectedPriceTable.name}" e substituir os insumos atuais?`);

    if (!shouldApply) {
      elementReferences.priceTableSelect.value = applicationState.activePriceTableId;
      return;
    }

    applicationState.activePriceTableId = selectedPriceTableId;
    applicationState.inventoryData = createInventoryDataFromPriceTable(selectedPriceTableId);
    applicationState.projects = applicationState.projects.map((projectData) => ({
      ...projectData,
      materialUsage: createEmptyMaterialUsage(applicationState.inventoryData)
    }));
    persistApplicationState();
    renderApplication();
  }

  function openSupplyModal() {
    elementReferences.supplyForm.reset();
    elementReferences.supplyCategorySelect.value = "Geral";
    updateSupplyCategoryFields();
    openModal(elementReferences.supplyModal);
    elementReferences.supplyNameInput.focus();
  }

  function openCsvImportModal() {
    elementReferences.csvImportForm.reset();
    setCsvImportProgress("Aguardando arquivo CSV");
    elementReferences.processCsvButton.disabled = false;
    openModal(elementReferences.csvImportModal);
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

  function updateSupplyCategoryFields() {
    const isNeedleCategory = elementReferences.supplyCategorySelect.value === NEEDLE_CATEGORY_NAME;

    elementReferences.needleExtraFields.hidden = !isNeedleCategory;
    elementReferences.needleBrandInput.required = isNeedleCategory;
    elementReferences.needleTypeInput.required = isNeedleCategory;

    if (isNeedleCategory && !elementReferences.supplyNameInput.value.trim()) {
      elementReferences.supplyNameInput.value = NEEDLE_CATEGORY_NAME;
    }
  }

  function addInventoryItemFromForm() {
    const inventoryName = elementReferences.supplyNameInput.value.trim();
    const inventoryCategory = elementReferences.supplyCategorySelect.value;
    const packageQuantity = normalizeNumber(elementReferences.packageQuantityInput.value);
    const unitLabel = elementReferences.unitLabelInput.value.trim();
    const packagePrice = normalizeNumber(elementReferences.packagePriceInput.value);

    elementReferences.packageQuantityInput.setCustomValidity("");

    if (packageQuantity <= 0) {
      elementReferences.packageQuantityInput.setCustomValidity("Informe uma quantidade maior que zero.");
    }

    if (!inventoryName || !unitLabel || packageQuantity <= 0) {
      elementReferences.supplyForm.reportValidity();
      return;
    }

    const createdInventoryItem = {
      id: createEntityId("inventory"),
      name: inventoryName,
      category: inventoryCategory,
      packageQuantity,
      unitLabel,
      packagePrice,
      brand: inventoryCategory === NEEDLE_CATEGORY_NAME ? elementReferences.needleBrandInput.value.trim() : "",
      needleType: inventoryCategory === NEEDLE_CATEGORY_NAME ? elementReferences.needleTypeInput.value.trim() : ""
    };

    addInventoryItems([createdInventoryItem]);
    elementReferences.supplyForm.reset();
    closeModal(elementReferences.supplyModal);
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

  function updateInventoryItem(inventoryItemId, fieldName, value) {
    applicationState.inventoryData = applicationState.inventoryData.map((inventoryItem) => {
      if (inventoryItem.id !== inventoryItemId) {
        return inventoryItem;
      }

      const nextInventoryItem = {
        ...inventoryItem,
        [fieldName]: ["packageQuantity", "packagePrice"].includes(fieldName) ? normalizeNumber(value) : String(value)
      };

      if (fieldName === "category" && value !== NEEDLE_CATEGORY_NAME) {
        nextInventoryItem.brand = "";
        nextInventoryItem.needleType = "";
      }

      return nextInventoryItem;
    });

    persistApplicationState();
    renderApplication();
  }

  function removeInventoryItem(inventoryItemId) {
    applicationState.inventoryData = applicationState.inventoryData.filter((inventoryItem) => inventoryItem.id !== inventoryItemId);
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

  function addInventoryItemToProject(inventoryItemId) {
    updateActiveProject((projectData) => {
      const currentQuantity = normalizeNumber(projectData.materialUsage[inventoryItemId]);
      projectData.materialUsage[inventoryItemId] = currentQuantity > 0 ? currentQuantity : 1;
    });
    applicationState.activeScreen = "projects";
    persistApplicationState();
    renderApplication();
  }

  function createNewProject() {
    const suggestedProjectName = `Projeto ${applicationState.projects.length + 1}`;
    const enteredProjectName = window.prompt("Nome do projeto", suggestedProjectName);

    if (enteredProjectName === null) {
      return;
    }

    const projectName = enteredProjectName.trim() || suggestedProjectName;
    const newProject = createProject(projectName, applicationState.inventoryData);

    applicationState.projects.unshift(newProject);
    applicationState.activeProjectId = newProject.id;
    applicationState.activeScreen = "projects";
    persistApplicationState();
    renderApplication();
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
  }

  function updateLaborField(fieldName, value) {
    updateActiveProject((projectData) => {
      projectData[fieldName] = normalizeNumber(value);
    });
    persistApplicationState();
    renderDashboard();
    elementReferences.laborPreviewValue.textContent = formatCurrency(getActiveProjectSummary().laborTotal);
  }

  function updateMaterialUsage(inventoryItemId, value) {
    updateActiveProject((projectData) => {
      projectData.materialUsage[inventoryItemId] = normalizeNumber(value);
    });
    persistApplicationState();
    renderDashboard();
    updateProjectItemState(inventoryItemId);
  }

  function toggleProjectItem(inventoryItemId) {
    updateActiveProject((projectData) => {
      const currentQuantity = normalizeNumber(projectData.materialUsage[inventoryItemId]);
      projectData.materialUsage[inventoryItemId] = currentQuantity > 0 ? 0 : 1;
    });
    persistApplicationState();
    renderApplication();
  }

  function updateProjectItemState(inventoryItemId) {
    const activeProject = getActiveProject();
    const inventoryItem = applicationState.inventoryData.find((item) => item.id === inventoryItemId);
    const projectItem = Array.from(elementReferences.projectItemList.querySelectorAll("[data-project-item-id]")).find((item) => {
      return item.dataset.projectItemId === inventoryItemId;
    });

    if (!activeProject || !inventoryItem || !projectItem) {
      return;
    }

    const quantityUsed = normalizeNumber(activeProject.materialUsage[inventoryItemId]);
    const isSelected = quantityUsed > 0;
    const lineTotal = projectItem.querySelector("[data-line-total]");
    const topPill = projectItem.querySelector(".pill");
    const toggleButton = projectItem.querySelector("[data-toggle-project-item]");

    projectItem.classList.toggle("is-selected", isSelected);
    toggleButton.textContent = isSelected ? "Usando" : "Adicionar";
    toggleButton.setAttribute("aria-pressed", String(isSelected));
    lineTotal.textContent = formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed));
    topPill.textContent = formatCurrency(calculateMaterialCost(inventoryItem, quantityUsed));
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

  function resetApplication() {
    const shouldReset = window.confirm("Restaurar dados iniciais e apagar dados salvos neste navegador?");

    if (!shouldReset) {
      return;
    }

    applicationState = stateRepository.resetState();
    inventorySearchTerm = "";
    projectSearchTerm = "";
    elementReferences.inventorySearchInput.value = "";
    elementReferences.projectSearchInput.value = "";
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
      setCsvImportProgress("Nao foi possivel ler o arquivo CSV");
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
    return String(headerName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
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
    const inventoryName = getCsvColumnValue(csvRow, columnIndexes.name).trim();
    const inferredCategory = inferInventoryCategory(inventoryName);
    const inventoryCategory = getCsvColumnValue(csvRow, columnIndexes.category).trim() || inferredCategory;
    const packageQuantity = normalizeNumber(getCsvColumnValue(csvRow, columnIndexes.packageQuantity));
    const packagePrice = normalizeNumber(getCsvColumnValue(csvRow, columnIndexes.packagePrice));
    const unitLabel = getCsvColumnValue(csvRow, columnIndexes.unitLabel).trim() || "un";

    if (!inventoryName || packageQuantity <= 0) {
      return null;
    }

    return {
      id: createEntityId("inventory"),
      name: inventoryName,
      category: inventoryCategory,
      packageQuantity,
      unitLabel,
      packagePrice,
      brand: inventoryCategory === NEEDLE_CATEGORY_NAME ? getCsvColumnValue(csvRow, columnIndexes.brand).trim() : "",
      needleType: inventoryCategory === NEEDLE_CATEGORY_NAME ? getCsvColumnValue(csvRow, columnIndexes.needleType).trim() : ""
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
      setCsvImportProgress(`Nenhum item valido encontrado: 0 | ${totalItemCount}`);
      return;
    }

    addInventoryItems(importedInventoryItems);
    setCsvImportProgress(`Importacao concluida: ${importedInventoryItems.length} | ${totalItemCount}`);
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

  function inferInventoryCategory(inventoryName) {
    const normalizedInventoryName = String(inventoryName || "").toLowerCase();

    if (normalizedInventoryName.includes("agulha") || normalizedInventoryName.includes("rl") || normalizedInventoryName.includes("rs")) {
      return NEEDLE_CATEGORY_NAME;
    }

    return "Geral";
  }

  function renderPrintDocument() {
    const activeProject = getActiveProject();
    const activeProjectSummary = getActiveProjectSummary();
    const projectName = activeProject.projectName || "Projeto de tatuagem";
    const clientName = activeProject.clientName || "Cliente nao informado";
    const projectNotes = activeProject.projectNotes || "Sem observacoes.";

    const itemRows = activeProjectSummary.selectedItems.length > 0
      ? activeProjectSummary.selectedItems.map((projectItem) => `
          <tr>
            <td>${escapeHtml(projectItem.inventoryItem.name)}</td>
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
            <dt>Mao de obra</dt>
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
        <h2>Mao de obra</h2>
        <p>${formatNumber(activeProjectSummary.laborHours)} h x ${formatCurrency(activeProjectSummary.hourlyRate)} por hora = <strong>${formatCurrency(activeProjectSummary.laborTotal)}</strong></p>
      </section>

      <section class="print-section">
        <h2>Observacoes</h2>
        <p>${escapeHtml(projectNotes)}</p>
      </section>
    `;
  }

  function downloadProjectPdf() {
    renderPrintDocument();
    window.print();
  }

  function bindEventListeners() {
    elementReferences.navigationButtons.forEach((navigationButton) => {
      navigationButton.addEventListener("click", () => {
        setActiveScreen(navigationButton.dataset.screenTarget);
      });
    });

    elementReferences.applyPriceTableButton.addEventListener("click", applyPriceTable);
    elementReferences.clearProjectButton.addEventListener("click", clearActiveProjectItems);
    elementReferences.createProjectButton.addEventListener("click", createNewProject);
    elementReferences.downloadProjectPdfButton.addEventListener("click", downloadProjectPdf);
    elementReferences.openSupplyModalButton.addEventListener("click", openSupplyModal);
    elementReferences.openCsvImportModalButton.addEventListener("click", openCsvImportModal);
    elementReferences.resetApplicationButton.addEventListener("click", resetApplication);

    elementReferences.cancelSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.closeSupplyModalButton.addEventListener("click", () => closeModal(elementReferences.supplyModal));
    elementReferences.cancelCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));
    elementReferences.closeCsvImportModalButton.addEventListener("click", () => closeModal(elementReferences.csvImportModal));

    elementReferences.supplyCategorySelect.addEventListener("change", updateSupplyCategoryFields);
    elementReferences.csvImportForm.addEventListener("submit", handleCsvImportFormSubmit);

    elementReferences.projectSelect.addEventListener("change", (event) => {
      changeActiveProject(event.target.value);
    });

    elementReferences.supplyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addInventoryItemFromForm();
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

    elementReferences.inventorySearchInput.addEventListener("input", (event) => {
      inventorySearchTerm = event.target.value;
      renderInventoryList();
    });

    elementReferences.projectSearchInput.addEventListener("input", (event) => {
      projectSearchTerm = event.target.value;
      renderProjectItemList();
    });

    elementReferences.inventoryList.addEventListener("change", (event) => {
      const inventoryCard = event.target.closest("[data-inventory-item-id]");
      const fieldName = event.target.dataset.inventoryField;

      if (!inventoryCard || !fieldName) {
        return;
      }

      updateInventoryItem(inventoryCard.dataset.inventoryItemId, fieldName, event.target.value);
    });

    elementReferences.inventoryList.addEventListener("click", (event) => {
      const inventoryCard = event.target.closest("[data-inventory-item-id]");

      if (!inventoryCard) {
        return;
      }

      if (event.target.closest("[data-add-inventory-item-to-project]")) {
        addInventoryItemToProject(inventoryCard.dataset.inventoryItemId);
        return;
      }

      if (event.target.closest("[data-remove-inventory-item]")) {
        removeInventoryItem(inventoryCard.dataset.inventoryItemId);
      }
    });

    elementReferences.projectItemList.addEventListener("input", (event) => {
      if (!event.target.matches("[data-material-usage]")) {
        return;
      }

      const projectItem = event.target.closest("[data-project-item-id]");
      updateMaterialUsage(projectItem.dataset.projectItemId, event.target.value);
    });

    elementReferences.projectItemList.addEventListener("click", (event) => {
      const toggleButton = event.target.closest("[data-toggle-project-item]");

      if (!toggleButton) {
        return;
      }

      const projectItem = toggleButton.closest("[data-project-item-id]");
      toggleProjectItem(projectItem.dataset.projectItemId);
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
