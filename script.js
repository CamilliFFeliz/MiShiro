const STORAGE_KEY = "CALCULADORA_TATTOO_LOCAL_STATE_V1";
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});
const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2
});
const DESKTOP_MEDIA_QUERY = window.matchMedia("(min-width: 1024px)");
const CATEGORY_ALL_VALUE = "Todos";
const CATEGORY_CARTUCHO = "Cartucho";
const CATEGORY_TINTA = "Tinta";
const CATEGORY_BIOSSEGURANCA = "Biossegurança";
const CATEGORY_DESCARTAVEL = "Descartável";
const CATEGORY_OUTROS = "Outros";
const UNIT_PRICING_MODE = "unit";
const FRACTIONAL_PRICING_MODE = "fractional";
const SCREEN_TITLES = {
  home: "Início",
  inventory: "Estoque",
  budgets: "Orçamentos"
};
const BASE_INVENTORY_CATEGORIES = [
  CATEGORY_ALL_VALUE,
  CATEGORY_CARTUCHO,
  CATEGORY_TINTA,
  CATEGORY_BIOSSEGURANCA,
  CATEGORY_DESCARTAVEL,
  CATEGORY_OUTROS
];
const ITEM_CATEGORY_SCHEMAS = {
  [CATEGORY_CARTUCHO]: {
    title: "Cartucho",
    kicker: "Ficha de cartucho",
    fields: [
      {
        id: "itemBrandInput",
        key: "brand",
        label: "Marca",
        placeholder: "Ex: Electric Ink"
      },
      {
        id: "cartridgeTypeInput",
        key: "cartridgeType",
        label: "Tipo",
        placeholder: "Ex: RL"
      },
      {
        id: "cartridgeNumberInput",
        key: "cartridgeNumber",
        label: "Numeração",
        placeholder: "Ex: 0310"
      }
    ]
  },
  [CATEGORY_BIOSSEGURANCA]: {
    title: "Biossegurança",
    kicker: "Ficha de biossegurança",
    fields: [
      {
        id: "itemBrandInput",
        key: "brand",
        label: "Marca",
        placeholder: "Ex: Supermax"
      },
      {
        id: "itemDescriptionInput",
        key: "description",
        label: "Descrição",
        placeholder: "Ex: Luva nitrílica preta"
      }
    ]
  },
  [CATEGORY_DESCARTAVEL]: {
    title: "Descartável",
    kicker: "Ficha de descartável",
    fields: [
      {
        id: "itemBrandInput",
        key: "brand",
        label: "Marca",
        placeholder: "Ex: Spirit"
      },
      {
        id: "itemDescriptionInput",
        key: "description",
        label: "Descrição",
        placeholder: "Ex: Folha stencil premium"
      }
    ]
  },
  [CATEGORY_TINTA]: {
    title: "Tinta",
    kicker: "Ficha de tinta",
    fields: [
      {
        id: "itemBrandInput",
        key: "brand",
        label: "Marca",
        placeholder: "Ex: Dynamic"
      },
      {
        id: "itemColorInput",
        key: "colorName",
        label: "Coloração",
        placeholder: "Ex: Preto linha"
      }
    ]
  },
  [CATEGORY_OUTROS]: {
    title: "Outros",
    kicker: "Ficha complementar",
    fields: [
      {
        id: "itemBrandInput",
        key: "brand",
        label: "Marca",
        placeholder: "Ex: Marca do insumo"
      },
      {
        id: "itemDescriptionInput",
        key: "description",
        label: "Descrição",
        placeholder: "Ex: Detalhe do item"
      }
    ]
  }
};

const DEFAULT_INVENTORY_ITEMS = [
  {
    id: "item-cartucho-rl0310",
    name: "Cartucho White Head",
    category: CATEGORY_CARTUCHO,
    brand: "White Head",
    cartridgeType: "RL",
    cartridgeNumber: "0310",
    unitMeasure: "unid",
    packageQuantity: 20,
    purchasePrice: 15,
    currentStock: 20,
    pricingMode: UNIT_PRICING_MODE
  },
  {
    id: "item-tinta-preta",
    name: "Tinta preta linha",
    category: CATEGORY_TINTA,
    brand: "Dynamic",
    colorName: "Preto linha",
    unitMeasure: "ml",
    packageQuantity: 30,
    purchasePrice: 100,
    currentStock: 30,
    pricingMode: FRACTIONAL_PRICING_MODE
  },
  {
    id: "item-luvas",
    name: "Luvas nitrílicas",
    category: CATEGORY_BIOSSEGURANCA,
    brand: "Supermax",
    description: "Luva nitrílica preta sem pó",
    unitMeasure: "unid",
    packageQuantity: 100,
    purchasePrice: 50,
    currentStock: 100,
    pricingMode: FRACTIONAL_PRICING_MODE
  },
  {
    id: "item-stencil",
    name: "Folha stencil",
    category: CATEGORY_DESCARTAVEL,
    brand: "Spirit",
    description: "Folha para transferência de stencil",
    unitMeasure: "folhas",
    packageQuantity: 1,
    purchasePrice: 4.5,
    currentStock: 8,
    pricingMode: FRACTIONAL_PRICING_MODE
  }
];

const DEFAULT_BUDGET = {
  id: "budget-default",
  name: "Novo orçamento",
  hourlyRate: 0,
  sessionHours: 0,
  items: []
};

const elementReferences = {};
let applicationState = loadApplicationState();
let activeScreen = "home";
let inventorySearchTerm = "";
let budgetSearchTerm = "";
let activeInventoryCategory = CATEGORY_ALL_VALUE;
let editingInventoryItemId = null;

/**
 * Inicializa a aplicacao, conecta eventos e renderiza a primeira tela.
 * @returns {void}
 */
function initializeApplication() {
  bindElementReferences();
  bindEventListeners();
  syncDrawerForViewport();
  renderApplication();
  registerServiceWorker();
}

/**
 * Armazena referencias dos elementos principais da interface.
 * @returns {void}
 */
function bindElementReferences() {
  elementReferences.budgetNameInput = document.querySelector("#budgetNameInput");
  elementReferences.budgetSearchInput = document.querySelector("#budgetSearchInput");
  elementReferences.budgetTotalValue = document.querySelector("#budgetTotalValue");
  elementReferences.cartList = document.querySelector("#cartList");
  elementReferences.categoryFilterList = document.querySelector("#categoryFilterList");
  elementReferences.categoryDynamicFields = document.querySelector("#categoryDynamicFields");
  elementReferences.categoryFormKicker = document.querySelector("#categoryFormKicker");
  elementReferences.categoryFormTitle = document.querySelector("#categoryFormTitle");
  elementReferences.closeImportModalButton = document.querySelector("#closeImportModalButton");
  elementReferences.closeItemModalButton = document.querySelector("#closeItemModalButton");
  elementReferences.createBudgetButton = document.querySelector("#createBudgetButton");
  elementReferences.currentPageTitle = document.querySelector("#currentPageTitle");
  elementReferences.currentStockInput = document.querySelector("#currentStockInput");
  elementReferences.csvFileInput = document.querySelector("#csvFileInput");
  elementReferences.drawer = document.querySelector("#drawer");
  elementReferences.drawerBackdrop = document.querySelector("#drawerBackdrop");
  elementReferences.drawerLinks = document.querySelectorAll("[data-drawer-action]");
  elementReferences.homeActionButtons = document.querySelectorAll("[data-home-action]");
  elementReferences.exportInvoiceButton = document.querySelector("#exportInvoiceButton");
  elementReferences.budgetItemCounter = document.querySelector("#budgetItemCounter");
  elementReferences.hourlyRateInput = document.querySelector("#hourlyRateInput");
  elementReferences.importFeedback = document.querySelector("#importFeedback");
  elementReferences.importForm = document.querySelector("#importForm");
  elementReferences.importModal = document.querySelector("#importModal");
  elementReferences.inventoryCounter = document.querySelector("#inventoryCounter");
  elementReferences.inventoryGrid = document.querySelector("#inventoryGrid");
  elementReferences.inventorySearchInput = document.querySelector("#inventorySearchInput");
  elementReferences.invoiceDocument = document.querySelector("#invoiceDocument");
  elementReferences.itemCategoryInput = document.querySelector("#itemCategoryInput");
  elementReferences.itemForm = document.querySelector("#itemForm");
  elementReferences.itemModalKicker = document.querySelector("#itemModalKicker");
  elementReferences.itemModalTitle = document.querySelector("#itemModalTitle");
  elementReferences.itemModal = document.querySelector("#itemModal");
  elementReferences.itemNameInput = document.querySelector("#itemNameInput");
  elementReferences.itemSubmitButton = document.querySelector("#itemSubmitButton");
  elementReferences.laborCostValue = document.querySelector("#laborCostValue");
  elementReferences.materialCostValue = document.querySelector("#materialCostValue");
  elementReferences.openDrawerButton = document.querySelector("#openDrawerButton");
  elementReferences.openItemModalButton = document.querySelector("#openItemModalButton");
  elementReferences.packageQuantityInput = document.querySelector("#packageQuantityInput");
  elementReferences.packageQuantityLabel = document.querySelector("#packageQuantityLabel");
  elementReferences.purchasePriceInput = document.querySelector("#purchasePriceInput");
  elementReferences.purchasePriceLabel = document.querySelector("#purchasePriceLabel");
  elementReferences.screens = document.querySelectorAll("[data-screen]");
  elementReferences.sessionHoursInput = document.querySelector("#sessionHoursInput");
  elementReferences.stockPickerList = document.querySelector("#stockPickerList");
  elementReferences.unitCostPreview = document.querySelector("#unitCostPreview");
  elementReferences.unitCostPreviewLabel = document.querySelector("#unitCostPreviewLabel");
  elementReferences.unitMeasureInput = document.querySelector("#unitMeasureInput");
}

