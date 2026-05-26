const STORAGE_KEY = "CALCULADORA_TATTOO_STATE_V3";
const LEGACY_STORAGE_KEYS = [
  "CALCULADORA_TATTOO_LOCAL_STATE_V1",
  "CALCULADORA_TATTOO_STATE_V2"
];
const CATEGORY_ALL = "Todos";
const CATEGORY_NEEDLES = "Agulhas e Cartuchos";
const CATEGORY_LIQUIDS = "Líquidos e Pastosos";
const CATEGORY_DISPOSABLES = "Biossegurança e Descartáveis";
const CATEGORY_LINEAR = "Materiais de Área/Extensão";
const CATEGORY_DIRECT_UNIT = "Unidade Avulsa Direta";
const CALCULATION_UNIT_BOX = "unitBox";
const CALCULATION_FRACTIONAL = "fractional";
const CALCULATION_DIRECT_UNIT = "directUnit";
const PURCHASE_MODE_BOX = "box";
const PURCHASE_MODE_SINGLE = "single";
const MEASURE_UNIT = "un";
const MEASURE_ML = "ml";
const MEASURE_GRAM = "g";
const MEASURE_METER = "m";
const MEASURE_SHEET = "folhas";
const INTEGER_STEP = 1;
const DECIMAL_STEP = 0.5;
const MAX_IMAGE_SIZE_BYTES = 1800000;
const SCREEN_META = {
  home: { title: "Início", eyebrow: "Visão geral" },
  inventory: { title: "Estoque", eyebrow: "Banco local" },
  budget: { title: "Orçamento", eyebrow: "Ficha do cliente" }
};
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const CATEGORY_DEFINITIONS = {
  [CATEGORY_NEEDLES]: {
    label: CATEGORY_NEEDLES,
    helper: "Compra por caixa ou unidade avulsa, uso sempre inteiro.",
    calculationType: CALCULATION_UNIT_BOX,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: White Head", required: true },
      { key: "lineType", label: "Linha/Tipo", type: "text", placeholder: "Ex: RL, RS, MG", required: true },
      { key: "numbering", label: "Numeração", type: "text", placeholder: "Ex: 0310, 0712", required: true },
      { key: "purchaseMode", label: "Formato de compra", type: "select", required: true, options: [
        { value: PURCHASE_MODE_BOX, label: "Por Caixa" },
        { value: PURCHASE_MODE_SINGLE, label: "Por Unidade Avulsa" }
      ] },
      { key: "packageQuantity", label: "Quantidade na caixa", type: "number", inputMode: "numeric", placeholder: "20", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "packagePrice", label: "Preço da caixa", type: "currency", inputMode: "decimal", placeholder: "300,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_BOX } },
      { key: "singleUnitPrice", label: "Preço unitário pago", type: "currency", inputMode: "decimal", placeholder: "15,00", required: true, visibleWhen: { key: "purchaseMode", value: PURCHASE_MODE_SINGLE } }
    ]
  },
  [CATEGORY_LIQUIDS]: {
    label: CATEGORY_LIQUIDS,
    helper: "Compra em volume ou peso, uso fracionado.",
    calculationType: CALCULATION_FRACTIONAL,
    defaultMeasure: MEASURE_ML,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Tinta preta, vaselina", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Dynamic", required: false },
      { key: "color", label: "Cor, se aplicável", type: "text", placeholder: "Ex: Preto linha", required: false },
      { key: "packageQuantity", label: "Volume da embalagem", type: "measure", inputMode: "decimal", placeholder: "30", required: true, options: [MEASURE_ML, MEASURE_GRAM] },
      { key: "packagePrice", label: "Preço da embalagem", type: "currency", inputMode: "decimal", placeholder: "100,00", required: true }
    ]
  },
  [CATEGORY_DISPOSABLES]: {
    label: CATEGORY_DISPOSABLES,
    helper: "Compra em pacote ou caixa, uso por unidade.",
    calculationType: CALCULATION_UNIT_BOX,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Luva nitrílica, batoque", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Supermax", required: false },
      { key: "packageQuantity", label: "Qtd no pacote/caixa", type: "number", inputMode: "numeric", placeholder: "100", required: true },
      { key: "packagePrice", label: "Preço do pacote", type: "currency", inputMode: "decimal", placeholder: "50,00", required: true }
    ]
  },
  [CATEGORY_LINEAR]: {
    label: CATEGORY_LINEAR,
    helper: "Compra em rolo, uso por metro ou folha.",
    calculationType: CALCULATION_FRACTIONAL,
    defaultMeasure: MEASURE_METER,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Plástico filme", required: true },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ex: Marca do rolo", required: false },
      { key: "packageQuantity", label: "Tamanho total do rolo", type: "measure", inputMode: "decimal", placeholder: "30", required: true, options: [MEASURE_METER, MEASURE_SHEET] },
      { key: "packagePrice", label: "Preço do rolo", type: "currency", inputMode: "decimal", placeholder: "25,00", required: true }
    ]
  },
  [CATEGORY_DIRECT_UNIT]: {
    label: CATEGORY_DIRECT_UNIT,
    helper: "Compra avulsa, custo direto por unidade.",
    calculationType: CALCULATION_DIRECT_UNIT,
    defaultMeasure: MEASURE_UNIT,
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Folha de estêncil avulsa", required: true },
      { key: "unitPrice", label: "Preço unitário pago", type: "currency", inputMode: "decimal", placeholder: "4,50", required: true }
    ]
  }
};
const CATEGORY_ORDER = [
  CATEGORY_ALL,
  CATEGORY_NEEDLES,
  CATEGORY_LIQUIDS,
  CATEGORY_DISPOSABLES,
  CATEGORY_LINEAR,
  CATEGORY_DIRECT_UNIT
];
const DEFAULT_INVENTORY_ITEMS = [
  {
    id: "item-needle-rl0310",
    category: CATEGORY_NEEDLES,
    name: "White Head RL 0310",
    brand: "White Head",
    lineType: "RL",
    numbering: "0310",
    purchaseMode: PURCHASE_MODE_BOX,
    packageQuantity: 20,
    packagePrice: 300,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "item-liquid-black",
    category: CATEGORY_LIQUIDS,
    name: "Tinta preta linha",
    brand: "Dynamic",
    color: "Preto",
    packageQuantity: 30,
    packagePrice: 100,
    measureUnit: MEASURE_ML,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "item-disposable-glove",
    category: CATEGORY_DISPOSABLES,
    name: "Luvas nitrílicas",
    brand: "Supermax",
    packageQuantity: 100,
    packagePrice: 50,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_UNIT_BOX,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "item-linear-film",
    category: CATEGORY_LINEAR,
    name: "Plástico filme",
    brand: "Premium Wrap",
    packageQuantity: 30,
    packagePrice: 24,
    measureUnit: MEASURE_METER,
    calculationType: CALCULATION_FRACTIONAL,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "item-direct-stencil",
    category: CATEGORY_DIRECT_UNIT,
    name: "Folha de estêncil avulsa",
    brand: "",
    packageQuantity: 1,
    packagePrice: 4.5,
    unitPrice: 4.5,
    measureUnit: MEASURE_UNIT,
    calculationType: CALCULATION_DIRECT_UNIT,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];
const DEFAULT_BUDGET = {
  id: "budget-default",
  name: "Novo orçamento",
  clientName: "",
  hourlyRate: 0,
  sessionDuration: 0,
  referenceImage: "",
  referenceImageName: "",
  items: []
};

const dom = {};
let appState = loadAppState();
let activeScreen = "home";
let activeInventoryCategory = CATEGORY_ALL;
let activeBudgetCategory = CATEGORY_ALL;
let inventorySearchTerm = "";
let budgetSearchTerm = "";
let selectedFormCategory = CATEGORY_NEEDLES;
let editingItemId = null;

function initializeApp() {
  bindDomReferences();
  bindEvents();
  renderApp();
  registerServiceWorker();
}

function bindDomReferences() {
  dom.sidebar = document.querySelector("#sidebar");
  dom.drawerBackdrop = document.querySelector("#drawerBackdrop");
  dom.openSidebarButton = document.querySelector("#openSidebarButton");
  dom.navLinks = document.querySelectorAll("[data-screen-target]");
  dom.homeActions = document.querySelectorAll("[data-home-action]");
  dom.pageTitle = document.querySelector("#pageTitle");
  dom.pageEyebrow = document.querySelector("#pageEyebrow");
  dom.screens = document.querySelectorAll("[data-screen]");
  dom.quickNewItemButton = document.querySelector("#quickNewItemButton");
  dom.openItemModalButton = document.querySelector("#openItemModalButton");
  dom.itemModal = document.querySelector("#itemModal");
  dom.itemForm = document.querySelector("#itemForm");
  dom.itemModalEyebrow = document.querySelector("#itemModalEyebrow");
  dom.itemModalTitle = document.querySelector("#itemModalTitle");
  dom.closeItemModalButton = document.querySelector("#closeItemModalButton");
  dom.categoryChoiceGrid = document.querySelector("#categoryChoiceGrid");
  dom.dynamicFormTitle = document.querySelector("#dynamicFormTitle");
  dom.dynamicFieldsGrid = document.querySelector("#dynamicFieldsGrid");
  dom.unitCostPreview = document.querySelector("#unitCostPreview");
  dom.inventoryCounter = document.querySelector("#inventoryCounter");
  dom.inventorySearchInput = document.querySelector("#inventorySearchInput");
  dom.clearInventorySearchButton = document.querySelector("#clearInventorySearchButton");
  dom.inventoryCategoryFilters = document.querySelector("#inventoryCategoryFilters");
  dom.inventoryGrid = document.querySelector("#inventoryGrid");
  dom.budgetCounter = document.querySelector("#budgetCounter");
  dom.budgetNameInput = document.querySelector("#budgetNameInput");
  dom.clientNameInput = document.querySelector("#clientNameInput");
  dom.hourlyRateInput = document.querySelector("#hourlyRateInput");
  dom.sessionDurationInput = document.querySelector("#sessionDurationInput");
  dom.referenceImageInput = document.querySelector("#referenceImageInput");
  dom.removeReferenceImageButton = document.querySelector("#removeReferenceImageButton");
  dom.referencePreview = document.querySelector("#referencePreview");
  dom.materialTotalValue = document.querySelector("#materialTotalValue");
  dom.laborTotalValue = document.querySelector("#laborTotalValue");
  dom.budgetTotalValue = document.querySelector("#budgetTotalValue");
  dom.newBudgetButton = document.querySelector("#newBudgetButton");
  dom.exportPdfButton = document.querySelector("#exportPdfButton");
  dom.clearBudgetSearchButton = document.querySelector("#clearBudgetSearchButton");
  dom.budgetSearchInput = document.querySelector("#budgetSearchInput");
  dom.budgetCategoryFilters = document.querySelector("#budgetCategoryFilters");
  dom.stockPickerList = document.querySelector("#stockPickerList");
  dom.cartList = document.querySelector("#cartList");
  dom.invoiceDocument = document.querySelector("#invoiceDocument");
}

function bindEvents() {
  dom.openSidebarButton.addEventListener("click", openSidebar);
  dom.drawerBackdrop.addEventListener("click", closeSidebar);
  dom.navLinks.forEach((navLink) => {
    navLink.addEventListener("click", () => setActiveScreen(navLink.dataset.screenTarget));
  });
  dom.homeActions.forEach((homeAction) => {
    homeAction.addEventListener("click", () => setActiveScreen(homeAction.dataset.homeAction));
  });
  dom.quickNewItemButton.addEventListener("click", () => openItemModal());
  dom.openItemModalButton.addEventListener("click", () => openItemModal());
  dom.closeItemModalButton.addEventListener("click", () => closeModal(dom.itemModal));
  dom.categoryChoiceGrid.addEventListener("click", handleCategoryChoiceClick);
  dom.dynamicFieldsGrid.addEventListener("input", updateUnitCostPreview);
  dom.dynamicFieldsGrid.addEventListener("change", handleDynamicFieldsChange);
  dom.itemForm.addEventListener("submit", handleItemFormSubmit);
  dom.inventorySearchInput.addEventListener("input", (event) => {
    inventorySearchTerm = event.target.value;
    renderInventory();
  });
  dom.clearInventorySearchButton.addEventListener("click", () => {
    inventorySearchTerm = "";
    dom.inventorySearchInput.value = "";
    renderInventory();
  });
  dom.inventoryCategoryFilters.addEventListener("click", handleInventoryFilterClick);
  dom.inventoryGrid.addEventListener("click", handleInventoryGridClick);
  dom.budgetNameInput.addEventListener("input", updateBudgetIdentity);
  dom.clientNameInput.addEventListener("input", updateBudgetIdentity);
  dom.hourlyRateInput.addEventListener("input", updateBudgetLabor);
  dom.sessionDurationInput.addEventListener("input", updateBudgetLabor);
  dom.referenceImageInput.addEventListener("change", handleReferenceImageChange);
  dom.removeReferenceImageButton.addEventListener("click", removeReferenceImage);
  dom.newBudgetButton.addEventListener("click", createNewBudget);
  dom.exportPdfButton.addEventListener("click", exportPdf);
  dom.budgetSearchInput.addEventListener("input", (event) => {
    budgetSearchTerm = event.target.value;
    renderStockPicker();
  });
  dom.clearBudgetSearchButton.addEventListener("click", () => {
    budgetSearchTerm = "";
    dom.budgetSearchInput.value = "";
    renderStockPicker();
  });
  dom.budgetCategoryFilters.addEventListener("click", handleBudgetFilterClick);
  dom.stockPickerList.addEventListener("click", handleStockPickerClick);
  dom.stockPickerList.addEventListener("change", handlePickerQuantityChange);
  dom.cartList.addEventListener("click", handleCartClick);
  dom.cartList.addEventListener("change", handleCartQuantityChange);
}

function loadAppState() {
  const savedState = localStorage.getItem(STORAGE_KEY) || getLegacyState();

  if (!savedState) {
    return createInitialState();
  }

  try {
    return normalizeAppState(JSON.parse(savedState));
  } catch {
    return createInitialState();
  }
}

function getLegacyState() {
  const legacyKey = LEGACY_STORAGE_KEYS.find((storageKey) => localStorage.getItem(storageKey));
  return legacyKey ? localStorage.getItem(legacyKey) : "";
}

function createInitialState() {
  return {
    inventoryItems: DEFAULT_INVENTORY_ITEMS.map((item) => ({ ...item })),
    budgets: [{ ...DEFAULT_BUDGET, items: [] }],
    activeBudgetId: DEFAULT_BUDGET.id
  };
}

function normalizeAppState(rawState) {
  const inventorySource = Array.isArray(rawState.inventoryItems) ? rawState.inventoryItems : DEFAULT_INVENTORY_ITEMS;
  const budgetsSource = Array.isArray(rawState.budgets) && rawState.budgets.length > 0 ? rawState.budgets : [DEFAULT_BUDGET];
  const budgets = budgetsSource.map(normalizeBudget);
  const activeBudgetId = budgets.some((budget) => budget.id === rawState.activeBudgetId) ? rawState.activeBudgetId : budgets[0].id;

  return {
    inventoryItems: inventorySource.map(normalizeInventoryItem),
    budgets,
    activeBudgetId
  };
}

function normalizeInventoryItem(item) {
  const category = normalizeCategory(item.category);
  const categoryDefinition = CATEGORY_DEFINITIONS[category];
  const purchaseMode = getNormalizedPurchaseMode(item, category);
  const measureUnit = normalizeMeasureUnit(item.measureUnit || item.unitMeasure || item.unitLabel || item.tipoUnidade, categoryDefinition.defaultMeasure);
  const packageQuantity = getNormalizedPackageQuantity(item, category, purchaseMode);
  const packagePrice = getNormalizedPackagePrice(item, category, purchaseMode);
  const normalizedName = getNormalizedItemName(item, category);

  return {
    id: item.id || createId("item"),
    category,
    name: normalizedName,
    brand: sanitizeText(item.brand || item.marca),
    lineType: sanitizeText(item.lineType || item.cartridgeType || item.tipo),
    numbering: sanitizeText(item.numbering || item.cartridgeNumber || item.numeracao || item.numbering),
    color: sanitizeText(item.color || item.colorName || item.coloration || item.coloracao),
    purchaseMode,
    packageQuantity,
    packagePrice,
    unitPrice: category === CATEGORY_DIRECT_UNIT ? packagePrice : calculateRawUnitCost(packagePrice, packageQuantity),
    measureUnit,
    calculationType: categoryDefinition.calculationType,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
  };
}

function getNormalizedItemName(item, category) {
  if (category === CATEGORY_NEEDLES) {
    const brand = sanitizeText(item.brand || item.marca);
    const lineType = sanitizeText(item.lineType || item.cartridgeType || item.tipo);
    const numbering = sanitizeText(item.numbering || item.cartridgeNumber || item.numeracao);
    return [brand, lineType, numbering].filter(Boolean).join(" ") || "Cartucho sem identificação";
  }

  return sanitizeText(item.name || item.nome || item.description || item.descricao) || "Novo item";
}

function getNormalizedPurchaseMode(item, category) {
  if (category !== CATEGORY_NEEDLES) {
    return "";
  }

  const rawPurchaseMode = sanitizeText(item.purchaseMode).toLowerCase();
  const isSingle = rawPurchaseMode === PURCHASE_MODE_SINGLE || rawPurchaseMode === "unit" || rawPurchaseMode === "single" || rawPurchaseMode.includes("avul");
  const isBox = rawPurchaseMode === PURCHASE_MODE_BOX || rawPurchaseMode === "caixa" || rawPurchaseMode.includes("box");

  if (isSingle) {
    return PURCHASE_MODE_SINGLE;
  }

  if (isBox) {
    return PURCHASE_MODE_BOX;
  }

  return normalizeNumber(item.packageQuantity || item.quantity || item.quantidade) <= 1 ? PURCHASE_MODE_SINGLE : PURCHASE_MODE_BOX;
}

function getNormalizedPackageQuantity(item, category, purchaseMode = "") {
  if (category === CATEGORY_DIRECT_UNIT || purchaseMode === PURCHASE_MODE_SINGLE) {
    return 1;
  }

  const value = normalizeNumber(item.packageQuantity || item.currentStock || item.quantity || item.quantidade);
  return value > 0 ? value : 1;
}

function getNormalizedPackagePrice(item, category, purchaseMode = "") {
  if (category === CATEGORY_DIRECT_UNIT || purchaseMode === PURCHASE_MODE_SINGLE) {
    const unitPrice = normalizeNumber(item.singleUnitPrice || item.unitPrice || item.packagePrice || item.purchasePrice || item.valor || item.price);
    return unitPrice > 0 ? unitPrice : 0;
  }

  const explicitPackagePrice = normalizeNumber(item.packagePrice);

  if (explicitPackagePrice > 0) {
    return explicitPackagePrice;
  }

  const legacyPurchasePrice = normalizeNumber(item.purchasePrice || item.valor || item.price);

  if (category === CATEGORY_NEEDLES && legacyPurchasePrice > 0 && !item.packagePrice) {
    return legacyPurchasePrice * getNormalizedPackageQuantity(item, category, purchaseMode);
  }

  return legacyPurchasePrice > 0 ? legacyPurchasePrice : 0;
}

function normalizeBudget(budget) {
  return {
    id: budget.id || createId("budget"),
    name: sanitizeText(budget.name || budget.projectName) || "Novo orçamento",
    clientName: sanitizeText(budget.clientName || budget.customerName || budget.nomeCliente),
    hourlyRate: normalizeNumber(budget.hourlyRate || budget.laborHourlyRate || budget.valorHora),
    sessionDuration: normalizeNumber(budget.sessionDuration || budget.sessionHours || budget.laborHours || budget.duracao),
    referenceImage: isImageDataUrl(budget.referenceImage || budget.tattooImage) ? (budget.referenceImage || budget.tattooImage) : "",
    referenceImageName: sanitizeText(budget.referenceImageName || budget.tattooImageName),
    items: Array.isArray(budget.items) ? budget.items.map(normalizeBudgetItem) : []
  };
}

function normalizeBudgetItem(item) {
  return {
    id: item.id || createId("cart"),
    inventoryItemId: item.inventoryItemId,
    quantityUsed: normalizeNumber(item.quantityUsed)
  };
}

function saveAppState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function renderApp() {
  renderActiveScreen();
  renderCategoryChoices();
  renderDynamicForm();
  renderInventoryFilters();
  renderBudgetFilters();
  renderInventory();
  renderBudget();
}

function renderActiveScreen() {
  const screenMeta = SCREEN_META[activeScreen] || SCREEN_META.home;
  dom.pageTitle.textContent = screenMeta.title;
  dom.pageEyebrow.textContent = screenMeta.eyebrow;
  dom.screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === activeScreen);
  });
  dom.navLinks.forEach((navLink) => {
    navLink.classList.toggle("is-active", navLink.dataset.screenTarget === activeScreen);
  });
  dom.quickNewItemButton.hidden = activeScreen !== "inventory";
}