/**
 * Conecta os eventos de navegacao, formularios e listas dinamicas.
 * @returns {void}
 */
function bindEventListeners() {
  elementReferences.openDrawerButton.addEventListener("click", openDrawer);
  elementReferences.drawerBackdrop.addEventListener("click", closeDrawer);
  elementReferences.closeItemModalButton.addEventListener("click", () => closeModal(elementReferences.itemModal));
  elementReferences.closeImportModalButton.addEventListener("click", () => closeModal(elementReferences.importModal));
  elementReferences.openItemModalButton.addEventListener("click", () => openItemModal());

  elementReferences.drawerLinks.forEach((drawerLink) => {
    drawerLink.addEventListener("click", () => handleDrawerAction(drawerLink.dataset.drawerAction));
  });

  elementReferences.homeActionButtons.forEach((homeButton) => {
    homeButton.addEventListener("click", () => setActiveScreen(homeButton.dataset.homeAction));
  });

  if (typeof DESKTOP_MEDIA_QUERY.addEventListener === "function") {
    DESKTOP_MEDIA_QUERY.addEventListener("change", syncDrawerForViewport);
  } else {
    DESKTOP_MEDIA_QUERY.addListener(syncDrawerForViewport);
  }

  elementReferences.inventorySearchInput.addEventListener("input", (event) => {
    inventorySearchTerm = event.target.value;
    renderInventory();
  });

  elementReferences.itemCategoryInput.addEventListener("change", handleItemCategoryChange);

  elementReferences.categoryFilterList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category-filter]");

    if (!categoryButton) {
      return;
    }

    setActiveInventoryCategory(categoryButton.dataset.categoryFilter);
  });

  elementReferences.inventoryGrid.addEventListener("click", handleInventoryGridClick);

  elementReferences.budgetSearchInput.addEventListener("input", (event) => {
    budgetSearchTerm = event.target.value;
    renderStockPicker();
  });

  elementReferences.budgetNameInput.addEventListener("input", (event) => {
    getActiveBudget().name = event.target.value;
    saveApplicationState();
    renderBudget();
  });

  [
    elementReferences.hourlyRateInput,
    elementReferences.sessionHoursInput
  ].forEach((inputElement) => {
    inputElement.addEventListener("input", updateBudgetLaborFromForm);
  });

  [
    elementReferences.packageQuantityInput,
    elementReferences.purchasePriceInput,
    elementReferences.unitMeasureInput
  ].forEach((inputElement) => {
    inputElement.addEventListener("input", updateUnitCostPreview);
    inputElement.addEventListener("change", updateUnitCostPreview);
  });

  elementReferences.itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveInventoryItemFromForm();
  });

  elementReferences.importForm.addEventListener("submit", (event) => {
    event.preventDefault();
    importInventoryFromCsv();
  });

  elementReferences.stockPickerList.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-inventory-item]");

    if (!addButton) {
      return;
    }

    const pickerCard = addButton.closest("[data-inventory-item-id]");
    const quantityInput = pickerCard.querySelector("[data-picker-quantity]");
    addItemToBudget(pickerCard.dataset.inventoryItemId, quantityInput.value);
  });

  elementReferences.cartList.addEventListener("input", (event) => {
    if (!event.target.matches("[data-cart-quantity]")) {
      return;
    }

    const cartCard = event.target.closest("[data-cart-item-id]");
    updateBudgetItemQuantity(cartCard.dataset.cartItemId, event.target.value);
  });

  elementReferences.cartList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-cart-item]");

    if (!removeButton) {
      return;
    }

    const cartCard = removeButton.closest("[data-cart-item-id]");
    removeBudgetItem(cartCard.dataset.cartItemId);
  });

  elementReferences.exportInvoiceButton.addEventListener("click", exportInvoicePdf);
  elementReferences.createBudgetButton.addEventListener("click", createNewBudget);
}

/**
 * Atualiza a ficha dinamica e a unidade sugerida ao trocar a categoria no modal.
 * @returns {void}
 */
function handleItemCategoryChange() {
  const selectedCategory = normalizeCategory(elementReferences.itemCategoryInput.value);
  elementReferences.unitMeasureInput.value = getDefaultUnitMeasureForCategory(selectedCategory);
  renderItemCategoryFields(selectedCategory);
  updateUnitCostPreview();
}

/**
 * Trata cliques do CRUD por delegacao no container da lista de estoque.
 * @param {MouseEvent} event Evento de clique capturado no grid pai.
 * @returns {void}
 */
function handleInventoryGridClick(event) {
  const actionButton = event.target.closest("[data-inventory-action]");

  if (!actionButton || !elementReferences.inventoryGrid.contains(actionButton)) {
    return;
  }

  event.preventDefault();

  const inventoryCard = actionButton.closest("[data-inventory-item-id]");
  const inventoryItemId = actionButton.dataset.inventoryItemId || inventoryCard?.dataset.inventoryItemId;

  if (!inventoryItemId) {
    return;
  }

  const optionsMenu = actionButton.closest("details");

  if (optionsMenu) {
    optionsMenu.open = false;
  }

  if (actionButton.dataset.inventoryAction === "edit") {
    openItemModal(inventoryItemId);
    return;
  }

  if (actionButton.dataset.inventoryAction === "delete") {
    deleteInventoryItem(inventoryItemId);
  }
}

/**
 * Executa a acao selecionada no menu lateral.
 * @param {string} actionName Nome semantico da acao do drawer.
 * @returns {void}
 */
function handleDrawerAction(actionName) {
  if (Object.prototype.hasOwnProperty.call(SCREEN_TITLES, actionName)) {
    setActiveScreen(actionName);
  }

  if (actionName === "import") {
    openImportModal();
  }

  if (actionName === "backup") {
    exportBackup();
  }

  if (!DESKTOP_MEDIA_QUERY.matches) {
    closeDrawer();
  } else {
    syncDrawerForViewport();
  }
}

/**
 * Carrega o estado persistido no localStorage.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado normalizado da aplicacao.
 */
function loadApplicationState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return createInitialState();
  }

  try {
    return normalizeApplicationState(JSON.parse(savedState));
  } catch {
    return createInitialState();
  }
}

/**
 * Cria o estado padrao usado na primeira visita.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado inicial.
 */
function createInitialState() {
  return {
    inventoryItems: DEFAULT_INVENTORY_ITEMS.map((item) => ({ ...item })),
    budgets: [{ ...DEFAULT_BUDGET, items: [] }],
    activeBudgetId: DEFAULT_BUDGET.id
  };
}

/**
 * Normaliza um estado bruto vindo do localStorage.
 * @param {object} rawState Estado sem garantias de formato.
 * @returns {{inventoryItems: Array<object>, budgets: Array<object>, activeBudgetId: string}} Estado validado.
 */
function normalizeApplicationState(rawState) {
  const inventoryItems = Array.isArray(rawState.inventoryItems)
    ? rawState.inventoryItems.map(normalizeInventoryItem)
    : DEFAULT_INVENTORY_ITEMS;
  const budgets = Array.isArray(rawState.budgets) && rawState.budgets.length > 0
    ? rawState.budgets.map(normalizeBudget)
    : [DEFAULT_BUDGET];
  const activeBudgetId = budgets.some((budget) => budget.id === rawState.activeBudgetId)
    ? rawState.activeBudgetId
    : budgets[0].id;

  return {
    inventoryItems,
    budgets,
    activeBudgetId
  };
}

/**
 * Normaliza um item de estoque para o formato atual do app.
 * @param {object} item Item bruto de estoque.
 * @returns {object} Item de estoque normalizado.
 */
function normalizeInventoryItem(item) {
  const normalizedCategory = normalizeCategory(item.category);
  const packageQuantity = normalizeNumber(item.packageQuantity);
  const currentStock = normalizeNumber(item.currentStock);
  const rawPurchasePrice = normalizeNumber(item.purchasePrice || item.packagePrice || item.valor);
  const pricingMode = isCartridgeCategory(normalizedCategory) ? UNIT_PRICING_MODE : FRACTIONAL_PRICING_MODE;

  return {
    id: item.id || createEntityId("item"),
    name: String(item.name || "Novo item"),
    category: normalizedCategory,
    pricingMode,
    brand: String(item.brand || item.marca || ""),
    description: String(item.description || item.descricao || ""),
    cartridgeType: String(item.cartridgeType || item.tipo || ""),
    cartridgeNumber: String(item.cartridgeNumber || item.numbering || item.numeracao || ""),
    colorName: String(item.colorName || item.coloration || item.coloracao || ""),
    unitMeasure: normalizeUnitMeasure(item.unitMeasure || item.unitLabel || item.tipoUnidade || "unid"),
    packageQuantity,
    purchasePrice: normalizePurchasePriceForPricingMode(item, normalizedCategory, packageQuantity, rawPurchasePrice),
    currentStock: currentStock > 0 ? currentStock : packageQuantity,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
  };
}
/**
 * Normaliza um orcamento salvo ou importado.
 * @param {object} budget Orcamento bruto.
 * @returns {object} Orcamento normalizado.
 */
function normalizeBudget(budget) {
  return {
    id: budget.id || createEntityId("budget"),
    name: String(budget.name || budget.projectName || "Novo orçamento"),
    hourlyRate: normalizeNumber(budget.hourlyRate ?? budget.laborHourlyRate ?? budget.valorMaoDeObra),
    sessionHours: normalizeNumber(budget.sessionHours ?? budget.laborHours ?? budget.tempoSessao),
    items: Array.isArray(budget.items) ? budget.items.map(normalizeBudgetItem) : []
  };
}

/**
 * Normaliza um item selecionado dentro do orcamento.
 * @param {object} item Item bruto do carrinho/orcamento.
 * @returns {object} Item de orcamento normalizado.
 */
function normalizeBudgetItem(item) {
  return {
    id: item.id || createEntityId("cart"),
    inventoryItemId: item.inventoryItemId,
    quantityUsed: normalizeNumber(item.quantityUsed)
  };
}

/**
 * Persiste o estado atual no localStorage.
 * @returns {void}
 */
function saveApplicationState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationState));
}

/**
 * Renderiza todas as areas dependentes do estado.
 * @returns {void}
 */
function renderApplication() {
  renderActiveScreen();
  renderCategoryFilters();
  renderInventory();
  renderBudget();
  renderItemCategoryFields(elementReferences.itemCategoryInput.value);
  updateUnitCostPreview();
}

/**
 * Alterna a tela ativa e sincroniza titulo, FAB e menu lateral.
 * @returns {void}
 */
function renderActiveScreen() {
  elementReferences.screens.forEach((screenElement) => {
    screenElement.classList.toggle("is-active", screenElement.dataset.screen === activeScreen);
  });

  elementReferences.drawerLinks.forEach((drawerLink) => {
    drawerLink.classList.toggle("is-active", drawerLink.dataset.drawerAction === activeScreen);
  });

  elementReferences.currentPageTitle.textContent = SCREEN_TITLES[activeScreen] || "CalculadoraTattoo";
  elementReferences.openItemModalButton.hidden = activeScreen !== "inventory";
}

/**
 * Renderiza a vitrine de estoque com base na busca atual.
 * @returns {void}
 */
function renderInventory() {
  const filteredItems = getFilteredInventoryItems(inventorySearchTerm, activeInventoryCategory);
  elementReferences.inventoryCounter.textContent = formatCounter(filteredItems.length, applicationState.inventoryItems.length);

  if (filteredItems.length === 0) {
    elementReferences.inventoryGrid.innerHTML = createEmptyStateHtml("Nenhum insumo encontrado.");
    return;
  }

  elementReferences.inventoryGrid.innerHTML = filteredItems.map(createInventoryCardHtml).join("");
}

/**
 * Renderiza os chips de filtro por categoria do estoque.
 * @returns {void}
 */
function renderCategoryFilters() {
  const categories = getInventoryCategories();

  if (!categories.includes(activeInventoryCategory)) {
    activeInventoryCategory = CATEGORY_ALL_VALUE;
  }

  elementReferences.categoryFilterList.innerHTML = categories.map((categoryName) => {
    const categoryTotal = countInventoryItemsByCategory(categoryName);
    const isActive = categoryName === activeInventoryCategory;

    return `
      <button class="filter-chip ${isActive ? "is-active" : ""}" type="button" data-category-filter="${escapeHtml(categoryName)}">
        <span>${escapeHtml(categoryName)}</span>
        <strong>${formatCounter(categoryTotal, applicationState.inventoryItems.length)}</strong>
      </button>
    `;
  }).join("");
}

/**
 * Renderiza os campos especificos da categoria selecionada no modal.
 * @param {string} categoryName Categoria selecionada.
 * @returns {void}
 */
function renderItemCategoryFields(categoryName) {
  const normalizedCategory = normalizeCategory(categoryName);
  const schema = ITEM_CATEGORY_SCHEMAS[normalizedCategory] || ITEM_CATEGORY_SCHEMAS[CATEGORY_OUTROS];

  elementReferences.categoryFormKicker.textContent = schema.kicker;
  elementReferences.categoryFormTitle.textContent = schema.title;
  elementReferences.categoryDynamicFields.innerHTML = schema.fields.map(createDynamicFieldHtml).join("");
  updatePricingLabels(normalizedCategory);
}

/**
 * Cria o HTML de um campo dinamico do cadastro de item.
 * @param {{id: string, label: string, placeholder: string}} fieldDefinition Definicao do campo.
 * @returns {string} HTML seguro do campo.
 */
function createDynamicFieldHtml(fieldDefinition) {
  return `
    <label class="form-field">
      <span>${escapeHtml(fieldDefinition.label)}</span>
      <input id="${escapeHtml(fieldDefinition.id)}" type="text" placeholder="${escapeHtml(fieldDefinition.placeholder)}" data-dynamic-item-field />
    </label>
  `;
}

/**
 * Atualiza os textos de preco e quantidade conforme a categoria selecionada.
 * Cartucho usa preco unitario fixo; as demais categorias usam custo fracionado.
 * @param {string} categoryName Categoria ativa no formulario.
 * @returns {void}
 */
function updatePricingLabels(categoryName) {
  const normalizedCategory = normalizeCategory(categoryName);
  const unitMeasure = normalizeUnitMeasure(elementReferences.unitMeasureInput.value);

  if (isCartridgeCategory(normalizedCategory)) {
    elementReferences.purchasePriceLabel.textContent = "Valor unitário do cartucho";
    elementReferences.packageQuantityLabel.textContent = "Quantidade em estoque";
    elementReferences.unitCostPreviewLabel.textContent = "Preço por cartucho";
    return;
  }

  elementReferences.purchasePriceLabel.textContent = "Valor da embalagem/frasco";
  elementReferences.packageQuantityLabel.textContent = `Quantidade total (${unitMeasure})`;
  elementReferences.unitCostPreviewLabel.textContent = `Custo por ${unitMeasure}`;
}

/**
 * Cria o HTML de um card premium de estoque.
 * @param {object} item Item de estoque normalizado.
 * @returns {string} HTML seguro do card.
 */