function renderCategoryChoices() {
  dom.categoryChoiceGrid.innerHTML = getBusinessCategories().map((categoryName) => {
    const categoryDefinition = CATEGORY_DEFINITIONS[categoryName];
    const isActive = selectedFormCategory === categoryName;
    return `
      <button class="category-choice ${isActive ? "is-active" : ""}" type="button" data-form-category="${escapeHtml(categoryName)}">
        <strong>${escapeHtml(categoryDefinition.label)}</strong>
        <span>${escapeHtml(categoryDefinition.helper)}</span>
      </button>
    `;
  }).join("");
}

function renderDynamicForm(item = null) {
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const formData = readDynamicFormData();
  const renderItem = item || createVirtualItemFromFormData(formData);
  dom.dynamicFormTitle.textContent = `${categoryDefinition.label}: ficha específica`;
  dom.dynamicFieldsGrid.innerHTML = categoryDefinition.fields
    .filter((field) => isFieldVisible(field, renderItem, formData))
    .map((field) => createDynamicFieldHtml(field, renderItem))
    .join("");
  updateUnitCostPreview();
}

function createVirtualItemFromFormData(formData) {
  return {
    ...formData,
    measureUnit: formData.measureUnit,
    purchaseMode: formData.purchaseMode || PURCHASE_MODE_BOX
  };
}