function createInventoryCardHtml(item) {
  const unitCost = calculateUnitCost(item);
  const stockPercentage = calculateStockPercentage(item);
  const stockStatus = getStockStatus(stockPercentage);
  const productInitial = getProductInitial(item.name);
  const itemMetaLabel = getInventoryItemMetaLabel(item);
  const brandLabel = getInventoryItemBrandLabel(item);
  const unitCostTitle = getUnitCostTitle(item);
  const packageQuantityLabel = getPackageQuantityLabel(item);
  const secondaryMetricHtml = createInventorySecondaryMetricHtml(item);
  const stockMeterHtml = createStockMeterHtml(item, stockPercentage, stockStatus);

  return `
    <article class="inventory-card ${stockStatus.className}" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="product-topline">
        <div class="product-tags">
          <span class="category-pill">${escapeHtml(item.category)}</span>
          <span class="unit-tag">por ${escapeHtml(item.unitMeasure)}</span>
        </div>
        <details class="product-options">
          <summary aria-label="Abrir opções do item">⋯</summary>
          <div class="product-options-menu">
            <button type="button" data-inventory-action="edit" data-inventory-item-id="${escapeHtml(item.id)}">Editar</button>
            <button type="button" data-inventory-action="delete" data-inventory-item-id="${escapeHtml(item.id)}">Excluir</button>
          </div>
        </details>
      </div>

      <div class="product-card-hero">
        <div class="product-mark" aria-hidden="true">${escapeHtml(productInitial)}</div>
        <div class="product-title">
          <h3>${escapeHtml(item.name)}</h3>
          <span>${escapeHtml(brandLabel)}</span>
          <strong class="product-meta-line">${escapeHtml(itemMetaLabel)}</strong>
          <small>${escapeHtml(packageQuantityLabel)}</small>
        </div>
      </div>

      <div class="product-details-grid">
        <div class="unit-price is-featured">
          <span>${escapeHtml(unitCostTitle)}</span>
          <strong>${formatCurrency(unitCost)}</strong>
        </div>
        ${secondaryMetricHtml}
      </div>

      ${stockMeterHtml}
    </article>
  `;
}
/**
 * Cria a metrica secundaria do card de estoque.
 * Cartucho nao usa contador progressivo de estoque, pois o valor unitario e fixo.
 * @param {object} item Item de estoque.
 * @returns {string} HTML da metrica secundaria.
 */
function createInventorySecondaryMetricHtml(item) {
  if (isCartridgeCategory(item.category)) {
    const stockValue = calculateInventoryStockValue(item);

    return `
        <div class="unit-price">
          <span>Valor total em estoque</span>
          <strong>${formatCurrency(stockValue)}</strong>
          <small>${escapeHtml(getStockAvailabilityLabel(item))}</small>
        </div>`;
  }

  const stockCounterTotal = Math.max(normalizeNumber(item.currentStock), normalizeNumber(item.packageQuantity));

  return `
        <div class="unit-price">
          <span>Estoque</span>
          <strong>${formatCounter(item.currentStock, stockCounterTotal)}</strong>
          <small>${escapeHtml(getStockAvailabilityLabel(item))}</small>
        </div>`;
}

/**
 * Cria a barra de status do estoque.
 * @param {object} item Item de estoque.
 * @param {number} stockPercentage Percentual calculado.
 * @param {{className: string, label: string}} stockStatus Status visual.
 * @returns {string} HTML da barra ou resumo de estoque.
 */
function createStockMeterHtml(item, stockPercentage, stockStatus) {
  if (isCartridgeCategory(item.category)) {
    return `
      <div class="stock-meter stock-meter-compact">
        <div class="stock-meter-text">
          <span>Estoque físico</span>
          <strong>${escapeHtml(getStockAvailabilityLabel(item))}</strong>
        </div>
      </div>`;
  }

  return `
      <div class="stock-meter">
        <div class="stock-meter-text">
          <span>${escapeHtml(stockStatus.label)}</span>
          <strong>${formatNumber(stockPercentage)}%</strong>
        </div>
        <span class="stock-meter-track">
          <span class="stock-meter-fill" style="width: ${stockPercentage}%"></span>
        </span>
      </div>`;
}

/**
 * Renderiza os dados resumidos do orcamento ativo.
 * @returns {void}
 */
function renderBudget() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);

  elementReferences.budgetNameInput.value = activeBudget.name;
  elementReferences.hourlyRateInput.value = formatEditableNumber(activeBudget.hourlyRate);
  elementReferences.sessionHoursInput.value = formatEditableNumber(activeBudget.sessionHours);
  renderBudgetTotals(totals);
  renderStockPicker();
  renderCart();
}

/**
 * Renderiza os totais financeiros do orcamento ativo.
 * @param {{materialCost: number, laborCost: number, totalCost: number}} totals Totais calculados.
 * @returns {void}
 */
function renderBudgetTotals(totals) {
  elementReferences.materialCostValue.textContent = formatCurrency(totals.materialCost);
  elementReferences.laborCostValue.textContent = formatCurrency(totals.laborCost);
  elementReferences.budgetTotalValue.textContent = formatCurrency(totals.totalCost);
}

/**
 * Renderiza os itens de estoque disponiveis para adicionar ao orcamento.
 * @returns {void}
 */
function renderStockPicker() {
  const filteredItems = getFilteredInventoryItems(budgetSearchTerm, CATEGORY_ALL_VALUE);

  if (filteredItems.length === 0) {
    elementReferences.stockPickerList.innerHTML = createEmptyStateHtml("Nenhum item disponível no estoque.");
    return;
  }

  elementReferences.stockPickerList.innerHTML = filteredItems.map((item) => {
    const unitCost = calculateUnitCost(item);
    const productInitial = getProductInitial(item.name);
    const stockStatus = getStockStatus(calculateStockPercentage(item));
    const itemMetaLabel = getInventoryItemMetaLabel(item);
    const unitCostLabel = getUnitCostInlineLabel(item);
    const stockAvailabilityLabel = getStockAvailabilityLabel(item);
    const usageLabel = getUsageLabel(item);

    return `
    <article class="picker-card ${stockStatus.className}" data-inventory-item-id="${escapeHtml(item.id)}">
      <div class="picker-card-main">
        <div class="product-mark product-mark-small" aria-hidden="true">${escapeHtml(productInitial)}</div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span>${escapeHtml(item.category)} · ${escapeHtml(itemMetaLabel)}</span>
          <span>${escapeHtml(unitCostLabel)}</span>
        </div>
      </div>

      <div class="picker-meta-row">
        <span class="stock-availability-pill">${escapeHtml(stockAvailabilityLabel)}</span>
      </div>

      <div class="picker-action-row">
        <label class="compact-field">
          <span>${escapeHtml(usageLabel)}</span>
          <input data-picker-quantity type="text" inputmode="decimal" placeholder="0" />
        </label>
        <button class="primary-button" type="button" data-add-inventory-item>Adicionar</button>
      </div>
    </article>
    `;
  }).join("");
}

/**
 * Renderiza os itens ja adicionados ao orcamento ativo.
 * @returns {void}
 */
function renderCart() {
  const activeBudget = getActiveBudget();
  const visibleItems = activeBudget.items
    .map((cartItem) => ({
      cartItem,
      inventoryItem: findInventoryItemById(cartItem.inventoryItemId)
    }))
    .filter((entry) => entry.inventoryItem);
  elementReferences.budgetItemCounter.textContent = formatCounter(visibleItems.length, activeBudget.items.length);

  if (visibleItems.length === 0) {
    elementReferences.cartList.innerHTML = createEmptyStateHtml("Nenhum item no orçamento.");
    return;
  }

  elementReferences.cartList.innerHTML = visibleItems.map(({ cartItem, inventoryItem }) => {
    const unitCost = calculateUnitCost(inventoryItem);
    const subtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);
    const itemMetaLabel = getInventoryItemMetaLabel(inventoryItem);
    const unitCostLabel = getUnitCostInlineLabel(inventoryItem);
    const usageLabel = getUsageLabel(inventoryItem);

    return `
      <article class="cart-card" data-cart-item-id="${escapeHtml(cartItem.id)}">
        <div class="cart-card-header">
          <div>
            <h3>${escapeHtml(inventoryItem.name)}</h3>
            <span>${escapeHtml(inventoryItem.category)} · ${escapeHtml(itemMetaLabel)}</span>
          </div>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>

        <div class="cart-calculation">
          <span>${escapeHtml(unitCostLabel)}</span>
          <span>x</span>
          <span>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(getUsageUnitLabel(inventoryItem))}</span>
        </div>

        <label class="cart-quantity-field">
          <span>${escapeHtml(usageLabel)}</span>
          <input class="cart-quantity-input" data-cart-quantity type="text" inputmode="decimal" value="${escapeHtml(formatEditableNumber(cartItem.quantityUsed))}" />
        </label>

        <button class="danger-button" type="button" data-remove-cart-item>Remover</button>
      </article>
    `;
  }).join("");
}

/**
 * Abre o menu lateral em telas moveis.
 * @returns {void}
 */
function openDrawer() {
  elementReferences.drawer.classList.add("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "false");
  elementReferences.drawerBackdrop.hidden = false;
}

/**
 * Fecha o menu lateral em telas moveis.
 * @returns {void}
 */
function closeDrawer() {
  elementReferences.drawer.classList.remove("is-open");
  elementReferences.drawer.setAttribute("aria-hidden", "true");
  elementReferences.drawerBackdrop.hidden = true;
}

/**
 * Sincroniza o estado acessivel do drawer conforme o tamanho da tela.
 * @returns {void}
 */
function syncDrawerForViewport() {
  if (DESKTOP_MEDIA_QUERY.matches) {
    elementReferences.drawer.classList.remove("is-open");
    elementReferences.drawer.setAttribute("aria-hidden", "false");
    elementReferences.drawerBackdrop.hidden = true;
    return;
  }

  elementReferences.drawer.setAttribute("aria-hidden", elementReferences.drawer.classList.contains("is-open") ? "false" : "true");
}

/**
 * Define a tela ativa da SPA.
 * @param {string} screenName Nome da tela alvo.
 * @returns {void}
 */
function setActiveScreen(screenName) {
  activeScreen = screenName;
  renderActiveScreen();
}

/**
 * Abre o modal de cadastro ou edicao de insumo.
 * @param {string=} inventoryItemId Identificador opcional para edicao.
 * @returns {void}
 */
function openItemModal(inventoryItemId) {
  const inventoryItem = inventoryItemId ? findInventoryItemById(inventoryItemId) : null;

  if (inventoryItem) {
    populateItemFormForEditing(inventoryItem);
  } else {
    resetItemFormForCreation();
  }

  updateUnitCostPreview();
  openModal(elementReferences.itemModal);
  elementReferences.itemNameInput.focus();
}

/**
 * Prepara o formulario de insumo para criar um novo registro.
 * @returns {void}
 */
function resetItemFormForCreation() {
  editingInventoryItemId = null;
  elementReferences.itemForm.reset();
  elementReferences.itemCategoryInput.value = CATEGORY_CARTUCHO;
  elementReferences.unitMeasureInput.value = "unid";
  elementReferences.currentStockInput.value = "";
  renderItemCategoryFields(elementReferences.itemCategoryInput.value);
  elementReferences.itemModalKicker.textContent = "Novo insumo";
  elementReferences.itemModalTitle.textContent = "Adicionar item";
  elementReferences.itemSubmitButton.textContent = "Salvar item";
}

/**
 * Preenche o formulario de insumo com dados de um item existente.
 * @param {object} inventoryItem Item de estoque que sera editado.
 * @returns {void}
 */
function populateItemFormForEditing(inventoryItem) {
  editingInventoryItemId = inventoryItem.id;
  ensureCategoryOptionExists(inventoryItem.category);
  elementReferences.itemNameInput.value = inventoryItem.name;
  elementReferences.itemCategoryInput.value = inventoryItem.category;
  renderItemCategoryFields(inventoryItem.category);
  populateDynamicItemFields(inventoryItem);
  elementReferences.packageQuantityInput.value = formatEditableNumber(inventoryItem.packageQuantity);
  elementReferences.unitMeasureInput.value = inventoryItem.unitMeasure;
  elementReferences.purchasePriceInput.value = formatEditableNumber(inventoryItem.purchasePrice);
  elementReferences.currentStockInput.value = formatEditableNumber(inventoryItem.currentStock);
  elementReferences.itemModalKicker.textContent = "Editar insumo";
  elementReferences.itemModalTitle.textContent = "Atualizar item";
  elementReferences.itemSubmitButton.textContent = "Salvar alterações";
}
/**
 * Garante que uma categoria existente no estoque apareca no select de edicao.
 * @param {string} categoryName Categoria que precisa estar disponivel.
 * @returns {void}
 */
function ensureCategoryOptionExists(categoryName) {
  const normalizedCategory = normalizeCategory(categoryName);
  const categoryExists = [...elementReferences.itemCategoryInput.options]
    .some((optionElement) => optionElement.value === normalizedCategory);

  if (categoryExists) {
    return;
  }

  const categoryOption = document.createElement("option");
  categoryOption.value = normalizedCategory;
  categoryOption.textContent = normalizedCategory;
  elementReferences.itemCategoryInput.append(categoryOption);
}

/**
 * Preenche os campos dinamicos do modal conforme os metadados do item.
 * @param {object} inventoryItem Item usado na edicao.
 * @returns {void}
 */
function populateDynamicItemFields(inventoryItem) {
  setDynamicFieldValue("itemBrandInput", inventoryItem.brand);
  setDynamicFieldValue("itemDescriptionInput", inventoryItem.description);
  setDynamicFieldValue("cartridgeTypeInput", inventoryItem.cartridgeType);
  setDynamicFieldValue("cartridgeNumberInput", inventoryItem.cartridgeNumber);
  setDynamicFieldValue("itemColorInput", inventoryItem.colorName);
}

/**
 * Define o valor de um campo dinamico se ele existir na ficha atual.
 * @param {string} fieldId Identificador do campo.
 * @param {string} value Valor a ser aplicado.
 * @returns {void}
 */
function setDynamicFieldValue(fieldId, value) {
  const fieldElement = elementReferences.itemForm.querySelector(`#${fieldId}`);

  if (fieldElement) {
    fieldElement.value = value || "";
  }
}

/**
 * Obtem valor de um campo dinamico, retornando texto vazio quando ele nao existe.
 * @param {string} fieldId Identificador do campo.
 * @returns {string} Valor normalizado para persistencia.
 */
function getDynamicFieldValue(fieldId) {
  const fieldElement = elementReferences.itemForm.querySelector(`#${fieldId}`);
  return fieldElement ? fieldElement.value.trim() : "";
}

/**
 * Monta metadados especificos da ficha dinamica selecionada.
 * @returns {{brand: string, description: string, cartridgeType: string, cartridgeNumber: string, colorName: string}} Metadados do item.
 */
function getDynamicMetadataFromForm() {
  return {
    brand: getDynamicFieldValue("itemBrandInput"),
    description: getDynamicFieldValue("itemDescriptionInput"),
    cartridgeType: getDynamicFieldValue("cartridgeTypeInput").toUpperCase(),
    cartridgeNumber: getDynamicFieldValue("cartridgeNumberInput"),
    colorName: getDynamicFieldValue("itemColorInput")
  };
}

/**
 * Abre o modal de importacao CSV.
 * @returns {void}
 */
function openImportModal() {
  elementReferences.importForm.reset();
  elementReferences.importFeedback.textContent = formatCounter(0, 0);
  openModal(elementReferences.importModal);
}

/**
 * Abre um dialog, com fallback para navegadores sem showModal.
 * @param {HTMLDialogElement} modalElement Dialog que sera aberto.
 * @returns {void}
 */
function openModal(modalElement) {
  if (typeof modalElement.showModal === "function") {
    modalElement.showModal();
    return;
  }

  modalElement.setAttribute("open", "");
}

/**
 * Fecha um dialog, com fallback para navegadores sem close.
 * @param {HTMLDialogElement} modalElement Dialog que sera fechado.
 * @returns {void}
 */
function closeModal(modalElement) {
  if (typeof modalElement.close === "function" && modalElement.open) {
    modalElement.close();
    return;
  }

  modalElement.removeAttribute("open");
}

/**
 * Salva um insumo novo ou atualiza um insumo existente a partir do formulario.
 * @returns {void}
 */
function saveInventoryItemFromForm() {
  const selectedCategory = normalizeCategory(elementReferences.itemCategoryInput.value);
  const packageQuantity = normalizeNumber(elementReferences.packageQuantityInput.value);
  const hiddenCurrentStock = normalizeNumber(elementReferences.currentStockInput.value);
  const existingItem = editingInventoryItemId ? findInventoryItemById(editingInventoryItemId) : null;
  const dynamicMetadata = getDynamicMetadataFromForm();
  const shouldSyncStockWithQuantity = isCartridgeCategory(selectedCategory) || !existingItem || hiddenCurrentStock <= 0;
  const inventoryItem = {
    id: editingInventoryItemId || createEntityId("item"),
    name: elementReferences.itemNameInput.value.trim(),
    category: selectedCategory,
    pricingMode: isCartridgeCategory(selectedCategory) ? UNIT_PRICING_MODE : FRACTIONAL_PRICING_MODE,
    ...dynamicMetadata,
    unitMeasure: normalizeUnitMeasure(elementReferences.unitMeasureInput.value),
    packageQuantity,
    purchasePrice: normalizeNumber(elementReferences.purchasePriceInput.value),
    currentStock: shouldSyncStockWithQuantity ? packageQuantity : hiddenCurrentStock,
    createdAt: existingItem?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!inventoryItem.name || inventoryItem.packageQuantity <= 0 || inventoryItem.purchasePrice <= 0) {
    elementReferences.itemForm.reportValidity();
    return;
  }

  if (editingInventoryItemId) {
    updateInventoryItem(inventoryItem);
  } else {
    applicationState.inventoryItems.unshift(inventoryItem);
  }

  saveApplicationState();
  closeModal(elementReferences.itemModal);
  editingInventoryItemId = null;
  renderCategoryFilters();
  renderApplication();
}
/**
 * Atualiza um insumo existente no estado local.
 * @param {object} updatedItem Item de estoque com dados atualizados.
 * @returns {void}
 */
function updateInventoryItem(updatedItem) {
  applicationState.inventoryItems = applicationState.inventoryItems.map((inventoryItem) => (
    inventoryItem.id === updatedItem.id
      ? {
        ...inventoryItem,
        ...updatedItem,
        createdAt: inventoryItem.createdAt || updatedItem.createdAt
      }
      : inventoryItem
  ));
}

/**
 * Exclui um insumo do estoque e remove suas referencias dos orcamentos.
 * @param {string} inventoryItemId Identificador do insumo.
 * @returns {void}
 */
function deleteInventoryItem(inventoryItemId) {
  const inventoryItem = findInventoryItemById(inventoryItemId);

  if (!inventoryItem) {
    return;
  }

  const shouldDeleteItem = window.confirm(`Excluir "${inventoryItem.name}" do estoque?`);

  if (!shouldDeleteItem) {
    return;
  }

  applicationState.inventoryItems = applicationState.inventoryItems.filter((item) => item.id !== inventoryItemId);
  applicationState.budgets = applicationState.budgets.map((budget) => ({
    ...budget,
    items: budget.items.filter((cartItem) => cartItem.inventoryItemId !== inventoryItemId)
  }));

  saveApplicationState();
  renderApplication();
}

/**
 * Define a categoria ativa usada na filtragem do estoque.
 * @param {string} categoryName Nome da categoria selecionada.
 * @returns {void}
 */
function setActiveInventoryCategory(categoryName) {
  activeInventoryCategory = categoryName || CATEGORY_ALL_VALUE;
  renderCategoryFilters();
  renderInventory();
}

/**
 * Atualiza os dados de mao de obra do orcamento ativo.
 * @returns {void}
 */
function updateBudgetLaborFromForm() {
  const activeBudget = getActiveBudget();

  activeBudget.hourlyRate = normalizeNumber(elementReferences.hourlyRateInput.value);
  activeBudget.sessionHours = normalizeNumber(elementReferences.sessionHoursInput.value);
  saveApplicationState();
  renderBudgetTotals(calculateBudgetTotals(activeBudget));
}

/**
 * Atualiza o preview do custo unitario no formulario de estoque.
 * @returns {void}
 */
function updateUnitCostPreview() {
  const selectedCategory = normalizeCategory(elementReferences.itemCategoryInput.value);
  updatePricingLabels(selectedCategory);

  const previewItem = {
    category: selectedCategory,
    packageQuantity: elementReferences.packageQuantityInput.value,
    purchasePrice: elementReferences.purchasePriceInput.value
  };

  elementReferences.unitCostPreview.textContent = formatCurrency(calculateUnitCost(previewItem));
}

/**
 * Adiciona um item de estoque ao orcamento ativo.
 * @param {string} inventoryItemId Identificador do item de estoque.
 * @param {string|number} rawQuantity Quantidade informada pelo usuario.
 * @returns {void}
 */
function addItemToBudget(inventoryItemId, rawQuantity) {
  const inventoryItem = findInventoryItemById(inventoryItemId);
  const quantityUsed = normalizeNumber(rawQuantity);

  if (!inventoryItem || quantityUsed <= 0) {
    return;
  }

  const activeBudget = getActiveBudget();
  const existingItem = activeBudget.items.find((cartItem) => cartItem.inventoryItemId === inventoryItemId);

  if (existingItem) {
    existingItem.quantityUsed += quantityUsed;
  } else {
    activeBudget.items.push({
      id: createEntityId("cart"),
      inventoryItemId,
      quantityUsed
    });
  }

  saveApplicationState();
  renderBudget();
}

/**
 * Atualiza a quantidade usada de um item do orcamento.
 * @param {string} cartItemId Identificador do item no orcamento.
 * @param {string|number} rawQuantity Quantidade digitada.
 * @returns {void}
 */
function updateBudgetItemQuantity(cartItemId, rawQuantity) {
  const activeBudget = getActiveBudget();
  const cartItem = activeBudget.items.find((item) => item.id === cartItemId);

  if (!cartItem) {
    return;
  }

  cartItem.quantityUsed = normalizeNumber(rawQuantity);
  saveApplicationState();
  renderBudget();
}

/**
 * Remove um item do orcamento ativo.
 * @param {string} cartItemId Identificador do item no orcamento.
 * @returns {void}
 */
function removeBudgetItem(cartItemId) {
  const activeBudget = getActiveBudget();
  activeBudget.items = activeBudget.items.filter((item) => item.id !== cartItemId);
  saveApplicationState();
  renderBudget();
}

/**
 * Cria um novo orcamento vazio e o define como ativo.
 * @returns {void}
 */
function createNewBudget() {
  const newBudget = {
    id: createEntityId("budget"),
    name: "Novo orçamento",
    hourlyRate: 0,
    sessionHours: 0,
    items: []
  };

  applicationState.budgets.unshift(newBudget);
  applicationState.activeBudgetId = newBudget.id;
  saveApplicationState();
  renderBudget();
}

/**
 * Le um arquivo CSV local e adiciona os itens importados ao estoque.
 * @returns {void}
 */
function importInventoryFromCsv() {
  const selectedFile = elementReferences.csvFileInput.files[0];

  if (!selectedFile) {
    return;
  }

  const fileReader = new FileReader();

  elementReferences.importFeedback.textContent = formatCounter(0, 0);

  fileReader.onprogress = handleCsvReadProgress;

  fileReader.onload = () => {
    const importedItems = parseCsvInventory(String(fileReader.result || ""));
    applicationState.inventoryItems = [...importedItems, ...applicationState.inventoryItems];
    saveApplicationState();
    elementReferences.importFeedback.textContent = `${formatCounter(importedItems.length, importedItems.length)} itens importados`;
    renderApplication();
  };

  fileReader.readAsText(selectedFile, "utf-8");
}

/**
 * Atualiza o feedback de progresso da leitura do CSV.
 * @param {ProgressEvent<FileReader>} event Evento de progresso da File API.
 * @returns {void}
 */
function handleCsvReadProgress(event) {
  if (!event.lengthComputable) {
    return;
  }

  elementReferences.importFeedback.textContent = `${formatCounter(event.loaded, event.total)} bytes`;
}

/**
 * Converte texto CSV em itens de estoque normalizados.
 * @param {string} csvText Conteudo bruto do arquivo CSV.
 * @returns {Array<object>} Lista de itens importaveis.
 */
function parseCsvInventory(csvText) {
  const rows = parseCsvRows(csvText).filter((row) => row.some(Boolean));
  const headerRow = rows[0] || [];
  const hasHeader = headerRow.some((cell) => normalizeSearchText(cell).includes("nome"));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const itemName = row[0] || "Item importado";
    const packageQuantity = normalizeNumber(row[2] || row[1]);
    const currentStock = normalizeNumber(row[5] || packageQuantity);

    return {
      id: createEntityId("item"),
      name: itemName,
      category: normalizeCategory(row[1] || CATEGORY_OUTROS),
      pricingMode: isCartridgeCategory(row[1] || CATEGORY_OUTROS) ? UNIT_PRICING_MODE : FRACTIONAL_PRICING_MODE,
      packageQuantity,
      unitMeasure: normalizeUnitMeasure(row[3] || "unid"),
      purchasePrice: normalizeNumber(row[4]),
      currentStock: currentStock > 0 ? currentStock : packageQuantity,
      brand: row[6] || "",
      description: row[7] || "",
      cartridgeType: String(row[8] || "").toUpperCase(),
      cartridgeNumber: row[9] || "",
      colorName: row[10] || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }).filter((item) => item.packageQuantity > 0);
}
/**
 * Quebra o conteudo CSV em linhas e celulas simples.
 * @param {string} csvText Conteudo bruto do CSV.
 * @returns {Array<Array<string>>} Linhas e colunas do CSV.
 */