function isFieldVisible(field, item, formData) {
  if (!field.visibleWhen) {
    return true;
  }

  const currentValue = sanitizeText(formData[field.visibleWhen.key] || item?.[field.visibleWhen.key] || PURCHASE_MODE_BOX);
  return currentValue === field.visibleWhen.value;
}

function createDynamicFieldHtml(field, item) {
  const value = getFieldValueForRender(field, item);
  const requiredAttribute = field.required ? "required" : "";
  const inputMode = field.inputMode ? `inputmode="${escapeHtml(field.inputMode)}"` : "";

  if (field.type === "select") {
    const selectedValue = sanitizeText(value || field.options[0]?.value);
    return `
      <label class="form-field">
        <span>${escapeHtml(field.label)}</span>
        <select data-item-field="${escapeHtml(field.key)}" ${requiredAttribute}>
          ${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (field.type === "measure") {
    const selectedUnit = item?.measureUnit || CATEGORY_DEFINITIONS[selectedFormCategory].defaultMeasure;
    return `
      <label class="form-field measure-field">
        <span>${escapeHtml(field.label)}</span>
        <div class="measure-input-group">
          <input data-item-field="${escapeHtml(field.key)}" type="text" ${inputMode} placeholder="${escapeHtml(field.placeholder)}" value="${escapeHtml(value)}" ${requiredAttribute} />
          <select data-item-field="measureUnit" aria-label="Unidade de medida">
            ${field.options.map((optionValue) => `<option value="${escapeHtml(optionValue)}" ${optionValue === selectedUnit ? "selected" : ""}>${escapeHtml(getMeasureLabel(optionValue))}</option>`).join("")}
          </select>
        </div>
      </label>
    `;
  }

  return `
    <label class="form-field">
      <span>${escapeHtml(field.label)}</span>
      <input data-item-field="${escapeHtml(field.key)}" type="text" ${inputMode} placeholder="${escapeHtml(field.placeholder)}" value="${escapeHtml(value)}" ${requiredAttribute} />
    </label>
  `;
}

function getFieldValueForRender(field, item) {
  if (!item) {
    return "";
  }

  if (field.key === "packagePrice") {
    return formatEditableNumber(item.packagePrice);
  }

  if (field.key === "unitPrice") {
    return formatEditableNumber(calculateUnitCost(item));
  }

  if (field.key === "singleUnitPrice") {
    return item.singleUnitPrice ? formatEditableNumber(item.singleUnitPrice) : formatEditableNumber(calculateUnitCost(item));
  }

  if (field.key === "purchaseMode") {
    return item.purchaseMode || PURCHASE_MODE_BOX;
  }

  if (field.key === "packageQuantity") {
    return formatEditableNumber(item.packageQuantity);
  }

  return item[field.key] || "";
}

function renderInventoryFilters() {
  renderFilterGroup(dom.inventoryCategoryFilters, activeInventoryCategory, "inventory-category");
}

function renderBudgetFilters() {
  renderFilterGroup(dom.budgetCategoryFilters, activeBudgetCategory, "budget-category");
}

function renderFilterGroup(container, activeCategory, dataAttributeName) {
  const categories = CATEGORY_ORDER.filter((categoryName) => categoryName === CATEGORY_ALL || appState.inventoryItems.some((item) => item.category === categoryName));
  const safeCategories = categories.length > 1 ? categories : CATEGORY_ORDER;

  container.innerHTML = safeCategories.map((categoryName) => {
    const categoryCount = countItemsByCategory(categoryName);
    const isActive = categoryName === activeCategory;
    return `
      <button class="filter-chip ${isActive ? "is-active" : ""}" type="button" data-${dataAttributeName}="${escapeHtml(categoryName)}">
        <span>${escapeHtml(categoryName)}</span>
        <strong>${formatCompactCount(categoryCount)}</strong>
      </button>
    `;
  }).join("");
}

function renderInventory() {
  const filteredItems = getFilteredInventoryItems(inventorySearchTerm, activeInventoryCategory);
  dom.inventoryCounter.textContent = formatItemsCounter(filteredItems.length, appState.inventoryItems.length);

  if (filteredItems.length === 0) {
    dom.inventoryGrid.innerHTML = createEmptyStateHtml("Nenhum item encontrado no estoque.");
    return;
  }

  dom.inventoryGrid.innerHTML = filteredItems.map(createInventoryCardHtml).join("");
}

function createInventoryCardHtml(item) {
  const unitCost = calculateUnitCost(item);
  const totalValue = calculateTotalInventoryValue(item);
  const specification = getItemSpecification(item);
  const shouldShowNeedleValue = item.category === CATEGORY_NEEDLES && item.purchaseMode === PURCHASE_MODE_SINGLE;
  const featuredMetric = item.category === CATEGORY_NEEDLES && !shouldShowNeedleValue
    ? `<div class="stock-metric is-featured"><span>Tipo + numeração</span><strong>${escapeHtml(specification)}</strong></div>`
    : `<div class="stock-metric is-featured"><span>Valor financeiro total</span><strong>${formatCurrency(totalValue)}</strong></div>`;

  return `
    <article class="inventory-card" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="card-topline">
        <span class="category-pill">${escapeHtml(item.category)}</span>
        <details class="card-menu">
          <summary aria-label="Abrir opções">⋯</summary>
          <div>
            <button type="button" data-inventory-action="edit">Editar</button>
            <button type="button" data-inventory-action="delete">Excluir</button>
          </div>
        </details>
      </div>
      <div class="inventory-title-row">
        <div class="product-avatar" aria-hidden="true">${escapeHtml(getProductInitial(item))}</div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span>${escapeHtml(getItemSubtitle(item))}</span>
        </div>
      </div>
      <div class="stock-metric-grid">
        ${featuredMetric}
        <div class="stock-metric">
          <span>Custo por ${escapeHtml(getMeasureLabel(item.measureUnit))}</span>
          <strong>${formatCurrency(unitCost)}</strong>
        </div>
      </div>
      <p class="card-note">${escapeHtml(getCalculationDescription(item))}</p>
    </article>
  `;
}

function renderBudget() {
  const activeBudget = getActiveBudget();
  const budgetTotals = calculateBudgetTotals(activeBudget);
  dom.budgetNameInput.value = activeBudget.name;
  dom.clientNameInput.value = activeBudget.clientName;
  dom.hourlyRateInput.value = activeBudget.hourlyRate > 0 ? formatEditableNumber(activeBudget.hourlyRate) : "";
  dom.sessionDurationInput.value = activeBudget.sessionDuration > 0 ? formatEditableNumber(activeBudget.sessionDuration) : "";
  dom.materialTotalValue.textContent = formatCurrency(budgetTotals.materialCost);
  dom.laborTotalValue.textContent = formatCurrency(budgetTotals.laborCost);
  dom.budgetTotalValue.textContent = formatCurrency(budgetTotals.totalCost);
  dom.budgetCounter.textContent = formatItemsCounter(activeBudget.items.length, activeBudget.items.length);
  renderReferencePreview();
  renderStockPicker();
  renderCart();
}

function renderReferencePreview() {
  const activeBudget = getActiveBudget();

  if (!activeBudget.referenceImage) {
    dom.referencePreview.hidden = true;
    dom.referencePreview.innerHTML = "";
    return;
  }

  dom.referencePreview.hidden = false;
  dom.referencePreview.innerHTML = `
    <img src="${escapeAttribute(activeBudget.referenceImage)}" alt="Imagem de referência da tatuagem" />
    <figcaption>${escapeHtml(activeBudget.referenceImageName || "Referência adicionada")}</figcaption>
  `;
}

function renderStockPicker() {
  const filteredItems = getFilteredInventoryItems(budgetSearchTerm, activeBudgetCategory);

  if (filteredItems.length === 0) {
    dom.stockPickerList.innerHTML = createEmptyStateHtml("Nenhum insumo encontrado para adicionar ao orçamento.");
    return;
  }

  dom.stockPickerList.innerHTML = filteredItems.map((item) => {
    const usageRules = getUsageRules(item);
    const suffix = getMeasureSuffix(item.measureUnit);
    return `
      <article class="picker-card" data-inventory-item-id="${escapeHtml(item.id)}">
        <div class="picker-info">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)} · ${escapeHtml(getItemSpecification(item))}</span>
          <small>${formatCurrency(calculateUnitCost(item))} por ${escapeHtml(getMeasureLabel(item.measureUnit))}</small>
        </div>
        <div class="picker-actions">
          <label class="stepper-field">
            <span>Quantidade usada</span>
            <div class="quantity-stepper ${suffix ? "has-suffix" : ""}" data-suffix="${escapeHtml(suffix)}">
              <button type="button" data-picker-step="decrease" aria-label="Diminuir quantidade">−</button>
              <input data-picker-quantity type="text" inputmode="${usageRules.inputMode}" value="${formatEditableNumber(usageRules.defaultValue)}" />
              <button type="button" data-picker-step="increase" aria-label="Aumentar quantidade">+</button>
            </div>
          </label>
          <button class="primary-button" type="button" data-add-to-budget>Adicionar</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderCart() {
  const activeBudget = getActiveBudget();
  const cartEntries = activeBudget.items
    .map((cartItem) => ({ cartItem, inventoryItem: findInventoryItem(cartItem.inventoryItemId) }))
    .filter((entry) => entry.inventoryItem);

  if (cartEntries.length === 0) {
    dom.cartList.innerHTML = createEmptyStateHtml("Nenhum insumo adicionado ao orçamento.");
    return;
  }

  dom.cartList.innerHTML = cartEntries.map(({ cartItem, inventoryItem }) => {
    const suffix = getMeasureSuffix(inventoryItem.measureUnit);
    const subtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);
    const usageRules = getUsageRules(inventoryItem);
    return `
      <article class="cart-line" data-cart-item-id="${escapeHtml(cartItem.id)}">
        <div>
          <strong>${escapeHtml(inventoryItem.name)}</strong>
          <span>${escapeHtml(getItemSpecification(inventoryItem))} · ${formatCurrency(calculateUnitCost(inventoryItem))}/${escapeHtml(getMeasureLabel(inventoryItem.measureUnit))}</span>
        </div>
        <label class="stepper-field compact-stepper-field">
          <span>Uso</span>
          <div class="quantity-stepper ${suffix ? "has-suffix" : ""}" data-suffix="${escapeHtml(suffix)}">
            <button type="button" data-cart-step="decrease" aria-label="Diminuir quantidade">−</button>
            <input data-cart-quantity type="text" inputmode="${usageRules.inputMode}" value="${formatEditableNumber(cartItem.quantityUsed)}" />
            <button type="button" data-cart-step="increase" aria-label="Aumentar quantidade">+</button>
          </div>
        </label>
        <strong class="line-subtotal">${formatCurrency(subtotal)}</strong>
        <button class="ghost-button" type="button" data-remove-cart-item>Remover</button>
      </article>
    `;
  }).join("");
}

function setActiveScreen(screenName) {
  if (!Object.prototype.hasOwnProperty.call(SCREEN_META, screenName)) {
    return;
  }

  activeScreen = screenName;
  renderActiveScreen();
  closeSidebar();
}

function openSidebar() {
  dom.sidebar.classList.add("is-open");
  dom.drawerBackdrop.hidden = false;
}

function closeSidebar() {
  dom.sidebar.classList.remove("is-open");
  dom.drawerBackdrop.hidden = true;
}

function handleDynamicFieldsChange(event) {
  if (event.target.matches('[data-item-field="purchaseMode"]')) {
    renderDynamicForm();
    return;
  }

  updateUnitCostPreview();
}

function handleCategoryChoiceClick(event) {
  const categoryButton = event.target.closest("[data-form-category]");

  if (!categoryButton) {
    return;
  }

  selectedFormCategory = normalizeCategory(categoryButton.dataset.formCategory);
  renderCategoryChoices();
  renderDynamicForm();
}

function handleInventoryFilterClick(event) {
  const filterButton = event.target.closest("[data-inventory-category]");

  if (!filterButton) {
    return;
  }

  activeInventoryCategory = normalizeCategory(filterButton.dataset.inventoryCategory);
  renderInventoryFilters();
  renderInventory();
}