function parseCsvRows(csvText) {
  const delimiter = csvText.includes(";") ? ";" : ",";
  return csvText
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

/**
 * Exporta o estado atual como arquivo JSON de backup.
 * @returns {void}
 */
function exportBackup() {
  const backupBlob = new Blob([JSON.stringify(applicationState, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const anchorElement = document.createElement("a");

  anchorElement.href = downloadUrl;
  anchorElement.download = `calculadora-tattoo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchorElement.click();
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Prepara o template de invoice e aciona a impressao/PDF do navegador.
 * @returns {void}
 */
function exportInvoicePdf() {
  renderInvoiceDocument();
  window.print();
}

/**
 * Renderiza o documento oculto usado na exportacao em PDF.
 * @returns {void}
 */
function renderInvoiceDocument() {
  const activeBudget = getActiveBudget();
  const totals = calculateBudgetTotals(activeBudget);
  const materialEntries = activeBudget.items
    .map((cartItem) => ({
      cartItem,
      inventoryItem: findInventoryItemById(cartItem.inventoryItemId)
    }))
    .filter((entry) => entry.inventoryItem);
  const itemRows = materialEntries.map(({ cartItem, inventoryItem }) => {
    const unitCost = calculateUnitCost(inventoryItem);
    const lineSubtotal = calculateLineSubtotal(inventoryItem, cartItem.quantityUsed);
    const specification = getInventoryItemMetaLabel(inventoryItem);
    const brandLabel = getInventoryItemBrandLabel(inventoryItem);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(inventoryItem.name)}</strong>
          <span>${escapeHtml(brandLabel)}</span>
        </td>
        <td>${escapeHtml(inventoryItem.category)}</td>
        <td>${escapeHtml(specification)}</td>
        <td>${formatNumber(cartItem.quantityUsed)} ${escapeHtml(getUsageUnitLabel(inventoryItem))}</td>
        <td>${formatCurrency(unitCost)}</td>
        <td>${formatCurrency(lineSubtotal)}</td>
      </tr>
    `;
  }).join("");

  elementReferences.invoiceDocument.innerHTML = `
    <article class="invoice-template">
      <header class="invoice-header">
        <div class="invoice-logo-space">CT</div>
        <div>
          <span>Orçamento premium</span>
          <h2>${escapeHtml(activeBudget.name)}</h2>
          <p>CalculadoraTattoo · Gestão de estúdio</p>
        </div>
      </header>

      <section class="invoice-summary-grid">
        <div>
          <span>Data</span>
          <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
        </div>
        <div>
          <span>Materiais</span>
          <strong>${formatCounter(materialEntries.length, activeBudget.items.length)}</strong>
        </div>
        <div>
          <span>Insumos utilizados</span>
          <strong>${formatCurrency(totals.materialCost)}</strong>
        </div>
        <div>
          <span>Mão de obra</span>
          <strong>${formatCurrency(totals.laborCost)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>${formatCurrency(totals.totalCost)}</strong>
        </div>
      </section>

      <section class="invoice-labor-panel">
        <span>Mão de obra</span>
        <strong>${formatNumber(activeBudget.sessionHours)} h x ${formatCurrency(activeBudget.hourlyRate)} = ${formatCurrency(totals.laborCost)}</strong>
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
        <tbody>${itemRows || "<tr><td colspan=\"6\">Nenhum item selecionado.</td></tr>"}</tbody>
      </table>

      <section class="invoice-total-panel">
        <span>Resumo financeiro</span>
        <strong>Insumos utilizados: ${formatCurrency(totals.materialCost)}</strong>
        <strong>Mão de obra: ${formatCurrency(totals.laborCost)}</strong>
        <strong>Total do orçamento: ${formatCurrency(totals.totalCost)}</strong>
      </section>
    </article>
  `;
}
/**
 * Calcula o custo unitario de um insumo.
 * @param {object} item Item com preco de compra e quantidade por embalagem.
 * @returns {number} Custo por unidade fracionada.
 */
function calculateUnitCost(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);
  const purchasePrice = normalizeNumber(item.purchasePrice);

  if (isCartridgeCategory(item.category)) {
    return purchasePrice;
  }

  if (packageQuantity <= 0) {
    return 0;
  }

  return purchasePrice / packageQuantity;
}

/**
 * Calcula o subtotal de uma linha do orcamento.
 * @param {object} item Item de estoque usado.
 * @param {string|number} quantityUsed Quantidade usada no orcamento.
 * @returns {number} Subtotal da linha.
 */
function calculateLineSubtotal(item, quantityUsed) {
  return calculateUnitCost(item) * normalizeNumber(quantityUsed);
}

/**
 * Calcula o valor financeiro do estoque atual de um insumo.
 * @param {object} item Item de estoque.
 * @returns {number} Valor total disponivel em estoque.
 */
function calculateInventoryStockValue(item) {
  return calculateUnitCost(item) * normalizeNumber(item.currentStock);
}

/**
 * Calcula os totais agregados do orcamento.
 * @param {object} budget Orcamento ativo.
 * @returns {{materialCost: number, laborCost: number, totalCost: number}} Totais calculados.
 */
function calculateBudgetTotals(budget) {
  const materialCost = budget.items.reduce((total, cartItem) => {
    const inventoryItem = findInventoryItemById(cartItem.inventoryItemId);
    return inventoryItem ? total + calculateLineSubtotal(inventoryItem, cartItem.quantityUsed) : total;
  }, 0);
  const laborCost = calculateLaborCost(budget);

  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost
  };
}