function handleBudgetFilterClick(event) {
  const filterButton = event.target.closest("[data-budget-category]");

  if (!filterButton) {
    return;
  }

  activeBudgetCategory = normalizeCategory(filterButton.dataset.budgetCategory);
  renderBudgetFilters();
  renderStockPicker();
}

function handleInventoryGridClick(event) {
  const actionButton = event.target.closest("[data-inventory-action]");

  if (!actionButton) {
    return;
  }

  const inventoryCard = actionButton.closest("[data-inventory-item-id]");
  const inventoryItemId = inventoryCard?.dataset.inventoryItemId;

  if (!inventoryItemId) {
    return;
  }

  if (actionButton.dataset.inventoryAction === "edit") {
    openItemModal(inventoryItemId);
    return;
  }

  if (actionButton.dataset.inventoryAction === "delete") {
    deleteInventoryItem(inventoryItemId);
  }
}

function handleStockPickerClick(event) {
  const stepButton = event.target.closest("[data-picker-step]");

  if (stepButton) {
    const pickerCard = stepButton.closest("[data-inventory-item-id]");
    const inventoryItem = findInventoryItem(pickerCard?.dataset.inventoryItemId);
    const quantityInput = pickerCard?.querySelector("[data-picker-quantity]");

    if (inventoryItem && quantityInput) {
      quantityInput.value = formatEditableNumber(adjustQuantity(inventoryItem, quantityInput.value, stepButton.dataset.pickerStep, getMinimumQuantity(inventoryItem)));
    }
    return;
  }

  const addButton = event.target.closest("[data-add-to-budget]");

  if (!addButton) {
    return;
  }

  const pickerCard = addButton.closest("[data-inventory-item-id]");
  const quantityInput = pickerCard?.querySelector("[data-picker-quantity]");
  addItemToBudget(pickerCard?.dataset.inventoryItemId, quantityInput?.value);
}

function handlePickerQuantityChange(event) {
  if (!event.target.matches("[data-picker-quantity]")) {
    return;
  }

  const pickerCard = event.target.closest("[data-inventory-item-id]");
  const inventoryItem = findInventoryItem(pickerCard?.dataset.inventoryItemId);

  if (!inventoryItem) {
    return;
  }

  event.target.value = formatEditableNumber(sanitizeUsageQuantity(inventoryItem, event.target.value, getMinimumQuantity(inventoryItem)));
}

function handleCartClick(event) {
  const stepButton = event.target.closest("[data-cart-step]");

  if (stepButton) {
    const cartLine = stepButton.closest("[data-cart-item-id]");
    adjustCartQuantity(cartLine?.dataset.cartItemId, stepButton.dataset.cartStep);
    return;
  }

  const removeButton = event.target.closest("[data-remove-cart-item]");

  if (removeButton) {
    const cartLine = removeButton.closest("[data-cart-item-id]");
    removeCartItem(cartLine?.dataset.cartItemId);
  }
}

function handleCartQuantityChange(event) {
  if (!event.target.matches("[data-cart-quantity]")) {
    return;
  }

  const cartLine = event.target.closest("[data-cart-item-id]");
  updateCartQuantity(cartLine?.dataset.cartItemId, event.target.value);
}

function openItemModal(itemId = null) {
  const item = itemId ? findInventoryItem(itemId) : null;
  editingItemId = item?.id || null;
  selectedFormCategory = item?.category || CATEGORY_NEEDLES;
  dom.itemModalEyebrow.textContent = editingItemId ? "Editar item" : "Novo item";
  dom.itemModalTitle.textContent = editingItemId ? "Atualizar insumo" : "Cadastrar insumo";
  renderCategoryChoices();
  renderDynamicForm(item);
  openModal(dom.itemModal);
}

function closeModal(modalElement) {
  if (typeof modalElement.close === "function" && modalElement.open) {
    modalElement.close();
    return;
  }

  modalElement.removeAttribute("open");
}

function openModal(modalElement) {
  if (typeof modalElement.showModal === "function") {
    modalElement.showModal();
    return;
  }

  modalElement.setAttribute("open", "");
}

function handleItemFormSubmit(event) {
  event.preventDefault();
  const inventoryItem = buildInventoryItemFromForm();

  if (!inventoryItem) {
    dom.itemForm.reportValidity();
    return;
  }

  if (editingItemId) {
    appState.inventoryItems = appState.inventoryItems.map((item) => item.id === editingItemId ? inventoryItem : item);
  } else {
    appState.inventoryItems.unshift(inventoryItem);
  }

  editingItemId = null;
  saveAppState();
  closeModal(dom.itemModal);
  renderApp();
}

function buildInventoryItemFromForm() {
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const fieldData = readDynamicFormData();
  const existingItem = editingItemId ? findInventoryItem(editingItemId) : null;
  const purchaseMode = selectedFormCategory === CATEGORY_NEEDLES ? sanitizeText(fieldData.purchaseMode || PURCHASE_MODE_BOX) : "";
  const isSingleNeedle = selectedFormCategory === CATEGORY_NEEDLES && purchaseMode === PURCHASE_MODE_SINGLE;
  const packageQuantity = selectedFormCategory === CATEGORY_DIRECT_UNIT || isSingleNeedle ? 1 : normalizeNumber(fieldData.packageQuantity);
  const packagePrice = selectedFormCategory === CATEGORY_DIRECT_UNIT
    ? normalizeNumber(fieldData.unitPrice)
    : isSingleNeedle
      ? normalizeNumber(fieldData.singleUnitPrice)
      : normalizeNumber(fieldData.packagePrice);
  const measureUnit = normalizeMeasureUnit(fieldData.measureUnit, categoryDefinition.defaultMeasure);

  if (packageQuantity <= 0 || packagePrice <= 0 || !validateRequiredFields(categoryDefinition.fields, fieldData)) {
    return null;
  }

  const baseItem = {
    id: editingItemId || createId("item"),
    category: selectedFormCategory,
    name: buildItemName(selectedFormCategory, fieldData),
    brand: sanitizeText(fieldData.brand),
    lineType: sanitizeText(fieldData.lineType),
    numbering: sanitizeText(fieldData.numbering),
    color: sanitizeText(fieldData.color),
    purchaseMode,
    packageQuantity,
    packagePrice,
    unitPrice: selectedFormCategory === CATEGORY_DIRECT_UNIT ? packagePrice : calculateRawUnitCost(packagePrice, packageQuantity),
    measureUnit,
    calculationType: categoryDefinition.calculationType,
    createdAt: existingItem?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return normalizeInventoryItem(baseItem);
}

function readDynamicFormData() {
  const formData = {};
  dom.dynamicFieldsGrid.querySelectorAll("[data-item-field]").forEach((fieldElement) => {
    formData[fieldElement.dataset.itemField] = fieldElement.value;
  });
  return formData;
}

function validateRequiredFields(fields, fieldData) {
  const virtualItem = createVirtualItemFromFormData(fieldData);
  return fields
    .filter((field) => isFieldVisible(field, virtualItem, fieldData))
    .every((field) => !field.required || sanitizeText(fieldData[field.key] || fieldData.unitPrice));
}

function buildItemName(categoryName, fieldData) {
  if (categoryName === CATEGORY_NEEDLES) {
    return [fieldData.brand, fieldData.lineType, fieldData.numbering].map(sanitizeText).filter(Boolean).join(" ");
  }

  return sanitizeText(fieldData.name);
}

function updateUnitCostPreview() {
  const fieldData = readDynamicFormData();
  const categoryDefinition = CATEGORY_DEFINITIONS[selectedFormCategory];
  const purchaseMode = selectedFormCategory === CATEGORY_NEEDLES ? sanitizeText(fieldData.purchaseMode || PURCHASE_MODE_BOX) : "";
  const isSingleNeedle = selectedFormCategory === CATEGORY_NEEDLES && purchaseMode === PURCHASE_MODE_SINGLE;
  const packageQuantity = selectedFormCategory === CATEGORY_DIRECT_UNIT || isSingleNeedle ? 1 : normalizeNumber(fieldData.packageQuantity);
  const packagePrice = selectedFormCategory === CATEGORY_DIRECT_UNIT
    ? normalizeNumber(fieldData.unitPrice)
    : isSingleNeedle
      ? normalizeNumber(fieldData.singleUnitPrice)
      : normalizeNumber(fieldData.packagePrice);
  const measureUnit = normalizeMeasureUnit(fieldData.measureUnit, categoryDefinition.defaultMeasure);
  const unitCost = calculateRawUnitCost(packagePrice, packageQuantity);
  const previewLabel = getPreviewLabel(selectedFormCategory, measureUnit);
  dom.unitCostPreview.innerHTML = `
    <span>${escapeHtml(previewLabel)}</span>
    <strong>${formatCurrency(unitCost)}</strong>
  `;
}

function getPreviewLabel(categoryName, measureUnit) {
  if (categoryName === CATEGORY_NEEDLES) {
    return "Custo por cartucho/agulha";
  }

  if (categoryName === CATEGORY_DIRECT_UNIT) {
    return "Custo por unidade avulsa";
  }

  return `Custo por ${getMeasureLabel(measureUnit)}`;
}

function deleteInventoryItem(itemId) {
  appState.inventoryItems = appState.inventoryItems.filter((item) => item.id !== itemId);
  appState.budgets = appState.budgets.map((budget) => ({
    ...budget,
    items: budget.items.filter((cartItem) => cartItem.inventoryItemId !== itemId)
  }));
  saveAppState();
  renderApp();
}

function updateBudgetIdentity() {
  const activeBudget = getActiveBudget();
  activeBudget.name = sanitizeText(dom.budgetNameInput.value) || "Novo orçamento";
  activeBudget.clientName = sanitizeText(dom.clientNameInput.value);
  saveAppState();
}

function updateBudgetLabor() {
  const activeBudget = getActiveBudget();
  activeBudget.hourlyRate = normalizeNumber(dom.hourlyRateInput.value);
  activeBudget.sessionDuration = normalizeNumber(dom.sessionDurationInput.value);
  saveAppState();
  renderBudgetTotalsOnly();
}

function renderBudgetTotalsOnly() {
  const totals = calculateBudgetTotals(getActiveBudget());
  dom.materialTotalValue.textContent = formatCurrency(totals.materialCost);
  dom.laborTotalValue.textContent = formatCurrency(totals.laborCost);
  dom.budgetTotalValue.textContent = formatCurrency(totals.totalCost);
}

function handleReferenceImageChange(event) {
  const imageFile = event.target.files?.[0];

  if (!imageFile || !imageFile.type.startsWith("image/") || imageFile.size > MAX_IMAGE_SIZE_BYTES) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const activeBudget = getActiveBudget();
    activeBudget.referenceImage = String(reader.result || "");
    activeBudget.referenceImageName = imageFile.name;
    saveAppState();
    renderReferencePreview();
  });
  reader.readAsDataURL(imageFile);
}