/**
 * Calcula o valor de mao de obra do orcamento.
 * @param {object} budget Orcamento com horas e valor por hora.
 * @returns {number} Custo total de mao de obra.
 */
function calculateLaborCost(budget) {
  return normalizeNumber(budget.sessionHours) * normalizeNumber(budget.hourlyRate);
}

/**
 * Calcula o percentual de estoque em relacao a uma embalagem completa.
 * @param {object} item Item de estoque.
 * @returns {number} Percentual limitado entre 0 e 100.
 */
function calculateStockPercentage(item) {
  const packageQuantity = normalizeNumber(item.packageQuantity);

  if (packageQuantity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (normalizeNumber(item.currentStock) / packageQuantity) * 100));
}

/**
 * Define a classe visual e o texto de status do estoque.
 * @param {number} stockPercentage Percentual de estoque disponivel.
 * @returns {{className: string, label: string}} Status visual do estoque.
 */
function getStockStatus(stockPercentage) {
  if (stockPercentage <= 15) {
    return {
      className: "is-stock-critical",
      label: "Estoque crítico"
    };
  }

  if (stockPercentage <= 35) {
    return {
      className: "is-stock-low",
      label: "Reposição sugerida"
    };
  }

  return {
    className: "is-stock-healthy",
    label: "Estoque saudável"
  };
}

/**
 * Ajusta somente o item demonstrativo salvo pela versao anterior, que usava preco total da caixa.
 * @param {object} item Item bruto persistido.
 * @param {string} categoryName Categoria normalizada.
 * @param {number} packageQuantity Quantidade cadastrada.
 * @param {number} purchasePrice Valor bruto persistido.
 * @returns {number} Valor compativel com a regra atual.
 */
function normalizePurchasePriceForPricingMode(item, categoryName, packageQuantity, purchasePrice) {
  const isLegacyDefaultCartridge = isCartridgeCategory(categoryName)
    && item.id === "item-cartucho-rl0310"
    && purchasePrice === 300
    && packageQuantity === 20;

  return isLegacyDefaultCartridge ? purchasePrice / packageQuantity : purchasePrice;
}

/**
 * Verifica se uma categoria deve usar regra de preco unitario fixo.
 * @param {string} categoryName Categoria avaliada.
 * @returns {boolean} Verdadeiro para cartuchos.
 */
function isCartridgeCategory(categoryName) {
  return normalizeCategory(categoryName) === CATEGORY_CARTUCHO;
}

/**
 * Retorna o titulo do custo exibido no card conforme a regra de precificacao.
 * @param {object} item Item de estoque.
 * @returns {string} Texto de titulo.
 */
function getUnitCostTitle(item) {
  return isCartridgeCategory(item.category) ? "Preço por cartucho" : "Unidade fracionada";
}

/**
 * Retorna o custo unitario em texto curto para seletores e carrinho.
 * @param {object} item Item de estoque.
 * @returns {string} Texto formatado.
 */
function getUnitCostInlineLabel(item) {
  const unitCost = calculateUnitCost(item);

  if (isCartridgeCategory(item.category)) {
    return `${formatCurrency(unitCost)} por cartucho`;
  }

  return `${formatCurrency(unitCost)}/${item.unitMeasure}`;
}

/**
 * Retorna a disponibilidade fisica do item sem usar contador progressivo para cartuchos.
 * @param {object} item Item de estoque.
 * @returns {string} Texto de disponibilidade.
 */
function getStockAvailabilityLabel(item) {
  if (isCartridgeCategory(item.category)) {
    return `${formatNumber(item.currentStock)} ${normalizeNumber(item.currentStock) === 1 ? "cartucho" : "cartuchos"}`;
  }

  return `${formatNumber(item.currentStock)} ${item.unitMeasure} disponíveis`;
}

/**
 * Retorna a unidade textual usada no orçamento.
 * @param {object} item Item de estoque.
 * @returns {string} Unidade de uso.
 */
function getUsageUnitLabel(item) {
  return isCartridgeCategory(item.category) ? "cartuchos" : item.unitMeasure;
}

/**
 * Retorna o label do campo de uso no orçamento.
 * @param {object} item Item de estoque.
 * @returns {string} Label de campo.
 */