function removeReferenceImage() {
  const activeBudget = getActiveBudget();
  activeBudget.referenceImage = "";
  activeBudget.referenceImageName = "";
  dom.referenceImageInput.value = "";
  saveAppState();
  renderReferencePreview();
}

function createNewBudget() {
  const newBudget = {
    ...DEFAULT_BUDGET,
    id: createId("budget"),
    items: []
  };
  appState.budgets.unshift(newBudget);
  appState.activeBudgetId = newBudget.id;
  saveAppState();
  renderBudget();
}

function addItemToBudget(itemId, rawQuantity) {
  const inventoryItem = findInventoryItem(itemId);

  if (!inventoryItem) {
    return;
  }

  const activeBudget = getActiveBudget();
  const quantityUsed = sanitizeUsageQuantity(inventoryItem, rawQuantity, getMinimumQuantity(inventoryItem));
  const existingCartItem = activeBudget.items.find((cartItem) => cartItem.inventoryItemId === itemId);

  if (existingCartItem) {
    existingCartItem.quantityUsed = sanitizeUsageQuantity(inventoryItem, existingCartItem.quantityUsed + quantityUsed, getMinimumQuantity(inventoryItem));
  } else {
    activeBudget.items.push({
      id: createId("cart"),
      inventoryItemId: itemId,
      quantityUsed
    });
  }

  saveAppState();
  renderBudget();
}

function adjustCartQuantity(cartItemId, action) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);
  const inventoryItem = cartItem ? findInventoryItem(cartItem.inventoryItemId) : null;

  if (!cartItem || !inventoryItem) {
    return;
  }

  const minimumValue = 0;
  const nextQuantity = adjustQuantity(inventoryItem, cartItem.quantityUsed, action, minimumValue);

  if (nextQuantity <= 0) {
    activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  } else {
    cartItem.quantityUsed = nextQuantity;
  }

  saveAppState();
  renderBudget();
}

function updateCartQuantity(cartItemId, rawQuantity) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);
  const inventoryItem = cartItem ? findInventoryItem(cartItem.inventoryItemId) : null;

  if (!cartItem || !inventoryItem) {
    return;
  }

  const quantityUsed = sanitizeUsageQuantity(inventoryItem, rawQuantity, 0);

  if (quantityUsed <= 0) {
    activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  } else {
    cartItem.quantityUsed = quantityUsed;
  }

  saveAppState();
  renderBudget();
}

function removeCartItem(cartItemId) {
  const activeBudget = getActiveBudget();
  activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  saveAppState();
  renderBudget();
}

function adjustQuantity(item, currentValue, action, minimumValue) {
  const rules = getUsageRules(item);
  const signal = action === "decrease" ? -1 : 1;
  const nextValue = normalizeNumber(currentValue) + (rules.step * signal);
  return sanitizeUsageQuantity(item, nextValue, minimumValue);
}

function sanitizeUsageQuantity(item, rawValue, minimumValue) {
  const quantity = normalizeNumber(rawValue);
  const rules = getUsageRules(item);
  const safeQuantity = Math.max(minimumValue, quantity);

  if (rules.integerOnly) {
    return Math.max(minimumValue, Math.round(safeQuantity));
  }

  return roundDecimal(safeQuantity);
}

function getMinimumQuantity(item) {
  return getUsageRules(item).integerOnly ? 1 : DECIMAL_STEP;
}

function getUsageRules(item) {
  const usesDecimal = isDecimalMeasure(item.measureUnit);
  return {
    step: usesDecimal ? DECIMAL_STEP : INTEGER_STEP,
    defaultValue: usesDecimal ? DECIMAL_STEP : INTEGER_STEP,
    inputMode: usesDecimal ? "decimal" : "numeric",
    integerOnly: !usesDecimal
  };
}

function isDecimalMeasure(measureUnit) {
  return [MEASURE_ML, MEASURE_GRAM, MEASURE_METER].includes(measureUnit);
}

function getActiveBudget() {
  let activeBudget = appState.budgets.find((budget) => budget.id === appState.activeBudgetId);

  if (!activeBudget) {
    activeBudget = appState.budgets[0] || { ...DEFAULT_BUDGET, items: [] };
    appState.activeBudgetId = activeBudget.id;
  }

  return activeBudget;
}

function findInventoryItem(itemId) {
  return appState.inventoryItems.find((item) => item.id === itemId) || null;
}

function getFilteredInventoryItems(searchTerm, categoryFilter) {
  const normalizedSearch = normalizeSearch(searchTerm);
  const normalizedCategory = normalizeCategory(categoryFilter);

  return appState.inventoryItems.filter((item) => {
    const matchesCategory = normalizedCategory === CATEGORY_ALL || item.category === normalizedCategory;
    const matchesSearch = !normalizedSearch || normalizeSearch(getSearchIndex(item)).includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
}

function getSearchIndex(item) {
  return [
    item.category,
    item.name,
    item.brand,
    item.lineType,
    item.numbering,
    item.color,
    item.measureUnit,
    getItemSpecification(item)
  ].join(" ");
}

function getBusinessCategories() {
  return CATEGORY_ORDER.filter((categoryName) => categoryName !== CATEGORY_ALL);
}

function countItemsByCategory(categoryName) {
  if (categoryName === CATEGORY_ALL) {
    return appState.inventoryItems.length;
  }

  return appState.inventoryItems.filter((item) => item.category === categoryName).length;
}

function getCounterTotal(categoryName) {
  return categoryName === CATEGORY_ALL ? appState.inventoryItems.length : appState.inventoryItems.length;
}

function calculateUnitCost(item) {
  if (item.category === CATEGORY_DIRECT_UNIT) {
    return normalizeNumber(item.unitPrice || item.packagePrice);
  }

  return calculateRawUnitCost(item.packagePrice, item.packageQuantity);
}

function calculateRawUnitCost(price, quantity) {
  const normalizedPrice = normalizeNumber(price);
  const normalizedQuantity = normalizeNumber(quantity);

  if (normalizedPrice <= 0 || normalizedQuantity <= 0) {
    return 0;
  }

  return normalizedPrice / normalizedQuantity;
}

function calculateTotalInventoryValue(item) {
  return normalizeNumber(item.packagePrice);
}

function calculateLineSubtotal(item, quantityUsed) {
  return calculateUnitCost(item) * normalizeNumber(quantityUsed);
}

function calculateBudgetTotals(budget) {
  const materialCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = findInventoryItem(cartItem.inventoryItemId);
    return inventoryItem ? total + calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const laborCost = normalizeNumber(budget.hourlyRate) * normalizeNumber(budget.sessionDuration);

  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost
  };
}

function getItemSpecification(item) {
  if (item.category === CATEGORY_NEEDLES) {
    return [item.lineType, item.numbering].filter(Boolean).join(" ") || "Sem numeração";
  }

  if (item.category === CATEGORY_LIQUIDS && item.color) {
    return item.color;
  }

  return `${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}`;
}

function getItemSubtitle(item) {
  if (item.category === CATEGORY_NEEDLES) {
    return item.brand || "Marca não informada";
  }

  const brand = item.brand || "Marca não informada";
  const specification = getItemSpecification(item);
  return `${brand} · ${specification}`;
}

function getCalculationDescription(item) {
  if (item.category === CATEGORY_NEEDLES && item.purchaseMode === PURCHASE_MODE_SINGLE) {
    return "Compra avulsa: preço informado já é o custo por cartucho.";
  }

  if (item.category === CATEGORY_NEEDLES) {
    return `Caixa com ${formatNumber(item.packageQuantity)} unidades. Custo calculado por cartucho.`;
  }

  if (item.category === CATEGORY_DIRECT_UNIT) {
    return "Unidade avulsa com custo direto, sem divisão por embalagem.";
  }

  if (item.category === CATEGORY_DISPOSABLES) {
    return `Pacote com ${formatNumber(item.packageQuantity)} unidades. Uso inteiro no orçamento.`;
  }

  return `Embalagem com ${formatNumber(item.packageQuantity)} ${getMeasureLabel(item.measureUnit)}. Uso fracionado no orçamento.`;
}

function getProductInitial(item) {
  const sourceText = item.category === CATEGORY_NEEDLES ? item.lineType || item.name : item.name;
  return sanitizeText(sourceText).slice(0, 2).toUpperCase() || "CT";
}

function getMeasureLabel(measureUnit) {
  const labels = {
    [MEASURE_UNIT]: "unidade",
    [MEASURE_ML]: "ml",
    [MEASURE_GRAM]: "g",
    [MEASURE_METER]: "m",
    [MEASURE_SHEET]: "folha"
  };
  return labels[measureUnit] || measureUnit || "unidade";
}

function getMeasureSuffix(measureUnit) {
  const suffixes = {
    [MEASURE_UNIT]: "un",
    [MEASURE_ML]: "ml",
    [MEASURE_GRAM]: "g",
    [MEASURE_METER]: "m",
    [MEASURE_SHEET]: "fl"
  };
  return suffixes[measureUnit] || "";
}

function normalizeMeasureUnit(unitValue, fallbackUnit = MEASURE_UNIT) {
  const normalizedValue = sanitizeText(unitValue).toLowerCase();
  const unitMap = {
    unidade: MEASURE_UNIT,
    unidades: MEASURE_UNIT,
    unid: MEASURE_UNIT,
    un: MEASURE_UNIT,
    ml: MEASURE_ML,
    mililitro: MEASURE_ML,
    mililitros: MEASURE_ML,
    grama: MEASURE_GRAM,
    gramas: MEASURE_GRAM,
    g: MEASURE_GRAM,
    metro: MEASURE_METER,
    metros: MEASURE_METER,
    m: MEASURE_METER,
    folha: MEASURE_SHEET,
    folhas: MEASURE_SHEET
  };
  return unitMap[normalizedValue] || fallbackUnit;
}

function normalizeCategory(categoryValue) {
  const normalizedValue = sanitizeText(categoryValue).toLowerCase();
  const categoryMap = {
    todos: CATEGORY_ALL,
    cartucho: CATEGORY_NEEDLES,
    cartuchos: CATEGORY_NEEDLES,
    agulha: CATEGORY_NEEDLES,
    agulhas: CATEGORY_NEEDLES,
    "agulhas e cartuchos": CATEGORY_NEEDLES,
    tinta: CATEGORY_LIQUIDS,
    tintas: CATEGORY_LIQUIDS,
    liquidos: CATEGORY_LIQUIDS,
    líquidos: CATEGORY_LIQUIDS,
    "líquidos e pastosos": CATEGORY_LIQUIDS,
    "liquidos e pastosos": CATEGORY_LIQUIDS,
    biossegurança: CATEGORY_DISPOSABLES,
    biosseguranca: CATEGORY_DISPOSABLES,
    descartável: CATEGORY_DISPOSABLES,
    descartavel: CATEGORY_DISPOSABLES,
    descartáveis: CATEGORY_DISPOSABLES,
    descartaveis: CATEGORY_DISPOSABLES,
    "biossegurança e descartáveis": CATEGORY_DISPOSABLES,
    "biosseguranca e descartaveis": CATEGORY_DISPOSABLES,
    "materiais de área/extensão": CATEGORY_LINEAR,
    "materiais de area/extensao": CATEGORY_LINEAR,
    "materiais de área": CATEGORY_LINEAR,
    "materiais de area": CATEGORY_LINEAR,
    rolo: CATEGORY_LINEAR,
    "unidade avulsa direta": CATEGORY_DIRECT_UNIT,
    avulso: CATEGORY_DIRECT_UNIT,
    avulsa: CATEGORY_DIRECT_UNIT,
    outros: CATEGORY_DIRECT_UNIT
  };
  return categoryMap[normalizedValue] || CATEGORY_NEEDLES;
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
  const sanitizedValue = hasComma
    ? compactValue.replace(/\./g, "").replace(",", ".")
    : compactValue;
  const parsedValue = Number.parseFloat(sanitizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeSearch(value) {
  return sanitizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function roundDecimal(value) {
  return Math.round((normalizeNumber(value) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(normalizeNumber(value));
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(normalizeNumber(value));
}

function formatEditableNumber(value) {
  const normalizedValue = normalizeNumber(value);
  return normalizedValue > 0 ? String(roundDecimal(normalizedValue)).replace(".", ",") : "";
}

function formatCounter(currentValue, totalValue) {
  return `${normalizeNumber(currentValue)} de ${normalizeNumber(totalValue)}`;
}

function formatCompactCount(value) {
  return String(normalizeNumber(value));
}

function formatItemsCounter(currentValue, totalValue) {
  const current = normalizeNumber(currentValue);
  const total = normalizeNumber(totalValue);

  if (current === total) {
    return `${total} ${total === 1 ? "item" : "itens"}`;
  }

  return `${current} ${current === 1 ? "item" : "itens"} filtrado${current === 1 ? "" : "s"}`;
}

function createEmptyStateHtml(message) {
  return `
    <article class="empty-state">
      <strong>${escapeHtml(message)}</strong>
      <span>Use a busca, altere o filtro ou cadastre um novo item.</span>
    </article>
  `;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function isImageDataUrl(value) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

function exportPdf() {
  dom.invoiceDocument.innerHTML = createInvoiceHtml();
  requestAnimationFrame(() => window.print());
}

function createInvoiceHtml() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);
  const itemRows = activeBudget.items.map((cartItem) => {
    const inventoryItem = findInventoryItem(cartItem.inventoryItemId);

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
  const referenceImageHtml = activeBudget.referenceImage
    ? `<img class="invoice-reference-image" src="${escapeAttribute(activeBudget.referenceImage)}" alt="Referência da tatuagem" />`
    : `<div class="invoice-reference-placeholder">Sem imagem de referência</div>`;

  return `
    <article class="invoice-page">
      <header class="invoice-header">
        <div>
          <span>CalculadoraTattoo</span>
          <h1>${escapeHtml(activeBudget.name || "Orçamento")}</h1>
          <p>Cliente: <strong>${escapeHtml(activeBudget.clientName || "Não informado")}</strong></p>
        </div>
        ${referenceImageHtml}
      </header>

      <section class="invoice-summary-grid">
        <div><span>Insumos</span><strong>${formatCurrency(totals.materialCost)}</strong></div>
        <div><span>Mão de obra</span><strong>${formatCurrency(totals.laborCost)}</strong></div>
        <div><span>Total</span><strong>${formatCurrency(totals.totalCost)}</strong></div>
      </section>

      <section class="invoice-labor-line">
        <strong>Mão de obra:</strong>
        ${formatNumber(activeBudget.sessionDuration)} h × ${formatCurrency(activeBudget.hourlyRate)} = ${formatCurrency(totals.laborCost)}
      </section>

      <table class="invoice-table">
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
        <tbody>${itemRows || `<tr><td colspan="6">Nenhum item selecionado.</td></tr>`}</tbody>
      </table>

      <footer class="invoice-footer">
        <span>Orçamento gerado localmente no navegador.</span>
        <strong>Total final: ${formatCurrency(totals.totalCost)}</strong>
      </footer>
    </article>
  `;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