function getUsageLabel(item) {
  return isCartridgeCategory(item.category) ? "Cartuchos usados" : `Quantidade usada (${item.unitMeasure})`;
}

/**
 * Retorna a legenda de quantidade cadastrada no item.
 * @param {object} item Item de estoque.
 * @returns {string} Texto formatado.
 */
function getPackageQuantityLabel(item) {
  const quantityLabel = `${formatNumber(item.packageQuantity)} ${item.unitMeasure}`;
  return isCartridgeCategory(item.category) ? `${quantityLabel} em estoque` : `${quantityLabel} por embalagem`;
}

/**
 * Retorna o texto principal da especificacao por categoria.
 * @param {object} item Item de estoque.
 * @returns {string} Metadado relevante para exibicao.
 */
function getInventoryItemMetaLabel(item) {
  if (item.category === CATEGORY_CARTUCHO) {
    const cartridgeLabel = [item.cartridgeType, item.cartridgeNumber].filter(Boolean).join(" ").trim();
    return cartridgeLabel || "Cartucho sem numeração";
  }

  if (item.category === CATEGORY_TINTA) {
    return item.colorName || "Coloração não informada";
  }

  if (item.category === CATEGORY_BIOSSEGURANCA || item.category === CATEGORY_DESCARTAVEL) {
    return item.description || "Descrição não informada";
  }

  return item.description || item.colorName || "Especificação não informada";
}

/**
 * Retorna o texto de marca padronizado para cards e PDF.
 * @param {object} item Item de estoque.
 * @returns {string} Texto de marca.
 */
function getInventoryItemBrandLabel(item) {
  return item.brand ? `Marca: ${item.brand}` : "Marca não informada";
}

/**
 * Extrai a inicial usada como marcador visual do produto.
 * @param {string} name Nome do produto.
 * @returns {string} Inicial em caixa alta.
 */
function getProductInitial(name) {
  const normalizedName = String(name || "I").trim();
  return normalizedName.charAt(0).toUpperCase() || "I";
}

/**
 * Retorna o orcamento ativo do estado.
 * @returns {object} Orcamento ativo.
 */
function getActiveBudget() {
  return applicationState.budgets.find((budget) => budget.id === applicationState.activeBudgetId) || applicationState.budgets[0];
}

/**
 * Busca um item de estoque pelo identificador.
 * @param {string} itemId Identificador do item.
 * @returns {object|undefined} Item encontrado.
 */
function findInventoryItemById(itemId) {
  return applicationState.inventoryItems.find((item) => item.id === itemId);
}

/**
 * Filtra itens de estoque por texto de busca e categoria.
 * @param {string} searchTerm Termo digitado pelo usuario.
 * @param {string=} categoryName Categoria selecionada.
 * @returns {Array<object>} Itens filtrados.
 */
function getFilteredInventoryItems(searchTerm, categoryName = CATEGORY_ALL_VALUE) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  return applicationState.inventoryItems.filter((item) => {
    const searchableText = normalizeSearchText(`${item.name} ${item.category} ${item.unitMeasure} ${item.brand} ${item.description} ${item.cartridgeType} ${item.cartridgeNumber} ${item.colorName}`);
    const matchesSearch = !normalizedSearchTerm || searchableText.includes(normalizedSearchTerm);
    const matchesCategory = categoryName === CATEGORY_ALL_VALUE || item.category === categoryName;
    return matchesSearch && matchesCategory;
  });
}

/**
 * Retorna categorias base e categorias cadastradas no estoque.
 * @returns {Array<string>} Categorias sem repeticao.
 */
function getInventoryCategories() {
  const inventoryCategories = applicationState.inventoryItems.map((item) => item.category);
  return [...new Set([...BASE_INVENTORY_CATEGORIES, ...inventoryCategories])];
}

/**
 * Conta quantos itens existem em uma categoria.
 * @param {string} categoryName Categoria avaliada.
 * @returns {number} Quantidade de itens da categoria.
 */
function countInventoryItemsByCategory(categoryName) {
  if (categoryName === CATEGORY_ALL_VALUE) {
    return applicationState.inventoryItems.length;
  }

  return applicationState.inventoryItems.filter((item) => item.category === categoryName).length;
}

/**
 * Define a unidade inicial mais comum para cada categoria.
 * @param {string} categoryName Categoria normalizada.
 * @returns {string} Unidade sugerida.
 */
function getDefaultUnitMeasureForCategory(categoryName) {
  if (categoryName === CATEGORY_TINTA) {
    return "ml";
  }

  return "unid";
}

/**
 * Normaliza categorias antigas e novas para manter compatibilidade com localStorage.
 * @param {string} categoryName Categoria bruta.
 * @returns {string} Categoria oficial do app.
 */
function normalizeCategory(categoryName) {
  const normalizedCategory = normalizeSearchText(categoryName).replace(/[^a-z0-9]/g, "");

  if (["cartucho", "cartuchos"].includes(normalizedCategory)) {
    return CATEGORY_CARTUCHO;
  }

  if (["tinta", "tintas"].includes(normalizedCategory)) {
    return CATEGORY_TINTA;
  }

  if (["biosseguranca", "bioseguranca"].includes(normalizedCategory)) {
    return CATEGORY_BIOSSEGURANCA;
  }

  if (["descartavel", "descartaveis"].includes(normalizedCategory)) {
    return CATEGORY_DESCARTAVEL;
  }

  return CATEGORY_OUTROS;
}

/**
 * Normaliza unidades de medida aceitas pela interface.
 * @param {string} unitMeasure Unidade digitada ou selecionada.
 * @returns {string} Unidade normalizada.
 */
function normalizeUnitMeasure(unitMeasure) {
  const normalizedUnit = normalizeSearchText(unitMeasure).replace(/[^a-z0-9]/g, "");

  if (["un", "und", "unid", "unidade", "unidades"].includes(normalizedUnit)) {
    return "unid";
  }

  if (["g", "grama", "gramas"].includes(normalizedUnit)) {
    return "gramas";
  }

  if (["metro", "metros", "m"].includes(normalizedUnit)) {
    return "metros";
  }

  if (["folha", "folhas"].includes(normalizedUnit)) {
    return "folhas";
  }

  if (["ml", "mg"].includes(normalizedUnit)) {
    return normalizedUnit;
  }

  return "unid";
}

/**
 * Converte textos monetarios ou decimais em numero positivo.
 * @param {string|number|null|undefined} value Valor bruto.
 * @returns {number} Numero normalizado.
 */
function normalizeNumber(value) {
  const numericText = String(value == null ? "" : value)
    .trim()
    .replace(/\s/g, "")
    .replace(/[R$]/g, "");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");
  let normalizedText = numericText;

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    normalizedText = lastCommaIndex > lastDotIndex
      ? numericText.replace(/\./g, "").replace(",", ".")
      : numericText.replace(/,/g, "");
  } else if (lastCommaIndex > -1) {
    normalizedText = numericText.replace(",", ".");
  }

  const parsedValue = Number(normalizedText);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

/**
 * Normaliza texto para buscas sem acento e em caixa baixa.
 * @param {string} value Texto bruto.
 * @returns {string} Texto normalizado.
 */
function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Cria identificadores unicos para entidades do app.
 * @param {string} prefix Prefixo semantico da entidade.
 * @returns {string} Identificador unico.
 */
function createEntityId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Formata valores monetarios em reais.
 * @param {number} value Valor numerico.
 * @returns {string} Valor formatado em BRL.
 */
function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

/**
 * Formata numeros para exibicao curta.
 * @param {number} value Valor numerico.
 * @returns {string} Numero formatado.
 */
function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0);
}

/**
 * Formata contadores no padrao obrigatorio Atual de Total.
 * @param {string|number} currentValue Valor atual.
 * @param {string|number} totalValue Valor total.
 * @returns {string} Contador no formato Atual de Total.
 */
function formatCounter(currentValue, totalValue) {
  return `${formatNumber(normalizeNumber(currentValue))} de ${formatNumber(normalizeNumber(totalValue))}`;
}

/**
 * Formata um numero para edicao em campos pt-BR.
 * @param {string|number} value Valor bruto.
 * @returns {string} Valor editavel.
 */
function formatEditableNumber(value) {
  return String(normalizeNumber(value)).replace(".", ",");
}

/**
 * Escapa texto antes de inserir HTML dinamico.
 * @param {unknown} value Valor bruto.
 * @returns {string} Texto seguro para HTML.
 */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Cria o HTML de estado vazio.
 * @param {string} message Mensagem exibida.
 * @returns {string} HTML do estado vazio.
 */
function createEmptyStateHtml(message) {
  return `<article class="empty-state">${escapeHtml(message)}</article>`;
}

/**
 * Registra o service worker de forma silenciosa.
 * @returns {void}
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

initializeApplication();
